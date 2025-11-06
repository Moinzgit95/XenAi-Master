import { NextResponse } from "next/server";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const stateCookie = request.cookies.get?.("gh_oauth_state")?.value;
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return new NextResponse("Invalid OAuth state", { status: 400 });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.GITHUB_REDIRECT_URI || new URL("/api/github/callback", request.url).toString();

  if (!clientId || !clientSecret) {
    return new NextResponse(JSON.stringify({ error: "Missing GitHub OAuth env vars" }), { status: 500 });
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      return new NextResponse(JSON.stringify({ error: "Failed to obtain access token", details: tokenJson }), { status: 400 });
    }

    const res = NextResponse.redirect(new URL("/", request.url));
    res.cookies.set("gh_token", tokenJson.access_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      // secure only in production environments
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 2,
    });
    // clear state cookie
    res.cookies.set("gh_oauth_state", "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    return new NextResponse(JSON.stringify({ error: "OAuth callback failed", message: String(e) }), { status: 500 });
  }
}
