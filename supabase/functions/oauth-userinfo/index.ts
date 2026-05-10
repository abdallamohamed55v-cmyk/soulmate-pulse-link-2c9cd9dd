import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function validateOAuthToken(sb: any, req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");
  const { data: tokenData } = await sb.from("oauth_tokens")
    .select("*")
    .eq("access_token", token)
    .single();

  if (!tokenData) return null;
  if (new Date(tokenData.expires_at) < new Date()) return null;

  return tokenData;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const tokenData = await validateOAuthToken(sb, req);
    if (!tokenData) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile with credits and plan
    const { data: profile } = await sb.from("profiles")
      .select("id, display_name, avatar_url, plan, credits, created_at")
      .eq("id", tokenData.user_id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "user_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get email from auth.users
    const { data: authUser } = await sb.auth.admin.getUserById(tokenData.user_id);

    return new Response(JSON.stringify({
      id: profile.id,
      email: authUser?.user?.email || null,
      name: profile.display_name,
      avatar_url: profile.avatar_url,
      plan: profile.plan,
      credits: Number(profile.credits),
      is_premium: ["starter", "pro", "elite", "business", "enterprise"].includes(profile.plan?.toLowerCase()),
      created_at: profile.created_at,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
