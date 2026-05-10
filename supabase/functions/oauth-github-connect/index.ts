// GitHub OAuth: redirects user to GitHub authorize page, then handles callback to save token.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const CLIENT_ID = Deno.env.get("GITHUB_OAUTH_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GITHUB_OAUTH_CLIENT_SECRET")!;
const REDIRECT_URI = "https://megsyai.com/auth/callback/github";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  // Step 1: Build authorize URL for the client to redirect to
  if (action === "start") {
    const userId = url.searchParams.get("user_id");
    if (!userId) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const state = btoa(JSON.stringify({ user_id: userId, ts: Date.now() }));
    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.searchParams.set("client_id", CLIENT_ID);
    authorize.searchParams.set("redirect_uri", REDIRECT_URI);
    authorize.searchParams.set("scope", "repo user:email");
    authorize.searchParams.set("state", state);
    return new Response(JSON.stringify({ url: authorize.toString() }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Step 2: Exchange code for token (called from frontend after callback)
  if (action === "exchange") {
    try {
      const { code, state } = await req.json();
      if (!code || !state) throw new Error("missing code/state");

      const decoded = JSON.parse(atob(state));
      const userId = decoded.user_id;
      if (!userId) throw new Error("invalid state");

      const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          redirect_uri: REDIRECT_URI,
        }),
      });
      const tokenData = await tokenResp.json();
      if (!tokenData.access_token) {
        return new Response(JSON.stringify({ error: "Token exchange failed", detail: tokenData }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user info
      const userResp = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/vnd.github+json" },
      });
      const ghUser = await userResp.json();

      // Save to code_integrations
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await supabase.from("code_integrations").upsert({
        user_id: userId,
        provider: "github",
        config: {
          access_token: tokenData.access_token,
          scope: tokenData.scope,
          token_type: tokenData.token_type,
          login: ghUser.login,
          avatar_url: ghUser.avatar_url,
          name: ghUser.name,
        },
      }, { onConflict: "user_id,provider" });

      return new Response(JSON.stringify({ ok: true, login: ghUser.login, avatar_url: ghUser.avatar_url }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e?.message || e) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
