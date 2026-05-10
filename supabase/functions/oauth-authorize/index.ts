import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateCode(len = 48): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (const b of arr) result += chars[b % chars.length];
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { client_id, redirect_uri, scope, user_id, action } = await req.json();

    if (!client_id || !redirect_uri) {
      return new Response(JSON.stringify({ error: "Missing client_id or redirect_uri" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate client
    const { data: client } = await sb.from("oauth_clients").select("*").eq("client_id", client_id).single();
    if (!client) {
      return new Response(JSON.stringify({ error: "Invalid client_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If action is "info", return client info for consent screen
    if (action === "info") {
      const validUri = (client.redirect_uris || []).some((u: string) => redirect_uri.startsWith(u));
      return new Response(JSON.stringify({
        name: client.name,
        logo_url: client.logo_url,
        valid_redirect: validUri,
        scope: scope || "read",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Action is "approve" — generate auth code (caller MUST be authenticated)
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Always derive user_id from the verified JWT, ignore client-supplied value.
    const effective_user_id = authUser.id;

    // Validate redirect_uri
    const validUri = (client.redirect_uris || []).some((u: string) => redirect_uri.startsWith(u));
    if (!validUri) {
      return new Response(JSON.stringify({ error: "Invalid redirect_uri" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    await sb.from("oauth_codes").insert({
      code,
      client_id,
      user_id: effective_user_id,
      redirect_uri,
      scope: scope || "read",
      expires_at: expiresAt,
    });

    return new Response(JSON.stringify({ code }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
