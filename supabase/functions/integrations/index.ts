import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { service, action, params } = await req.json();

    const handlers: Record<string, () => Promise<any>> = {
      telegram: async () => {
        const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (!token) return { error: "Telegram not configured", needsConnect: true };
        const endpoint = `https://api.telegram.org/bot${token}/${action}`;
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        return resp.json();
      },
      discord: async () => {
        const token = Deno.env.get("DISCORD_BOT_TOKEN");
        if (!token) return { error: "Discord not configured", needsConnect: true };
        const resp = await fetch(`https://discord.com/api/v10/${action}`, {
          method: "POST",
          headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        return resp.json();
      },
      slack: async () => {
        const token = Deno.env.get("SLACK_Verification_Token");
        if (!token) return { error: "Slack not configured", needsConnect: true };
        const resp = await fetch(`https://slack.com/api/${action}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        return resp.json();
      },
      notion: async () => {
        const token = Deno.env.get("NOTION_API_KEY");
        if (!token) return { error: "Notion not configured", needsConnect: true };
        const resp = await fetch(`https://api.notion.com/v1/${action}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        return resp.json();
      },
      tiktok: async () => {
        const key = Deno.env.get("TIKTOK_API_KEY");
        if (!key) return { error: "TikTok not configured", needsConnect: true };
        return { error: "TikTok integration coming soon" };
      },
      twitter: async () => {
        const token = Deno.env.get("TWITTER_ACCESS_TOKEN");
        if (!token) return { error: "Twitter not configured", needsConnect: true };
        const resp = await fetch(`https://api.twitter.com/2/${action}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        return resp.json();
      },
      shopify: async () => {
        const token = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
        const apiKey = Deno.env.get("SHOPIFY_API_KEY");
        if (!token || !apiKey) return { error: "Shopify not configured", needsConnect: true };
        return { error: "Shopify integration coming soon" };
      },
      meta: async () => {
        const token = Deno.env.get("META_ACCESS_TOKEN");
        if (!token) return { error: "Meta not configured", needsConnect: true };
        const resp = await fetch(`https://graph.facebook.com/v18.0/${action}?access_token=${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        return resp.json();
      },
      zoom: async () => {
        const key = Deno.env.get("ZOOM_API_KEY");
        if (!key) return { error: "Zoom not configured", needsConnect: true };
        return { error: "Zoom integration coming soon" };
      },
    };

    const handler = handlers[service];
    if (!handler) {
      return new Response(JSON.stringify({ error: `Unknown service: ${service}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await handler();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Integration error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
