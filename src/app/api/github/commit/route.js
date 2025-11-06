import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) return new NextResponse("Unauthorized", { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const { filename, content, repoName, path, branch, message, owner, isPrivate } = await request.json();
    if (!content) return new NextResponse("Missing content", { status: 400 });

    const inferredFilename = filename || "snippet.txt";
    const defaultRepoName = repoName || (inferredFilename.split(".")[0] || "xenai-snippet").replace(/[^a-zA-Z0-9-_]/g, "-");
    const filePath = path || inferredFilename;
    const targetBranch = branch || "main";
    const commitMessage = message || `Add ${filePath} from XenAi`;

    // get or store GitHub token for this user
    const keyB64 = process.env.TOKEN_ENCRYPTION_KEY;
    if (!keyB64) return new NextResponse("Server missing TOKEN_ENCRYPTION_KEY", { status: 500 });
    const key = Buffer.from(keyB64, "base64");

    const encDocRef = adminDb.doc(`users/${uid}/integrations/github`);
    const encSnap = await encDocRef.get();
    let ghToken;
    if (encSnap.exists) {
      const { token_encrypted } = encSnap.data() || {};
      if (!token_encrypted) return new NextResponse("GitHub not connected", { status: 401 });
      ghToken = decrypt(token_encrypted, key);
    } else {
      const cookieToken = request.cookies.get?.("gh_token")?.value;
      if (!cookieToken) return new NextResponse("GitHub not connected", { status: 401 });
      const token_encrypted = encrypt(cookieToken, key);
      await encDocRef.set({ token_encrypted, scope: "repo", createdAt: new Date().toISOString() }, { merge: true });
      ghToken = cookieToken;
    }

    const octokit = new Octokit({ auth: ghToken });

    // get authenticated user if owner not provided
    let resolvedOwner = owner;
    if (!resolvedOwner) {
      const { data: me } = await octokit.users.getAuthenticated();
      resolvedOwner = me.login;
    }

    // ensure repo exists
    let repoExists = true;
    try {
      await octokit.repos.get({ owner: resolvedOwner, repo: defaultRepoName });
    } catch (err) {
      if (err.status === 404) repoExists = false; else throw err;
    }

    if (!repoExists) {
      await octokit.repos.createForAuthenticatedUser({
        name: defaultRepoName,
        private: isPrivate !== undefined ? !!isPrivate : true,
        auto_init: true,
        description: "Created by XenAi one-click push",
      });
    }

    // try to fetch existing file to include sha
    let sha;
    try {
      const existing = await octokit.repos.getContent({ owner: resolvedOwner, repo: defaultRepoName, path: filePath, ref: targetBranch });
      // if it's a file, existing.data.sha will exist
      if (!Array.isArray(existing.data)) sha = existing.data.sha;
    } catch (err) {
      if (err.status !== 404) throw err;
    }

    const base64Content = Buffer.from(content, "utf-8").toString("base64");

    const { data: result } = await octokit.repos.createOrUpdateFileContents({
      owner: resolvedOwner,
      repo: defaultRepoName,
      path: filePath,
      message: commitMessage,
      content: base64Content,
      branch: targetBranch,
      sha,
    });

    const htmlUrl = `https://github.com/${resolvedOwner}/${defaultRepoName}`;
    return NextResponse.json({
      repo: { owner: resolvedOwner, name: defaultRepoName, url: htmlUrl, private: isPrivate !== undefined ? !!isPrivate : true },
      commit: { url: result.commit.html_url },
      file: { path: filePath },
    });
  } catch (e) {
    return new NextResponse(JSON.stringify({ error: "Commit failed", message: String(e) }), { status: 500 });
  }
}

function encrypt(plaintext, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decrypt(payloadB64, key) {
  const buf = Buffer.from(payloadB64, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}
