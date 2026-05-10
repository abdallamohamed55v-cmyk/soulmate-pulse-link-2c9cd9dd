import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * screenshot-preview
 * Takes a URL or raw HTML, renders it via ScreenshotOne (POST for large HTML),
 * uploads PNG to the slide-images bucket and returns a public URL.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const accessKey =
      Deno.env.get("ScreenshotOne_Access Key") ||
      Deno.env.get("SCREENSHOTONE_ACCESS_KEY") ||
      Deno.env.get("ScreenshotOne_Access_Key");
    if (!accessKey) throw new Error("ScreenshotOne access key missing");

    const { url, html, viewportWidth, viewportHeight, fileName } = await req.json();
    if (!url && !html) {
      return new Response(JSON.stringify({ success: false, error: "url or html required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Record<string, unknown> = {
      access_key: accessKey,
      viewport_width: viewportWidth || 1280,
      viewport_height: viewportHeight || 800,
      device_scale_factor: 1,
      format: "png",
      block_ads: true,
      block_cookie_banners: true,
      cache: false,
      full_page: false,
      image_quality: 80,
    };
    if (url) body.url = url;
    else body.html = html;

    const r = await fetch("https://api.screenshotone.com/take", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.error("[screenshot] failed", r.status, txt.slice(0, 300));
      throw new Error(`Screenshot failed: ${r.status}`);
    }
    const png = new Uint8Array(await r.arrayBuffer());

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const path = `previews/${fileName || crypto.randomUUID()}.png`;
    const up = await sb.storage.from("slide-images").upload(path, png, {
      contentType: "image/png", upsert: true,
    });
    if (up.error) throw up.error;
    const { data } = sb.storage.from("slide-images").getPublicUrl(path);

    return new Response(JSON.stringify({ success: true, preview_url: data.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("screenshot-preview error", e);
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
