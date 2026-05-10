import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Try getting key from api_keys table first
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    const { data: keys } = await sb.from("api_keys")
      .select("api_key")
      .eq("service", "deepgram")
      .eq("is_active", true)
      .limit(5);
    
    let apiKey: string | undefined;
    if (keys && keys.length > 0) {
      apiKey = keys[Math.floor(Math.random() * keys.length)].api_key;
    } else {
      apiKey = Deno.env.get("DEEPGRAM_APIKEY");
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Deepgram key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return the API key directly - it's used client-side only for the WebSocket subprotocol
    // This is the recommended pattern from Deepgram docs for agent API
    return new Response(JSON.stringify({ token: apiKey, expires_in: 3600 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
