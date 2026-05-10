import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type VideoModelConfig = {
  t2v: string;
  i2v?: string;
  provider?: "fal" | "deapi";
  deapiEndpoint?: string;
  deapiModel?: string;
};

const VIDEO_MODEL_MAP: Record<string, VideoModelConfig> = {
  // Megsy Video (= Kling O3 Pro)
  "megsy-video": { t2v: "fal-ai/kling-video/o3/pro/text-to-video", i2v: "fal-ai/kling-video/o3/pro/image-to-video" },
  // Premium
  "veo-3.1": { t2v: "fal-ai/veo3.1" },
  "veo-3.1-fast": { t2v: "fal-ai/veo3.1/fast", i2v: "fal-ai/veo3.1/fast/image-to-video" },
  "kling-3-pro": { t2v: "fal-ai/kling-video/v3/pro/text-to-video", i2v: "fal-ai/kling-video/v3/pro/image-to-video" },
  "kling-o3-pro": { t2v: "fal-ai/kling-video/o3/pro/text-to-video", i2v: "fal-ai/kling-video/o3/pro/image-to-video" },
  "grok-video": { t2v: "xai/grok-imagine-video/text-to-video", i2v: "xai/grok-imagine-video/image-to-video" },
  "sora-2-pro": { t2v: "fal-ai/sora-2/text-to-video/pro" },
  "sora-2": { t2v: "fal-ai/sora-2/text-to-video" },
  "seedance-1.5-pro": { t2v: "fal-ai/bytedance/seedance/v1.5/pro/text-to-video", i2v: "fal-ai/bytedance/seedance/v1.5/pro/image-to-video" },
  "seedance-1.0-pro": { t2v: "fal-ai/bytedance/seedance/v1/pro/text-to-video", i2v: "fal-ai/bytedance/seedance/v1/pro/image-to-video" },
  "seedance-1.0-fast": { t2v: "fal-ai/bytedance/seedance/v1/pro/fast/text-to-video", i2v: "fal-ai/bytedance/seedance/v1/pro/fast/image-to-video" },
  "kling-2.6-pro": { t2v: "fal-ai/kling-video/v2.6/pro/text-to-video", i2v: "fal-ai/kling-video/v2.6/pro/image-to-video" },
  "kling-1.6-pro": { t2v: "fal-ai/kling-video/v1.6/pro/text-to-video", i2v: "fal-ai/kling-video/v1.6/pro/image-to-video" },
  "kling-2.5-turbo": { t2v: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video", i2v: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video" },
  "kling-2.1": { t2v: "fal-ai/kling-video/v2.1/master/text-to-video", i2v: "fal-ai/kling-video/v2.1/master/image-to-video" },
  "wan-2.6-vid": { t2v: "wan/v2.6/text-to-video", i2v: "wan/v2.6/image-to-video" },
  "ltx-2": { t2v: "fal-ai/ltx-2/text-to-video", i2v: "fal-ai/ltx-2/image-to-video" },
  // ═══ FREE DEAPI MODELS ═══
  "ltx-2-19b": { t2v: "", provider: "deapi", deapiEndpoint: "txt2video", deapiModel: "LTX-2-19B-Distilled-FP8" },
  "ltx-2.3-22b": { t2v: "", i2v: "", provider: "deapi", deapiEndpoint: "img2video", deapiModel: "LTX-2.3-22B-Distilled-INT8" },
};

// ── deAPI key rotation ──
async function getDeapiKey(sb: any): Promise<{ key: string; id: string } | null> {
  const { data } = await sb
    .from("deapi_keys")
    .select("id, api_key, usage_count")
    .eq("is_active", true)
    .order("usage_count", { ascending: true })
    .limit(5);
  if (!data || data.length === 0) return null;
  const pick = data[Math.floor(Math.random() * data.length)];
  await sb.from("deapi_keys").update({ usage_count: ((pick as any).usage_count || 0) + 1, last_used_at: new Date().toISOString() }).eq("id", pick.id);
  return { key: pick.api_key, id: pick.id };
}

async function markKeyInactive(sb: any, keyId: string) {
  await sb.from("deapi_keys").update({ is_active: false }).eq("id", keyId);
}

async function pollDeapiResult(apiKey: string, requestId: string, maxAttempts = 120): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const resp = await fetch(`https://api.deapi.ai/api/v1/client/request-status/${requestId}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!resp.ok) continue;
    const status = await resp.json();
    if (status.status === "completed" || status.status === "success") return status;
    if (status.status === "failed" || status.status === "error") throw new Error("deAPI video generation failed");
  }
  throw new Error("deAPI video generation timed out");
}

async function callDeapiVideo(
  sb: any,
  deapiEndpoint: string,
  body: Record<string, unknown>,
  maxRetries = 3,
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const keyData = await getDeapiKey(sb);
    if (!keyData) throw new Error("No active deAPI keys available");
    try {
      const resp = await fetch(`https://api.deapi.ai/api/v1/client/${deapiEndpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keyData.key}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
      if (resp.status === 401 || resp.status === 403) {
        console.warn(`deAPI key ${keyData.id} failed (${resp.status}), rotating...`);
        await markKeyInactive(sb, keyData.id);
        continue;
      }
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`deAPI error: ${resp.status} - ${errText.slice(0, 200)}`);
      }
      const result = await resp.json();
      if (result.request_id) {
        return await pollDeapiResult(keyData.key, result.request_id);
      }
      return result;
    } catch (e: any) {
      if (e.message?.includes("deAPI key") || attempt === maxRetries - 1) throw e;
    }
  }
  throw new Error("All deAPI key attempts failed");
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
    const { prompt, model, image_url, credits_cost } = await req.json();
    const user_id = authUser.id;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceRoleKey);

    // Server-validated cost
    const requestedCost = Number(credits_cost);
    const safeCost = Number.isFinite(requestedCost) ? Math.max(1, Math.min(requestedCost, 200)) : 5;
    {
      const { data: creditResult } = await sb.rpc("deduct_credits", {
        p_user_id: user_id,
        p_amount: safeCost,
        p_action_type: "video_generation",
        p_description: `${model || "default"} - ${(prompt || "").slice(0, 50)}`,
      });
      if (creditResult && !creditResult.success) {
        return new Response(JSON.stringify({ error: creditResult.error || "Insufficient credits" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const modelConfig = VIDEO_MODEL_MAP[model] || VIDEO_MODEL_MAP["megsy-video"];

    // ═══ DEAPI MODELS ═══
    if (modelConfig.provider === "deapi") {
      const deapiBody: Record<string, unknown> = {
        prompt: prompt || "A cinematic video",
        model: modelConfig.deapiModel,
      };
      if (image_url && modelConfig.deapiEndpoint === "img2video") {
        deapiBody.image = image_url;
      }

      console.log(`Generating video via deAPI: model=${modelConfig.deapiModel}, endpoint=${modelConfig.deapiEndpoint}`);
      const result = await callDeapiVideo(sb, modelConfig.deapiEndpoint!, deapiBody);

      let videoUrl = "";
      if (result.video_url) videoUrl = result.video_url;
      else if (result.output?.video_url) videoUrl = result.output.video_url;
      else if (result.result?.video_url) videoUrl = result.result.video_url;
      else if (typeof result.output === "string") videoUrl = result.output;

      return new Response(JSON.stringify({ video_url: videoUrl, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══ FAL.AI MODELS ═══
    const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
    if (!FAL_API_KEY) throw new Error("FAL_API_KEY not configured");

    const hasImage = !!image_url;
    const endpoint = hasImage && modelConfig.i2v ? modelConfig.i2v : modelConfig.t2v;

    const input: Record<string, any> = { prompt: prompt || "A cinematic video" };
    if (image_url) input.image_url = image_url;

    console.log(`Generating video with model: ${model}, endpoint: ${endpoint}`);

    const submitResp = await fetch(`https://queue.fal.run/${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Key ${FAL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!submitResp.ok) {
      const errText = await submitResp.text();
      console.error("fal video submit error:", submitResp.status, errText);
      throw new Error(`fal.ai error: ${submitResp.status}`);
    }

    const { request_id } = await submitResp.json();

    let result = null;
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const statusResp = await fetch(`https://queue.fal.run/${endpoint}/requests/${request_id}/status`, {
        headers: { Authorization: `Key ${FAL_API_KEY}` },
      });
      if (!statusResp.ok) continue;
      const status = await statusResp.json();
      if (status.status === "COMPLETED") {
        const resultResp = await fetch(`https://queue.fal.run/${endpoint}/requests/${request_id}`, {
          headers: { Authorization: `Key ${FAL_API_KEY}` },
        });
        result = await resultResp.json();
        break;
      }
      if (status.status === "FAILED") throw new Error("Video generation failed");
    }

    if (!result) throw new Error("Generation timed out");

    let videoUrl = "";
    if (result.video?.url) videoUrl = result.video.url;
    else if (result.output?.url) videoUrl = result.output.url;

    return new Response(JSON.stringify({ video_url: videoUrl, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-video error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
