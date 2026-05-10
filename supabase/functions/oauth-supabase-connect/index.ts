// Supabase Management OAuth: lets users connect their Supabase account, then list/create projects.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const CLIENT_ID = Deno.env.get("SUPA_OAUTH_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("SUPA_OAUTH_CLIENT_SECRET")!;
const REDIRECT_URI = "https://megsyai.com/auth/callback/supabase";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "start") {
    const userId = url.searchParams.get("user_id");
    if (!userId) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const state = btoa(JSON.stringify({ user_id: userId, ts: Date.now() }));
    const authorize = new URL("https://api.supabase.com/v1/oauth/authorize");
    authorize.searchParams.set("client_id", CLIENT_ID);
    authorize.searchParams.set("redirect_uri", REDIRECT_URI);
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("state", state);
    return new Response(JSON.stringify({ url: authorize.toString() }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (action === "exchange") {
    try {
      const { code, state } = await req.json();
      const decoded = JSON.parse(atob(state));
      const userId = decoded.user_id;
      if (!userId) throw new Error("invalid state");

      const basic = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
      const tokenResp = await fetch("https://api.supabase.com/v1/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` },
        body: new URLSearchParams({
          grant_type: "authorization_code",
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

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await supabase.from("code_integrations").upsert({
        user_id: userId,
        provider: "supabase",
        config: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          token_type: tokenData.token_type,
          connected_at: new Date().toISOString(),
        },
      }, { onConflict: "user_id,provider" });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e?.message || e) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // List user projects
  if (action === "list-projects") {
    try {
      const { user_id } = await req.json();
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: integ } = await supabase
        .from("code_integrations").select("config")
        .eq("user_id", user_id).eq("provider", "supabase").maybeSingle();

      const token = (integ?.config as any)?.access_token;
      if (!token) {
        return new Response(JSON.stringify({ error: "Not connected", needs_oauth: true }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resp = await fetch("https://api.supabase.com/v1/projects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const projects = await resp.json();
      return new Response(JSON.stringify({ projects }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e?.message || e) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Create new project
  if (action === "create-project") {
    try {
      const { user_id, name, organization_id, region, db_pass } = await req.json();
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: integ } = await supabase
        .from("code_integrations").select("config")
        .eq("user_id", user_id).eq("provider", "supabase").maybeSingle();

      const token = (integ?.config as any)?.access_token;
      if (!token) {
        return new Response(JSON.stringify({ error: "Not connected" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resp = await fetch("https://api.supabase.com/v1/projects", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          organization_id,
          region: region || "us-east-1",
          db_pass: db_pass || crypto.randomUUID(),
          plan: "free",
        }),
      });
      const project = await resp.json();
      if (!resp.ok) {
        return new Response(JSON.stringify({ error: "Create failed", detail: project }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ project }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e?.message || e) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // List orgs
  if (action === "list-orgs") {
    try {
      const { user_id } = await req.json();
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: integ } = await supabase
        .from("code_integrations").select("config")
        .eq("user_id", user_id).eq("provider", "supabase").maybeSingle();

      const token = (integ?.config as any)?.access_token;
      if (!token) {
        return new Response(JSON.stringify({ error: "Not connected" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const resp = await fetch("https://api.supabase.com/v1/organizations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const orgs = await resp.json();
      return new Response(JSON.stringify({ orgs }), {
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
