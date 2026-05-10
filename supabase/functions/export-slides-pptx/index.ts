// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import pptxgen from "https://esm.sh/pptxgenjs@3.12.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VIEWPORT_W = 1280;
const VIEWPORT_H = 720;

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { html, title } = await req.json();
    if (!html) throw new Error("html required");

    const accessKey =
      Deno.env.get("ScreenshotOne_Access Key") ||
      Deno.env.get("SCREENSHOTONE_ACCESS_KEY");
    if (!accessKey) throw new Error("ScreenshotOne access key missing");

    // 1) Capture full-page screenshot of the slide deck.
    const shotRes = await fetch("https://api.screenshotone.com/take", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_key: accessKey,
        html,
        viewport_width: VIEWPORT_W,
        viewport_height: VIEWPORT_H,
        device_scale_factor: 1,
        format: "jpg",
        full_page: true,
        block_ads: true,
        block_cookie_banners: true,
        cache: false,
        image_quality: 85,
        delay: 1,
      }),
    });
    if (!shotRes.ok) {
      const t = await shotRes.text().catch(() => "");
      throw new Error(`Screenshot failed: ${shotRes.status} ${t.slice(0, 200)}`);
    }
    const buf = new Uint8Array(await shotRes.arrayBuffer());

    // 2) Decode and slice into 16:9 chunks at the captured viewport's scale.
    const img = await Image.decode(buf);
    const W = img.width;
    const H = img.height;
    const slideH = Math.max(1, Math.round((W * VIEWPORT_H) / VIEWPORT_W));
    const count = Math.max(1, Math.ceil(H / slideH));

    // 3) Build the PPTX (16:9, 10" x 5.625").
    const pptx = new (pptxgen as any)();
    pptx.defineLayout({ name: "MEGSY_169", width: 10, height: 5.625 });
    pptx.layout = "MEGSY_169";
    pptx.title = title || "Slides";

    for (let i = 0; i < count; i++) {
      const top = i * slideH;
      const bottom = Math.min(H, top + slideH);
      const h = bottom - top;

      // crop returns a new image
      const slice = img.clone().crop(0, top, W, h);

      // pad short last slice to keep 16:9
      let final = slice;
      if (h < slideH) {
        const padded = new Image(W, slideH).fill(0xffffffff);
        padded.composite(slice, 0, 0);
        final = padded;
      }

      const jpg = await final.encodeJPEG(85);
      const b64 = bytesToBase64(jpg);
      const slide = pptx.addSlide();
      slide.background = { color: "FFFFFF" };
      slide.addImage({ data: `image/jpeg;base64,${b64}`, x: 0, y: 0, w: 10, h: 5.625 });
    }

    const pptxBase64: string = await pptx.write({ outputType: "base64" });

    return new Response(
      JSON.stringify({ success: true, pptx_base64: pptxBase64, slide_count: count }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("export-slides-pptx error", e);
    return new Response(JSON.stringify({ success: false, error: String(e?.message || e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
