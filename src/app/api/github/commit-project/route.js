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

    const { workspaceId, repoName, owner, isPrivate, rootPath, message } = await request.json();
    if (!workspaceId) return new NextResponse("Missing workspaceId", { status: 400 });

    const filesSnap = await adminDb.collection(`workspaces/${workspaceId}/files`).get();
    if (filesSnap.empty) return new NextResponse("No files found in workspace", { status: 400 });

    // Decrypt or bind GitHub token for this user
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

    // Determine owner and ensure repo exists
    let resolvedOwner = owner;
    if (!resolvedOwner) {
      const { data: me } = await octokit.users.getAuthenticated();
      resolvedOwner = me.login;
    }

    // Determine repository name priority:
    // 1) Explicit repoName from client
    // 2) Top-level folder name in workspace (folder with no parent)
    // 3) Workspace doc name/title
    // 4) Fallback to workspace-<idprefix>
    let inferredRepo = repoName;
    if (!inferredRepo) {
      // Try top-level folder
      try {
        const foldersSnap = await adminDb.collection(`workspaces/${workspaceId}/folders`).get();
        const topFolders = foldersSnap.docs
          .map(d => d.data())
          .filter(f => !f.parentFolderId && f.name);
        if (topFolders.length > 0) {
          const topName = String(topFolders[0].name).trim();
          if (topName) {
            inferredRepo = topName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "-");
          }
        }
      } catch {}
    }
    if (!inferredRepo) {
      // Try workspace name/title
      try {
        const wsDoc = await adminDb.doc(`workspaces/${workspaceId}`).get();
        const wsName = wsDoc.exists ? (wsDoc.data().name || wsDoc.data().title) : null;
        if (wsName) {
          inferredRepo = String(wsName).trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "-");
        }
      } catch {}
    }
    if (!inferredRepo) {
      inferredRepo = `workspace-${String(workspaceId).slice(0, 8)}`;
    }

    let repoExists = true;
    try {
      await octokit.repos.get({ owner: resolvedOwner, repo: inferredRepo });
    } catch (err) {
      if (err.status === 404) repoExists = false; else throw err;
    }

    if (!repoExists) {
      if (owner) {
        await octokit.repos.createInOrg({
          org: resolvedOwner,
          name: inferredRepo,
          private: isPrivate !== undefined ? !!isPrivate : true,
          auto_init: true,
          description: "Created by XenAi Push Project",
        });
      } else {
        await octokit.repos.createForAuthenticatedUser({
          name: inferredRepo,
          private: isPrivate !== undefined ? !!isPrivate : true,
          auto_init: true,
          description: "Created by XenAi Push Project",
        });
      }
    }

    // Determine default branch and ensure it exists
    const { data: repoData } = await octokit.repos.get({ owner: resolvedOwner, repo: inferredRepo });
    const defaultBranch = repoData.default_branch || "main";

    let latestCommitSha;
    let baseTreeSha;
    try {
      // Try to read the default branch ref
      const { data: refData } = await octokit.git.getRef({ owner: resolvedOwner, repo: inferredRepo, ref: `heads/${defaultBranch}` });
      latestCommitSha = refData.object.sha;
      const { data: latestCommit } = await octokit.git.getCommit({ owner: resolvedOwner, repo: inferredRepo, commit_sha: latestCommitSha });
      baseTreeSha = latestCommit.tree.sha;
    } catch (err) {
      // If the branch doesn't exist yet (e.g., brand-new repo without commits), create an initial commit and branch
      if (err.status === 404) {
        const { data: emptyTree } = await octokit.git.createTree({ owner: resolvedOwner, repo: inferredRepo, tree: [] });
        const { data: initialCommit } = await octokit.git.createCommit({ owner: resolvedOwner, repo: inferredRepo, message: "Initial commit", tree: emptyTree.sha, parents: [] });
        try {
          await octokit.git.createRef({ owner: resolvedOwner, repo: inferredRepo, ref: `refs/heads/${defaultBranch}`, sha: initialCommit.sha });
        } catch (e) {
          // If ref already exists or cannot be created, try fetching it
          if (e.status !== 422) throw e;
          const { data: refData2 } = await octokit.git.getRef({ owner: resolvedOwner, repo: inferredRepo, ref: `heads/${defaultBranch}` });
          latestCommitSha = refData2.object.sha;
        }
        latestCommitSha = initialCommit.sha;
        baseTreeSha = emptyTree.sha;
      } else {
        throw err;
      }
    }

    // Build blobs
    const treeItems = [];
    for (const doc of filesSnap.docs) {
      const data = doc.data();
      const name = data.name || `${doc.id}.txt`;
      const content = data.content ?? "";
      const fullPath = rootPath ? `${rootPath}/${name}` : name;

      const blob = await octokit.git.createBlob({ owner: resolvedOwner, repo: inferredRepo, content, encoding: "utf-8" });
      treeItems.push({ path: fullPath, mode: "100644", type: "blob", sha: blob.data.sha });
    }

    // Create tree
    const { data: newTree } = await octokit.git.createTree({ owner: resolvedOwner, repo: inferredRepo, base_tree: baseTreeSha, tree: treeItems });

    // Create commit
    const commitMessage = message || `Add workspace ${workspaceId} files from XenAi`;
    const { data: newCommit } = await octokit.git.createCommit({ owner: resolvedOwner, repo: inferredRepo, message: commitMessage, tree: newTree.sha, parents: [latestCommitSha] });

    // Update ref on the default branch
    await octokit.git.updateRef({ owner: resolvedOwner, repo: inferredRepo, ref: `heads/${defaultBranch}`, sha: newCommit.sha, force: true });

    const repoUrl = `https://github.com/${resolvedOwner}/${inferredRepo}`;
    const commitUrl = `${repoUrl}/commit/${newCommit.sha}`;

    return NextResponse.json({ repo: { owner: resolvedOwner, name: inferredRepo, url: repoUrl, private: isPrivate !== undefined ? !!isPrivate : true }, commit: { url: commitUrl } });
  } catch (e) {
    // Server-side logging for easier debugging in terminal
    console.error("[commit-project] Failure", {
      message: e?.message || String(e),
      status: e?.status,
      stack: e?.stack,
      response: e?.response?.data,
    });
    return new NextResponse(
      JSON.stringify({
        error: "Commit project failed",
        message: e?.message || String(e),
        status: e?.status,
        details: e?.response?.data || null,
      }),
      { status: 500 }
    );
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
