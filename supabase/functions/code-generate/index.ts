import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LEMONDATA_URL = "https://api.lemondata.cc/v1/chat/completions";
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const PRIMARY_MODEL = "claude-haiku-4-5";
const FALLBACK_MODEL = "google/gemini-3-flash-preview";
const CACHE_TTL = 5 * 60 * 1000;

let cachedKey: string | null = null;
let cacheTime = 0;

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function getLemonDataKey(excludeKey?: string): Promise<string | null> {
  if (cachedKey && Date.now() - cacheTime < CACHE_TTL && cachedKey !== excludeKey) {
    return cachedKey;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("lemondata_keys")
    .select("api_key")
    .eq("is_active", true)
    .eq("is_blocked", false)
    .order("usage_count", { ascending: true })
    .limit(10);

  if (error) throw new Error(`Failed to load LemonData keys: ${error.message}`);

  const availableKeys = (data ?? [])
    .map((row) => row.api_key)
    .filter((key): key is string => Boolean(key) && key !== excludeKey);

  if (availableKeys.length === 0) {
    cachedKey = null;
    return null;
  }

  const key = availableKeys[0];
  cachedKey = key;
  cacheTime = Date.now();

  supabase
    .from("lemondata_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("api_key", key)
    .then(() => {});

  return key;
}

function clearCachedKey(key?: string) {
  if (!key || cachedKey === key) {
    cachedKey = null;
    cacheTime = 0;
  }
}

function blockKey(key: string, reason: string) {
  clearCachedKey(key);
  const supabase = createServiceClient();
  supabase
    .from("lemondata_keys")
    .update({
      is_active: false,
      is_blocked: true,
      block_reason: reason,
      last_error_at: new Date().toISOString(),
    })
    .eq("api_key", key)
    .then(() => {});
}

function isModelAvailabilityError(errorText: string) {
  return /(model_not_found|model_disabled|Model price not configured|Use GET \/v1\/models|price not configured)/i.test(errorText);
}

function buildPromptMessages(messages: Array<{ role: string; content: string }>) {
  const buildPrompt = `You are Megsy Code, an expert full-stack AI programming agent. Generate a complete React+Vite project with Tailwind CSS.

IMPORTANT BEHAVIOR:
- Mirror the user's language and dialect exactly. If they write in Egyptian Arabic, respond in Egyptian Arabic. If English, respond in English.
- Before generating code, mentally plan which pages, components, and features to build.
- Generate clean, production-ready, fully responsive code.

OUTPUT FORMAT (CRITICAL - follow exactly):
For each file, output:
===FILE: path/to/file===
file content here
===END===

Rules:
- Use React with JSX (.jsx files)
- Use react-router-dom for multi-page apps (BrowserRouter)
- Tailwind CSS for all styling
- Keep files in src/ directory
- Include proper error handling and responsive design
- Do NOT include package.json, vite.config.js, index.html, src/main.jsx, src/index.css, tailwind.config.js, postcss.config.js unless you need to modify defaults
- Make the UI modern, clean, and fully responsive
- Include all necessary components, pages, hooks, and utilities
- Use semantic HTML and accessible patterns
- Do NOT wrap output in markdown code blocks
- Output ONLY the ===FILE=== blocks, no other text`;

  return [
    { role: "system", content: buildPrompt },
    ...messages.map((message) => ({ role: message.role, content: message.content })),
    { role: "user", content: "Build the project now. Output only ===FILE: path=== blocks." },
  ];
}

async function callLemonDataBuild(apiKey: string, messages: Array<{ role: string; content: string }>) {
  return fetch(LEMONDATA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: PRIMARY_MODEL,
      messages,
      stream: true,
      max_tokens: 12000,
    }),
  });
}

async function callLovableFallback(messages: Array<{ role: string; content: string }>) {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) return null;

  return fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: FALLBACK_MODEL,
      messages,
      stream: true,
      max_tokens: 12000,
    }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, action } = await req.json();

    if (action !== "build") {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages must be a non-empty array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const promptMessages = buildPromptMessages(messages);
    let apiKey = await getLemonDataKey();
    let lastError = "";

    for (let attempt = 0; attempt < 3 && apiKey; attempt++) {
      const response = await callLemonDataBuild(apiKey, promptMessages);
      if (response.ok) {
        return new Response(response.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      const errorText = await response.text();
      lastError = `LemonData API error ${response.status}: ${errorText}`;

      if (isModelAvailabilityError(errorText)) {
        clearCachedKey(apiKey);
        break;
      }

      if (response.status === 401 || response.status === 403) {
        blockKey(apiKey, `API error ${response.status}`);
      } else {
        clearCachedKey(apiKey);
      }

      if (response.status !== 401 && response.status !== 403 && response.status !== 429) {
        break;
      }

      apiKey = await getLemonDataKey(apiKey);
    }

    const fallbackResponse = await callLovableFallback(promptMessages);
    if (fallbackResponse?.ok) {
      return new Response(fallbackResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    if (fallbackResponse && !fallbackResponse.ok) {
      const fallbackError = await fallbackResponse.text();
      throw new Error(`Fallback AI error ${fallbackResponse.status}: ${fallbackError}`);
    }

    throw new Error(lastError || "No available model could handle code generation");
  } catch (e) {
    console.error("code-generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});