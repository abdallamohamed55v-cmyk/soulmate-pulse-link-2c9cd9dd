import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateToken(len = 64): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (const b of arr) result += chars[b % chars.length];
  return result;
}

async function hashSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { grant_type, code, client_id, client_secret, redirect_uri } = await req.json();

    if (grant_type !== "authorization_code") {
      return new Response(JSON.stringify({ error: "unsupported_grant_type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!code || !client_id || !client_secret) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate client and secret
    const { data: client } = await sb.from("oauth_clients").select("*").eq("client_id", client_id).single();
    if (!client) {
      return new Response(JSON.stringify({ error: "invalid_client" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secretHash = await hashSecret(client_secret);
    if (secretHash !== client.client_secret_hash) {
      return new Response(JSON.stringify({ error: "invalid_client_secret" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate code
    const { data: authCode } = await sb.from("oauth_codes")
      .select("*")
      .eq("code", code)
      .eq("client_id", client_id)
      .eq("used", false)
      .single();

    if (!authCode) {
      return new Response(JSON.stringify({ error: "invalid_grant" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (new Date(authCode.expires_at) < new Date()) {
      await sb.from("oauth_codes").update({ used: true }).eq("id", authCode.id);
      return new Response(JSON.stringify({ error: "expired_code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check redirect_uri match
    if (redirect_uri && redirect_uri !== authCode.redirect_uri) {
      return new Response(JSON.stringify({ error: "redirect_uri_mismatch" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark code as used
    await sb.from("oauth_codes").update({ used: true }).eq("id", authCode.id);

    // Generate access token (30 days)
    const accessToken = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await sb.from("oauth_tokens").insert({
      access_token: accessToken,
      client_id,
      user_id: authCode.user_id,
      scope: authCode.scope,
      expires_at: expiresAt,
    });

    return new Response(JSON.stringify({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 30 * 24 * 60 * 60,
      scope: authCode.scope,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
