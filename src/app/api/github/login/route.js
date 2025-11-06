import { NextResponse } from "next/server";

function randomState(len = 32) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < len; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

export async function GET(request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_REDIRECT_URI || new URL("/api/github/callback", request.url).toString();
  const scope = "repo"; // full repo access for creating and pushing

  if (!clientId) {
    return new NextResponse(JSON.stringify({ error: "Missing GITHUB_CLIENT_ID" }), { status: 500 });
  }

  const state = randomState();
  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set("gh_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
