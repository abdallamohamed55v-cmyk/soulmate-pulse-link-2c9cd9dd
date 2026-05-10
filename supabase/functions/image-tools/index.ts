import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthUser } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ToolConfig {
  provider: "lemon" | "wavespeed" | "fal";
  lemonModel?: string;
  wavespeedModel?: string;
  falModel?: string;
  needsPrompt?: boolean;
  needsImage?: boolean;
  needsTarget?: boolean;
  needsMask?: boolean;
}

const TOOL_CONFIG: Record<string, ToolConfig> = {
  'inpaint': { provider: "lemon", lemonModel: "nano-banana-edit", needsPrompt: true, needsImage: true, needsMask: true },
  'clothes-changer': { provider: "lemon", lemonModel: "nano-banana-edit", needsPrompt: true, needsImage: true },
  'headshot': { provider: "lemon", lemonModel: "nano-banana-pro", needsPrompt: true, needsImage: true },
  'bg-remover': { provider: "wavespeed", wavespeedModel: "wavespeed-ai/image-background-remover", needsImage: true },
  'face-swap': { provider: "wavespeed", wavespeedModel: "wavespeed-ai/image-face-swap", needsImage: true, needsTarget: true },
  'relight': { provider: "fal", falModel: "fal-ai/iclight-v2", needsImage: true, needsPrompt: true },
  'colorizer': { provider: "lemon", lemonModel: "nano-banana-edit", needsPrompt: true, needsImage: true },
  'character-swap': { provider: "wavespeed", wavespeedModel: "wavespeed-ai/image-face-swap", needsImage: true, needsTarget: true },
  'storyboard': { provider: "lemon", lemonModel: "nano-banana-pro", needsPrompt: true },
  'sketch-to-image': { provider: "lemon", lemonModel: "nano-banana-edit", needsPrompt: true, needsImage: true },
  'retouching': { provider: "lemon", lemonModel: "nano-banana-edit", needsPrompt: true, needsImage: true },
  'remover': { provider: "lemon", lemonModel: "nano-banana-edit", needsPrompt: true, needsImage: true, needsMask: true },
  'hair-changer': { provider: "lemon", lemonModel: "nano-banana-edit", needsPrompt: true, needsImage: true },
  'cartoon': { provider: "lemon", lemonModel: "nano-banana-edit", needsPrompt: true, needsImage: true },
  'avatar-generator': { provider: "lemon", lemonModel: "nano-banana-pro", needsPrompt: true, needsImage: true },
  'product-photo': { provider: "lemon", lemonModel: "nano-banana-edit", needsPrompt: true, needsImage: true },
  'logo-generator': { provider: "lemon", lemonModel: "nano-banana-pro", needsPrompt: true },
  'perspective-correction': { provider: "lemon", lemonModel: "nano-banana-edit", needsPrompt: true, needsImage: true },
};

const TOOL_PROMPTS: Record<string, string> = {
  'clothes-changer': "Change the clothes on this person to: ",
  'headshot': "Create a professional headshot photo from this image, maintaining the person's features with studio lighting and clean background",
  'relight': "Relight this image with professional studio lighting",
  'colorizer': "Colorize this black and white image with natural, realistic colors",
  'sketch-to-image': "Transform this sketch into a detailed, realistic image: ",
  'retouching': "Professionally retouch this portrait photo, smooth skin, remove blemishes, enhance features naturally",
  'remover': "Remove the selected object from this image and fill the area naturally",
  'hair-changer': "Change the hairstyle of this person to: ",
  'cartoon': "Transform this photo into a high-quality cartoon/anime style illustration, preserving the person's features",
  'inpaint': "Fill the masked area naturally: ",
  'avatar-generator': "Generate a stylized personal avatar from this photo, keeping facial features recognizable: ",
  'product-photo': "Place this product in a professional photography studio setting with clean white background and studio lighting: ",
  'logo-generator': "Design a modern, clean, minimalist professional logo for: ",
  'perspective-correction': "Correct the perspective distortion in this image, straighten lines and fix the viewing angle to appear natural and properly aligned",
};

// ── LemonData key cache ──
let cachedLemonKey: { id: string; api_key: string } | null = null;
let cachedLemonKeyExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getLemonKey(sb: ReturnType<typeof createClient>, excludeId?: string): Promise<{ id: string; api_key: string }> {
  if (cachedLemonKey && Date.now() < cachedLemonKeyExpiry && cachedLemonKey.id !== excludeId) return cachedLemonKey;
  const { data } = await sb.from("lemondata_keys").select("id, api_key").eq("is_active", true).eq("is_blocked", false).limit(50);
  if (!data || data.length === 0) throw new Error("No active LemonData keys");
  const pool = excludeId ? data.filter((k: any) => k.id !== excludeId) : data;
  if (pool.length === 0) throw new Error("No active LemonData keys");
  const pick = pool[Math.floor(Math.random() * pool.length)];
  cachedLemonKey = pick;
  cachedLemonKeyExpiry = Date.now() + CACHE_TTL;
  return pick;
}

function blockLemonKey(sb: ReturnType<typeof createClient>, keyId: string) {
  if (cachedLemonKey?.id === keyId) cachedLemonKey = null;
  sb.from("lemondata_keys").update({ is_blocked: true, block_reason: "HTTP error", last_error_at: new Date().toISOString() }).eq("id", keyId).then(() => {});
}

// ── WaveSpeed key cache ──
let cachedWaveKey: { id: string; api_key: string } | null = null;
let cachedWaveKeyExpiry = 0;

async function getWaveSpeedKey(sb: ReturnType<typeof createClient>, excludeId?: string): Promise<{ id: string; api_key: string }> {
  if (cachedWaveKey && Date.now() < cachedWaveKeyExpiry && cachedWaveKey.id !== excludeId) return cachedWaveKey;
  const { data } = await sb.from("api_keys").select("id, api_key").eq("service", "wavespeed").eq("is_active", true).limit(10);
  if (!data || data.length === 0) throw new Error("No active WaveSpeed keys. Add keys via Telegram bot.");
  const pool = excludeId ? data.filter((k: any) => k.id !== excludeId) : data;
  if (pool.length === 0) throw new Error("No active WaveSpeed keys");
  const pick = pool[Math.floor(Math.random() * pool.length)];
  cachedWaveKey = pick;
  cachedWaveKeyExpiry = Date.now() + CACHE_TTL;
  return pick;
}

// ── LemonData image call ──
async function callLemonImage(sb: ReturnType<typeof createClient>, model: string, prompt: string, imageUrl?: string, maskUrl?: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const key = await getLemonKey(sb, attempt > 0 ? cachedLemonKey?.id : undefined);
    try {
      const body: Record<string, any> = { model, prompt, n: 1, size: "1024x1024" };
      let url = "https://api.lemondata.cc/v1/images/generations";
      
      if (imageUrl) {
        body.image_url = imageUrl;
        body.image = imageUrl;
        url = "https://api.lemondata.cc/v1/images/edits";
      }
      if (maskUrl) {
        body.mask = maskUrl;
        body.mask_image = maskUrl;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);
      const resp = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${key.api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (resp.status === 401 || resp.status === 403) { blockLemonKey(sb, key.id); continue; }
      if (resp.status === 429) { continue; }
      if (!resp.ok) { const t = await resp.text(); throw new Error(`LemonData error: ${resp.status} ${t.slice(0, 200)}`); }

      sb.from("lemondata_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id).then(() => {});
      
      const result = await resp.json();
      const imgUrl = result.data?.[0]?.url || result.data?.[0]?.b64_json ? `data:image/png;base64,${result.data[0].b64_json}` : result.url || result.image?.url || result.output?.url;
      if (imgUrl) return imgUrl;
      throw new Error("No image URL in response");
    } catch (e: any) {
      if (attempt === 2) throw e;
    }
  }
  throw new Error("All LemonData attempts failed");
}

// ── fal.ai call ──
async function callFal(model: string, params: Record<string, any>): Promise<string> {
  const falKey = Deno.env.get("FAL_API_KEY");
  if (!falKey) throw new Error("FAL_API_KEY not configured");

  console.log("fal.ai call:", model, JSON.stringify(Object.keys(params)));

  // Try queue-based approach (more reliable for heavy models)
  const queueResp = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!queueResp.ok) {
    const qt = await queueResp.text();
    console.error("fal.ai queue submit error:", queueResp.status, qt);
    throw new Error(`fal.ai error: ${queueResp.status} ${qt.slice(0, 300)}`);
  }

  const queueData = await queueResp.json();
  console.log("fal.ai queue response:", JSON.stringify(queueData).slice(0, 500));
  
  // Check if we got a direct result
  const directUrl = queueData.images?.[0]?.url || queueData.image?.url || queueData.relit_image?.url || queueData.output?.url;
  if (directUrl) return directUrl;
  
  const requestId = queueData.request_id;
  if (!requestId) throw new Error("No request_id from fal.ai: " + JSON.stringify(queueData).slice(0, 300));

  // Poll for result
  for (let i = 0; i < 45; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const pollResp = await fetch(`https://queue.fal.run/${model}/requests/${requestId}/status`, {
      headers: { Authorization: `Key ${falKey}` },
    });
    if (!pollResp.ok) continue;
    const pollData = await pollResp.json();
    console.log(`fal.ai poll ${i}:`, pollData.status);
    
    if (pollData.status === "COMPLETED") {
      const resultResp = await fetch(`https://queue.fal.run/${model}/requests/${requestId}`, {
        headers: { Authorization: `Key ${falKey}` },
      });
      const resultData = await resultResp.json();
      console.log("fal.ai result keys:", Object.keys(resultData));
      const url = resultData.images?.[0]?.url || resultData.image?.url || resultData.relit_image?.url || resultData.output?.url;
      if (url) return url;
      // Try to find any URL in the result
      const jsonStr = JSON.stringify(resultData);
      const urlMatch = jsonStr.match(/https:\/\/[^"]+\.(png|jpg|jpeg|webp)/);
      if (urlMatch) return urlMatch[0];
      throw new Error("No image in fal.ai result: " + jsonStr.slice(0, 300));
    }
    if (pollData.status === "FAILED") {
      throw new Error("fal.ai generation failed: " + JSON.stringify(pollData).slice(0, 300));
    }
  }
  throw new Error("fal.ai generation timed out");
}

// ── WaveSpeed call ──
async function callWaveSpeed(sb: ReturnType<typeof createClient>, model: string, params: Record<string, any>): Promise<string> {
  const key = await getWaveSpeedKey(sb);
  
  console.log("WaveSpeed call:", model, JSON.stringify(Object.keys(params)));
  
  const submitResp = await fetch(`https://api.wavespeed.ai/api/v3/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key.api_key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, enable_base64_output: false }),
  });

  if (!submitResp.ok) {
    const t = await submitResp.text();
    console.error("WaveSpeed submit error:", submitResp.status, t);
    throw new Error(`WaveSpeed error: ${submitResp.status} ${t.slice(0, 300)}`);
  }

  const submitData = await submitResp.json();
  console.log("WaveSpeed submit response:", JSON.stringify(submitData).slice(0, 500));
  
  const taskId = submitData.data?.id || submitData.id;
  if (!taskId) {
    const url = submitData.data?.outputs?.[0] || submitData.data?.output?.url || submitData.output?.url;
    if (url) return url;
    throw new Error("No task ID returned from WaveSpeed: " + JSON.stringify(submitData).slice(0, 300));
  }

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const pollResp = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`, {
      headers: { Authorization: `Bearer ${key.api_key}` },
    });
    if (!pollResp.ok) continue;
    const pollData = await pollResp.json();
    const status = pollData.data?.status || pollData.status;
    if (status === "completed" || status === "success") {
      const url = pollData.data?.outputs?.[0] || pollData.data?.output?.url || pollData.output?.url;
      if (url) return url;
    }
    if (status === "failed" || status === "error") throw new Error("WaveSpeed generation failed");
  }
  throw new Error("WaveSpeed generation timed out");
}

// Upload base64 to Supabase storage and return public URL
async function uploadBase64ToStorage(sb: ReturnType<typeof createClient>, base64Data: string, prefix: string): Promise<string> {
  if (base64Data.startsWith("http://") || base64Data.startsWith("https://")) return base64Data;
  
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid base64 image data");
  
  const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
  const rawBase64 = matches[2];
  const bytes = Uint8Array.from(atob(rawBase64), c => c.charCodeAt(0));
  
  const fileName = `${prefix}-${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from("user-images").upload(fileName, bytes, {
    contentType: `image/${matches[1]}`,
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  
  const { data: urlData } = sb.storage.from("user-images").getPublicUrl(fileName);
  return urlData.publicUrl;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { tool, image, mask, target, prompt, color, direction } = await req.json();
    
    const config = TOOL_CONFIG[tool];
    if (!config) throw new Error(`Unknown tool: ${tool}`);

    let resultUrl: string;
    const needsPublicUrl = config.provider === "fal" || config.provider === "wavespeed";

    if (config.provider === "fal") {
      const params: Record<string, any> = {};
      if (tool === 'relight') {
        const imageUrl = needsPublicUrl && image ? await uploadBase64ToStorage(sb, image, "relight") : image;
        params.image_url = imageUrl;
        params.prompt = prompt || "Professional studio lighting, dramatic and cinematic";
        // iclight-v2 params
        params.light_source = direction || "Left Light";
        if (direction) {
          const dirMap: Record<string, string> = {
            left: "Left Light",
            right: "Right Light", 
            top: "Top Light",
            bottom: "Bottom Light",
            center: "Ambient"
          };
          params.light_source = dirMap[direction] || "Left Light";
        }
      }
      resultUrl = await callFal(config.falModel!, params);
    } else if (config.provider === "wavespeed") {
      const params: Record<string, any> = {};
      if (tool === 'face-swap' || tool === 'character-swap') {
        // WaveSpeed face-swap expects swap_image (source face) and target_image (destination)
        const sourceUrl = image ? await uploadBase64ToStorage(sb, image, "swap-src") : image;
        const targetUrl = target ? await uploadBase64ToStorage(sb, target, "swap-tgt") : sourceUrl;
        params.swap_image = sourceUrl;  // The face to take FROM
        params.target_image = targetUrl; // The image to put the face ON
      } else if (tool === 'bg-remover') {
        const imageUrl = image ? await uploadBase64ToStorage(sb, image, "bgrem") : image;
        params.image = imageUrl;
        params.output_format = "png";
      }
      
      resultUrl = await callWaveSpeed(sb, config.wavespeedModel!, params);
    } else {
      let fullPrompt = prompt || "";
      const toolPrompt = TOOL_PROMPTS[tool];
      if (toolPrompt) {
        fullPrompt = prompt ? `${toolPrompt}${prompt}` : toolPrompt;
      }
      if (!fullPrompt) fullPrompt = "Edit this image";

      resultUrl = await callLemonImage(sb, config.lemonModel!, fullPrompt, image || undefined, mask || undefined);
    }

    return new Response(JSON.stringify({ url: resultUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("image-tools error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
