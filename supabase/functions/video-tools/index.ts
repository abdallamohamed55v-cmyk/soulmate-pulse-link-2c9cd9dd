import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOOL_MODELS: Record<string, string> = {
  'swap-characters': 'fal-ai/pixverse/swap',
  'upscale': 'fal-ai/bytedance-upscaler/upscale/video',
  'talking-photo': 'fal-ai/heygen/avatar4/image-to-video',
  'video-extender': 'fal-ai/veo3.1/extend-video',
  'auto-caption': 'fal-ai/auto-caption',
  'lip-sync': 'veed/lipsync',
  'green-screen': 'fal-ai/bria/background/remove/video',
  'video-colorizer': 'fal-ai/video-colorizer',
  'video-bg-replacer': 'fal-ai/bria/background/replace/video',
  'video-denoise': 'fal-ai/video-enhance',
  'video-intro': 'fal-ai/veo3.1',
  'music-separator': 'fal-ai/music-separator',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const FAL_API_KEY = Deno.env.get('FAL_API_KEY');
    if (!FAL_API_KEY) throw new Error('FAL_API_KEY not configured');

    const body = await req.json();
    const { tool, video, image, audio, script, resolution, tier, extraSeconds, withAudio, duration, prompt, backgroundImage } = body;
    const model = TOOL_MODELS[tool];
    if (!model) throw new Error(`Unknown tool: ${tool}`);

    const falBody: Record<string, any> = {};
    if (video) falBody.video_url = video;
    if (image) falBody.image_url = image;
    if (audio) falBody.audio_url = audio;
    if (script) falBody.text = script;
    if (resolution) falBody.resolution = resolution;
    if (tier) falBody.quality = tier;
    if (extraSeconds) falBody.extend_seconds = extraSeconds;
    if (withAudio !== undefined) falBody.with_audio = withAudio;
    if (duration) falBody.duration = duration;
    if (prompt) falBody.prompt = prompt;
    if (backgroundImage) falBody.background_image_url = backgroundImage;

    const response = await fetch(`https://queue.fal.run/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(falBody),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`fal.ai error: ${response.status} ${err}`);
    }

    const result = await response.json();
    
    if (result.request_id) {
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const pollResp = await fetch(`https://queue.fal.run/${model}/requests/${result.request_id}/status`, {
          headers: { 'Authorization': `Key ${FAL_API_KEY}` },
        });
        const pollResult = await pollResp.json();
        if (pollResult.status === 'COMPLETED') break;
        if (pollResult.status === 'FAILED') throw new Error('Generation failed');
      }
      
      const resultResp = await fetch(`https://queue.fal.run/${model}/requests/${result.request_id}`, {
        headers: { 'Authorization': `Key ${FAL_API_KEY}` },
      });
      const finalResult = await resultResp.json();
      const url = finalResult?.video?.url || finalResult?.output?.url || finalResult?.videos?.[0]?.url;
      
      return new Response(JSON.stringify({ url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = result?.video?.url || result?.output?.url;
    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
