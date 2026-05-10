import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LEMON_BASE = "https://api.lemondata.cc";

function initSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getLemonKey(supabase: any, specificId?: string) {
  if (specificId) {
    const { data } = await supabase.from("lemondata_keys").select("api_key, id, usage_count").eq("id", specificId).single();
    if (!data) throw new Error("Key not found");
    return data;
  }
  const { data: keys } = await supabase.from("lemondata_keys").select("api_key, id, usage_count").eq("is_active", true).eq("is_blocked", false).limit(20);
  if (!keys?.length) throw new Error("NO_LEMON_KEYS");
  return keys[Math.floor(Math.random() * keys.length)];
}

async function blockLemonKey(supabase: any, keyId: string, reason: string) {
  await supabase.from("lemondata_keys").update({ is_blocked: true, block_reason: reason }).eq("id", keyId);
}

async function bumpLemonUsage(supabase: any, key: any) {
  supabase.from("lemondata_keys").update({ usage_count: (key.usage_count || 0) + 1, last_used_at: new Date().toISOString() }).eq("id", key.id);
}

// ─── MUSIC via OpenRouter (Lyria 3) ───
async function handleMusic(_supabase: any, prompt: string, settings: any, model_id: string) {
  const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY");
  if (!OPENROUTER_KEY) {
    return { error: "Music service is not configured.", fallback: true };
  }

  try {
    const userPrompt = settings?.tags
      ? `Create a song with these details:\nTitle: ${settings?.title || "Untitled"}\nStyle/Tags: ${settings.tags}\nLyrics/Description: ${prompt}`
      : prompt;

    const resp = await Promise.race([
      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/lyria-3-clip-preview",
          messages: [{ role: "user", content: userPrompt }],
        }),
      }),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("timeout")), 60000)),
    ]) as Response;

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Music OpenRouter error:", resp.status, errText);
      if (resp.status === 429) {
        return { error: "Music service is busy. Please try again in a moment.", fallback: true };
      }
      return { error: "Music generation failed. Please try again.", fallback: true };
    }

    const data = await resp.json();
    console.log("Music response keys:", Object.keys(data));

    // Lyria returns audio in the response - check for inline_data or audio content
    const choice = data.choices?.[0];
    const message = choice?.message;

    // Check for audio parts in content (multimodal response)
    if (message?.content && Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === "audio" || part.inline_data?.mime_type?.includes("audio")) {
          const audioData = part.inline_data?.data || part.data;
          const mimeType = part.inline_data?.mime_type || "audio/mp3";
          if (audioData) {
            return { success: true, status: "completed", url: `data:${mimeType};base64,${audioData}`, model: model_id };
          }
        }
      }
    }

    // Check for audio in the response directly
    if (data.audio?.data) {
      return { success: true, status: "completed", url: `data:audio/mp3;base64,${data.audio.data}`, model: model_id };
    }

    // Check if there's a URL in the response
    if (data.audio_url || data.url) {
      return { success: true, status: "completed", url: data.audio_url || data.url, model: model_id };
    }

    // If text response with lyrics, return it
    const textContent = typeof message?.content === "string" ? message.content : JSON.stringify(message?.content);
    console.log("Music text response:", textContent?.slice(0, 200));
    
    return { error: "Music generation did not return audio. Please try a different prompt.", fallback: true };
  } catch (e) {
    console.error("Music generation error:", e);
    if (e instanceof Error && e.message === "timeout") {
      return { error: "Music generation timed out. Please try again.", fallback: true };
    }
    return { error: "Music generation failed. Please try again.", fallback: true };
  }
}

// ─── MUSIC FALLBACK via LemonData ───
async function handleMusicLemon(supabase: any, key: any, prompt: string, settings: any, model_id: string) {
  const musicBody: Record<string, any> = { model: "suno_music", prompt };
  if (settings?.title) musicBody.title = settings.title;
  if (settings?.tags) musicBody.tags = settings.tags;

  const resp = await fetch(`${LEMON_BASE}/v1/music/generations`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${key.api_key}`, "Content-Type": "application/json" },
    body: JSON.stringify(musicBody),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("Music LemonData error:", resp.status, errText);
    if (resp.status === 401 || resp.status === 403 || resp.status === 402) {
      await blockLemonKey(supabase, key.id, `HTTP ${resp.status}`);
      return { retry: true };
    }
    return { error: "Music generation is temporarily unavailable.", fallback: true };
  }

  const data = await resp.json();
  const directUrl = data.audio_url || data.url || data.data?.[0]?.audio_url;
  if (directUrl) {
    await bumpLemonUsage(supabase, key);
    return { success: true, status: "completed", url: directUrl, model: model_id };
  }

  const taskId = data.id || data.task_id;
  if (!taskId) return { error: "No task ID returned", fallback: true };
  return { success: true, status: "pending", task_id: taskId, key_id: key.id };
}

// ─── POLL (LemonData music tasks) ───
async function handlePoll(supabase: any, key: any, taskId: string) {
  const resp = await fetch(`${LEMON_BASE}/v1/music/generations/${taskId}`, {
    headers: { "Authorization": `Bearer ${key.api_key}` },
  });
  if (!resp.ok) {
    return { success: false, status: "failed", error: "Could not check generation status" };
  }
  const d = await resp.json();
  if (d.status === "completed") {
    await bumpLemonUsage(supabase, key);
    return { success: true, status: "completed", url: d.audio_url || d.url || d.data?.[0]?.audio_url, video_url: d.video_url || null, title: d.title || null, lyrics: d.lyrics || null };
  }
  if (d.status === "failed") return { success: false, status: "failed", error: "Generation failed" };
  return { success: false, status: d.status || "processing" };
}

// ─── TTS: OpenRouter → LemonData fallback ───
async function handleTTS(supabase: any, lemonKey: any, prompt: string, settings: any, model_id: string) {
  const voice = settings?.voice || "nova";
  const speed = settings?.speed || 1;
  const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY");

  // 1) OpenRouter TTS (primary)
  if (OPENROUTER_KEY) {
    try {
      const orResp = await Promise.race([
        fetch("https://openrouter.ai/api/v1/audio/speech", {
          method: "POST",
          headers: { "Authorization": `Bearer ${OPENROUTER_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "openai/tts-1", input: prompt, voice, speed }),
        }),
        new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("timeout")), 20000)),
      ]) as Response;

      if (orResp.ok) {
        const ct = orResp.headers.get("content-type") || "";
        if (ct.includes("audio") || ct.includes("octet-stream")) {
          const buf = await orResp.arrayBuffer();
          return { success: true, url: `data:audio/mp3;base64,${base64Encode(buf)}`, model: model_id };
        }
        const data = await orResp.json();
        const url = data.url || data.audio_url || data.output?.url;
        if (url) return { success: true, url, model: model_id };
      } else {
        await orResp.text();
      }
    } catch (e) {
      console.error("OpenRouter TTS error:", e);
    }
  }

  // 2) LemonData TTS (fallback)
  try {
    const ttsBody: Record<string, any> = { input: prompt, model: "tts-1-hd", voice };
    if (speed) ttsBody.speed = speed;
    if (settings?.response_format) ttsBody.response_format = settings.response_format;

    const resp = await Promise.race([
      fetch(`${LEMON_BASE}/v1/audio/speech`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${lemonKey.api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify(ttsBody),
      }),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("timeout")), 25000)),
    ]) as Response;

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("LemonData TTS error:", resp.status, errText);
      if (resp.status === 401 || resp.status === 402 || resp.status === 403) {
        await blockLemonKey(supabase, lemonKey.id, `HTTP ${resp.status}`);
      }
      return { error: "Voice generation is temporarily unavailable.", fallback: true };
    }

    await bumpLemonUsage(supabase, lemonKey);
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("audio") || ct.includes("octet-stream")) {
      const buf = await resp.arrayBuffer();
      return { success: true, url: `data:audio/mp3;base64,${base64Encode(buf)}`, model: model_id };
    }

    const data = await resp.json();
    const url = data.url || data.audio_url || data.output?.url || data.data?.[0]?.url;
    return { success: true, url: url || null, data, model: model_id };
  } catch (e) {
    console.error("LemonData TTS error:", e);
    return { error: "Voice generation timed out. Please try again.", fallback: true };
  }
}

// ─── VOICE CHANGE via WaveSpeed ───
async function handleVoiceChange(supabase: any, prompt: string, settings: any, model_id: string) {
  const { data: wsKeys } = await supabase.from("api_keys").select("api_key, id").eq("service", "wavespeed").eq("is_active", true).limit(5);
  if (!wsKeys?.length) {
    return { error: "Voice change service is temporarily unavailable.", fallback: true };
  }
  const wsKey = wsKeys[Math.floor(Math.random() * wsKeys.length)];

  try {
    const resp = await Promise.race([
      fetch("https://api.wavespeed.ai/api/v2/voice/change", {
        method: "POST",
        headers: { "Authorization": `Bearer ${wsKey.api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          audio_url: settings?.audio_url || prompt,
          target_voice: settings?.target_voice || "default",
        }),
      }),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("timeout")), 30000)),
    ]) as Response;

    if (!resp.ok) {
      console.error("WaveSpeed voice change error:", resp.status);
      return { error: "Voice change is temporarily unavailable.", fallback: true };
    }

    const data = await resp.json();
    return { success: true, url: data.audio_url || data.url || data.output?.url, model: model_id };
  } catch (e) {
    console.error("WaveSpeed error:", e);
    return { error: "Voice change timed out. Please try again.", fallback: true };
  }
}

// ─── TRANSCRIPTION via Deepgram ───
async function handleTranscription(_supabase: any, prompt: string, settings: any, model_id: string) {
  const DEEPGRAM_KEY = Deno.env.get("DEEPGRAM_APIKEY");
  if (!DEEPGRAM_KEY) {
    return { error: "Transcription service is not configured.", fallback: true };
  }

  try {
    const audioUrl = settings?.audio_url || prompt;
    const lang = settings?.language || "ar";

    const resp = await Promise.race([
      fetch(`https://api.deepgram.com/v1/listen?model=nova-2&language=${lang}&smart_format=true&punctuate=true`, {
        method: "POST",
        headers: {
          "Authorization": `Token ${DEEPGRAM_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: audioUrl }),
      }),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("timeout")), 45000)),
    ]) as Response;

    if (!resp.ok) {
      console.error("Deepgram transcription error:", resp.status);
      return { error: "Transcription is temporarily unavailable.", fallback: true };
    }

    const data = await resp.json();
    const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
    return { success: true, transcript, model: model_id };
  } catch (e) {
    console.error("Deepgram error:", e);
    return { error: "Transcription timed out. Please try again.", fallback: true };
  }
}

// ─── NOISE REMOVAL via Deepgram ───
async function handleNoiseRemoval(_supabase: any, prompt: string, settings: any, model_id: string) {
  // Use OpenRouter whisper for noise-cleaned transcription, or just return cleaned audio
  const DEEPGRAM_KEY = Deno.env.get("DEEPGRAM_APIKEY");
  if (!DEEPGRAM_KEY) {
    return { error: "Audio processing service is not configured.", fallback: true };
  }

  // Deepgram's noise cancellation via enhanced model
  try {
    const audioUrl = settings?.audio_url || prompt;
    const resp = await Promise.race([
      fetch(`https://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true`, {
        method: "POST",
        headers: {
          "Authorization": `Token ${DEEPGRAM_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: audioUrl }),
      }),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("timeout")), 45000)),
    ]) as Response;

    if (!resp.ok) {
      return { error: "Audio processing is temporarily unavailable.", fallback: true };
    }

    const data = await resp.json();
    return { success: true, transcript: data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "", model: model_id };
  } catch (e) {
    return { error: "Audio processing timed out.", fallback: true };
  }
}

// ─── MAIN ───
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { model_id, prompt, type, settings, poll_task_id, poll_key_id } = await req.json();
    const supabase = initSupabase();

    // POLL MODE (LemonData music tasks)
    if (poll_task_id) {
      const key = await getLemonKey(supabase, poll_key_id);
      const result = await handlePoll(supabase, key, poll_task_id);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Text is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedModelId = String(model_id ?? "").replace(/-/g, "_").toLowerCase();
    const isMusic = type === "music" || normalizedModelId === "suno_music" || normalizedModelId === "ace_step_turbo" || normalizedModelId === "ace_step_base";

    if (isMusic) {
      // Try OpenRouter Lyria first
      const result = await handleMusic(supabase, prompt, settings, model_id);
      if (result.success) {
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Fallback to LemonData Suno
      console.log("OpenRouter music failed, falling back to LemonData");
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const key = await getLemonKey(supabase);
          const lemonResult = await handleMusicLemon(supabase, key, prompt, settings, model_id);
          if (lemonResult.retry) continue;
          return new Response(JSON.stringify(lemonResult), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch { continue; }
      }
      return new Response(JSON.stringify({ error: "Music generation is temporarily unavailable. Please try again later.", fallback: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route by type
    if (type === "voice_change") {
      const result = await handleVoiceChange(supabase, prompt, settings, model_id);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (type === "transcription") {
      const result = await handleTranscription(supabase, prompt, settings, model_id);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (type === "noise_removal") {
      const result = await handleNoiseRemoval(supabase, prompt, settings, model_id);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Default: TTS (OpenRouter → LemonData)
    const lemonKey = await getLemonKey(supabase);
    const result = await handleTTS(supabase, lemonKey, prompt, settings, model_id);
    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("generate-voice error:", e);
    const msg = e instanceof Error && e.message.includes("NO_") 
      ? "Voice service is temporarily unavailable. Please try again later." 
      : "Voice generation failed. Please try again.";
    return new Response(
      JSON.stringify({ error: msg, fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
