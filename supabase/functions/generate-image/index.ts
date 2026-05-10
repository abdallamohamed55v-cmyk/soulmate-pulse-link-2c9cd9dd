import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEMONDATA_IMG_URL = "https://api.lemondata.cc/v1/images/generations";
const LEMONDATA_EDIT_URL = "https://api.lemondata.cc/v1/images/edits";

// Model mapping: our internal ID → { text2img model, img2img model }
// If user sends text only → use t2i model; if user sends image+text → use i2i model
type ModelMapping = {
  t2i: string;       // text-to-image model name on LemonData
  i2i?: string;      // image-to-image model name on LemonData (if supported)
  provider?: "lemon" | "deapi"; // default is lemon
  deapiEndpoint?: string;
  deapiModel?: string;
};

const MODEL_MAP: Record<string, ModelMapping> = {
  // ── Megsy Imagine (flagship) ──
  "megsy-imagine":    { t2i: "nano-banana-pro",  i2i: "nano-banana-edit" },
  // ── Premium ──
  "nano-banana-pro":  { t2i: "nano-banana-pro",  i2i: "nano-banana-edit" },
  "nano-banana-2":    { t2i: "nano-banana-2",    i2i: "nano-banana-edit" },
  "nano-banana":      { t2i: "nano-banana",      i2i: "nano-banana-edit" },
  "gpt-image-1.5":    { t2i: "gpt-image-1.5",    i2i: "gpt-image-1.5" },
  "gpt-image-1-mini": { t2i: "gpt-image-1-mini", i2i: "gpt-image-1-mini" },
  "gpt-image-1":      { t2i: "gpt-image-1",      i2i: "gpt-image-1" },
  // ── High-End ──
  "kling-o3":         { t2i: "kling-image-o1",    i2i: "kling-image-o1" },
  "kling-3.0":        { t2i: "kling-image-o1",    i2i: "kling-image-o1" },
  "ideogram-3":       { t2i: "ideogram-v3",       i2i: "ideogram-edit-v3" },
  "flux-2-pro":       { t2i: "flux-2-pro-text-to-image", i2i: "flux-2-pro-image-to-image" },
  "imagen-4":         { t2i: "imagen-4",          i2i: "imagen-4" },
  "imagen-4-fast":    { t2i: "imagen-4-fast" },
  "imagen-4-ultra":   { t2i: "imagen-4-ultra" },
  // ── Standard ──
  "seedream-5":       { t2i: "seedream-5-lite-text-to-image", i2i: "seedream-5-lite-image-to-image" },
  "seedream-4.5":     { t2i: "seedream-4.5",      i2i: "seedream-4.5" },
  "flux-pro-ultra":   { t2i: "flux-pro-1.1-ultra" },
  "wan-2.6-img":      { t2i: "wan-2.6" },
  "grok-imagine":     { t2i: "grok-imagine",      i2i: "grok-imagine-image" },
  "z-image-turbo":    { t2i: "flux-2-klein-4b" },
  "hunyuan-v3":       { t2i: "flux-2-klein-9b" },
  "imagine-art":      { t2i: "flux-1-schnell" },
  // ── Flux variants ──
  "flux-kontext-pro": { t2i: "flux-kontext-pro",  i2i: "flux-kontext-pro" },
  "flux-kontext-max": { t2i: "flux-kontext-max",  i2i: "flux-kontext-max" },
  // ═══ FREE DEAPI MODELS (keep on deAPI) ═══
  "flux2-klein-4b":      { t2i: "", provider: "deapi", deapiEndpoint: "txt2img", deapiModel: "FLUX.2-Klein-4B-BF16" },
  "z-image-turbo-int8":  { t2i: "", provider: "deapi", deapiEndpoint: "txt2img", deapiModel: "Z-Image-Turbo-INT8" },
  "flux1-schnell":       { t2i: "", provider: "deapi", deapiEndpoint: "txt2img", deapiModel: "FLUX.1-schnell" },
  "qwen-image-edit-plus":{ t2i: "", provider: "deapi", deapiEndpoint: "img2img", deapiModel: "Qwen-Image-Edit-Plus" },
};

// ── Smart Key Cache for LemonData ──
let cachedLemonKey: { id: string; api_key: string } | null = null;
let cachedLemonKeyExpiry = 0;
const LEMON_CACHE_TTL = 5 * 60 * 1000;

async function getLemonKey(sb: any, excludeId?: string): Promise<{ id: string; api_key: string } | null> {
  if (cachedLemonKey && Date.now() < cachedLemonKeyExpiry && cachedLemonKey.id !== excludeId) {
    return cachedLemonKey;
  }
  const { data } = await sb.from("lemondata_keys")
    .select("id, api_key")
    .eq("is_active", true)
    .eq("is_blocked", false)
    .limit(50);
  if (!data || data.length === 0) { cachedLemonKey = null; return null; }
  const pool = excludeId ? data.filter((k: any) => k.id !== excludeId) : data;
  if (pool.length === 0) { cachedLemonKey = null; return null; }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  cachedLemonKey = pick;
  cachedLemonKeyExpiry = Date.now() + LEMON_CACHE_TTL;
  return pick;
}

function blockLemonKey(sb: any, keyId: string, reason: string) {
  if (cachedLemonKey?.id === keyId) { cachedLemonKey = null; }
  sb.from("lemondata_keys").update({
    is_blocked: true, block_reason: reason, last_error_at: new Date().toISOString(),
  }).eq("id", keyId).then(() => {
    sb.from("lemondata_keys").select("error_count").eq("id", keyId).single().then(({ data }: any) => {
      if (data) sb.from("lemondata_keys").update({ error_count: (data.error_count || 0) + 1 }).eq("id", keyId);
    });
  });
}

function markKeyUsed(sb: any, keyId: string) {
  sb.from("lemondata_keys").select("usage_count").eq("id", keyId).single().then(({ data }: any) => {
    sb.from("lemondata_keys").update({
      last_used_at: new Date().toISOString(),
      usage_count: ((data?.usage_count) || 0) + 1,
    }).eq("id", keyId);
  });
}

// ── deAPI key rotation (for free models) ──
async function getDeapiKey(sb: any): Promise<{ key: string; id: string } | null> {
  const { data } = await sb.from("deapi_keys").select("id, api_key").eq("is_active", true).order("usage_count", { ascending: true }).limit(5);
  if (!data || data.length === 0) return null;
  const pick = data[Math.floor(Math.random() * data.length)];
  await sb.from("deapi_keys").update({ usage_count: (pick as any).usage_count + 1 || 1, last_used_at: new Date().toISOString() }).eq("id", pick.id);
  return { key: pick.api_key, id: pick.id };
}

async function callDeapi(sb: any, deapiEndpoint: string, body: Record<string, unknown>, maxRetries = 3): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const keyData = await getDeapiKey(sb);
    if (!keyData) throw new Error("No active deAPI keys available");
    try {
      const resp = await fetch(`https://api.deapi.ai/api/v1/client/${deapiEndpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${keyData.key}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      if (resp.status === 401 || resp.status === 403) {
        await sb.from("deapi_keys").update({ is_active: false }).eq("id", keyData.id);
        continue;
      }
      if (!resp.ok) { const t = await resp.text(); throw new Error(`deAPI error: ${resp.status} - ${t.slice(0, 200)}`); }
      const result = await resp.json();
      if (result.request_id) return await pollDeapiResult(keyData.key, result.request_id);
      return result;
    } catch (e: any) {
      if (attempt === maxRetries - 1) throw e;
    }
  }
  throw new Error("All deAPI key attempts failed");
}

async function pollDeapiResult(apiKey: string, requestId: string): Promise<any> {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const resp = await fetch(`https://api.deapi.ai/api/v1/client/request-status/${requestId}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!resp.ok) continue;
    const status = await resp.json();
    if (status.status === "completed" || status.status === "success") return status;
    if (status.status === "failed" || status.status === "error") throw new Error("deAPI generation failed");
  }
  throw new Error("deAPI generation timed out");
}

// ── LemonData image generation with retry ──
async function callLemonImage(
  sb: any,
  modelName: string,
  prompt: string,
  size: string,
  n: number,
  imageUrl?: string,
  maxRetries = 3,
): Promise<string[]> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const keyData = await getLemonKey(sb);
    if (!keyData) throw new Error("No active LemonData keys available");

    try {
      const body: Record<string, any> = {
        model: modelName,
        prompt,
        n: Math.min(n, 4),
        size,
      };

      // For image-to-image, include image in the request
      let url = LEMONDATA_IMG_URL;
      if (imageUrl) {
        // LemonData expects image_url field for edit endpoints
        body.image_url = imageUrl;
        body.image = imageUrl;
        url = LEMONDATA_EDIT_URL;
      }

      console.log(`LemonData image: model=${modelName}, size=${size}, n=${n}, hasImage=${!!imageUrl}, attempt=${attempt + 1}`);

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keyData.api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (resp.status === 401 || resp.status === 403) {
        blockLemonKey(sb, keyData.id, `HTTP ${resp.status}`); // fire-and-forget
        continue;
      }
      if (resp.status === 429) {
        continue;
      }
      if (!resp.ok) {
        const errText = await resp.text();
        console.error("LemonData image error:", resp.status, errText.slice(0, 300));
        throw new Error(`LemonData error: ${resp.status} - ${errText.slice(0, 200)}`);
      }

      markKeyUsed(sb, keyData.id); // fire-and-forget
      const result = await resp.json();

      // Extract URLs from OpenAI-compatible response
      const urls: string[] = [];
      if (result.data && Array.isArray(result.data)) {
        for (const item of result.data) {
          if (item.url) urls.push(item.url);
          else if (item.b64_json) urls.push(`data:image/png;base64,${item.b64_json}`);
        }
      }
      // Fallback: check other response formats
      if (urls.length === 0) {
        if (result.images && Array.isArray(result.images)) {
          for (const img of result.images) {
            if (img?.url) urls.push(img.url);
          }
        }
        if (result.image?.url) urls.push(result.image.url);
        if (result.output?.url) urls.push(result.output.url);
        if (typeof result.url === "string") urls.push(result.url);
      }

      if (urls.length === 0) {
        console.error("LemonData returned no images:", JSON.stringify(result).slice(0, 500));
        throw new Error("No images returned from LemonData");
      }

      return urls;
    } catch (e: any) {
      if (attempt === maxRetries - 1) throw e;
    }
  }
  throw new Error("All LemonData attempts failed");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, model, image_url, image_urls, credits_cost, num_images, image_size } = await req.json();
    const user_id = authUser.id;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceRoleKey);

    // Server-validated credit cost (clamped to safe range; client-supplied value is only an upper hint)
    const requestedCost = Number(credits_cost);
    const safeCost = Number.isFinite(requestedCost) ? Math.max(1, Math.min(requestedCost, 50)) : 1;
    {
      const { data: creditResult } = await sb.rpc("deduct_credits", {
        p_user_id: user_id,
        p_amount: safeCost,
        p_action_type: "image_generation",
        p_description: `${model || "default"} - ${(prompt || "").slice(0, 50)}`,
      });
      if (creditResult && !creditResult.success) {
        return new Response(JSON.stringify({ error: creditResult.error || "Insufficient credits" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const modelConfig = MODEL_MAP[model] || MODEL_MAP["megsy-imagine"];

    // Collect all input images
    const rawImages = [
      ...(Array.isArray(image_urls) ? image_urls : []),
      ...(image_url ? [image_url] : []),
    ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    const hasImages = rawImages.length > 0;
    const firstImage = rawImages[0] || undefined;

    // Size string
    const width = image_size?.width || 1024;
    const height = image_size?.height || 1024;
    const sizeStr = `${width}x${height}`;
    const requestedCount = Math.min(Math.max(num_images || 1, 1), 4);

    // ═══ DEAPI FREE MODELS ═══
    if (modelConfig.provider === "deapi") {
      const deapiBody: Record<string, unknown> = {
        prompt: prompt || "A beautiful image",
        model: modelConfig.deapiModel,
        width, height,
      };
      if (modelConfig.deapiEndpoint === "img2img" && firstImage) {
        deapiBody.image = firstImage;
      }
      console.log(`deAPI image: model=${modelConfig.deapiModel}, endpoint=${modelConfig.deapiEndpoint}`);
      const result = await callDeapi(sb, modelConfig.deapiEndpoint!, deapiBody);
      let imageUrlResult = "";
      if (result.image_url) imageUrlResult = result.image_url;
      else if (result.output?.image_url) imageUrlResult = result.output.image_url;
      else if (result.result?.image_url) imageUrlResult = result.result.image_url;
      else if (result.images?.[0]?.url) imageUrlResult = result.images[0].url;
      else if (typeof result.output === "string") imageUrlResult = result.output;
      return new Response(JSON.stringify({ image_urls: imageUrlResult ? [imageUrlResult] : [], image_url: imageUrlResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══ LOVABLE AI GATEWAY (preferred) ═══
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    let urls: string[] = [];
    if (lovableKey) {
      try {
        // Pick the best Gemini image model based on tier
        const lovableModel = (model === "nano-banana-pro" || model === "megsy-imagine")
          ? "google/gemini-3-pro-image-preview"
          : (model === "nano-banana-2")
            ? "google/gemini-3.1-flash-image-preview"
            : "google/gemini-2.5-flash-image";

        const userContent: any[] = [{ type: "text", text: prompt || "A beautiful image" }];
        if (hasImages) {
          for (const u of rawImages.slice(0, 4)) {
            userContent.push({ type: "image_url", image_url: { url: u } });
          }
        }

        console.log(`Lovable AI image: model=${lovableModel}, hasImages=${hasImages}`);
        const lovResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: lovableModel,
            messages: [{ role: "user", content: userContent }],
            modalities: ["image", "text"],
          }),
        });
        if (lovResp.ok) {
          const lovData = await lovResp.json();
          const imgs = lovData?.choices?.[0]?.message?.images;
          if (Array.isArray(imgs)) {
            for (const im of imgs) {
              const u = im?.image_url?.url;
              if (u) urls.push(u);
            }
          }
        } else {
          const errText = await lovResp.text();
          console.error("Lovable AI image error:", lovResp.status, errText.slice(0, 300));
        }
      } catch (e) {
        console.error("Lovable AI image exception:", e);
      }
    }

    // ═══ LEMONDATA FALLBACK ═══
    if (urls.length === 0) {
      const lemonModel = hasImages && modelConfig.i2i ? modelConfig.i2i : modelConfig.t2i;
      urls = await callLemonImage(
        sb,
        lemonModel,
        prompt || "A beautiful image",
        sizeStr,
        requestedCount,
        hasImages ? firstImage : undefined,
      );
    }

    return new Response(JSON.stringify({ image_urls: urls, image_url: urls[0] || "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
