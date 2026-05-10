import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://2slides.com";

const REACT_TEMPLATES = new Set([
  "premium-megsy", "premium-glass-pitch", "premium-sketch-hand", "premium-cinema-3d",
  "premium-terminal-dev", "premium-magazine-fold", "premium-paper-origami",
  "premium-minimal-swiss", "premium-gradient-wave", "premium-glitch-art",
  "premium-landing-mouse", "premium-landing-scroll",
]);

const PALETTES: Record<string, { primary: string; accent: string; bg: string; fg: string }> = {
  "premium-megsy":         { primary: "#3b82f6", accent: "#ec4899", bg: "#08070d", fg: "#f8fafc" },
  "premium-glass-pitch":   { primary: "#3b82f6", accent: "#a855f7", bg: "#070b1f", fg: "#f8fafc" },
  "premium-sketch-hand":   { primary: "#1f2937", accent: "#ef4444", bg: "#fdf6e3", fg: "#1f2937" },
  "premium-cinema-3d":     { primary: "#06b6d4", accent: "#f43f5e", bg: "#000814", fg: "#ffffff" },
  "premium-terminal-dev":  { primary: "#00ff9c", accent: "#00b3ff", bg: "#0a0e14", fg: "#cdd9e5" },
  "premium-magazine-fold": { primary: "#dc2626", accent: "#0a0a0a", bg: "#fafaf7", fg: "#0a0a0a" },
  "premium-paper-origami": { primary: "#fb7185", accent: "#fbbf24", bg: "#fef3ec", fg: "#1f1147" },
  "premium-minimal-swiss": { primary: "#dc143c", accent: "#000000", bg: "#ffffff", fg: "#000000" },
  "premium-gradient-wave": { primary: "#f97316", accent: "#a855f7", bg: "#1e0a3c", fg: "#ffffff" },
  "premium-glitch-art":    { primary: "#ff006e", accent: "#3a86ff", bg: "#0a0a0a", fg: "#fbbf24" },
  "premium-landing-mouse": { primary: "#6366f1", accent: "#ec4899", bg: "#06060c", fg: "#f5f7ff" },
  "premium-landing-scroll":{ primary: "#0f172a", accent: "#f97316", bg: "#fafaf7", fg: "#0a0a0a" },
};

/* ============================================================
 * MULTI-MODEL OpenRouter chain (silent fallback)
 * Primary: z-ai/glm-4.5-air:free as required.
 * On 402/429/5xx → next model with same OPENROUTER_API_KEY.
 * ========================================================== */
const FILES_MODEL_CHAIN = [
  "z-ai/glm-4.5-air:free",
  "deepseek/deepseek-chat-v3.1:free",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.0-flash-001",
];

async function callAIWithFallback(
  messages: Array<{ role: string; content: string }>,
  opts: { jsonMode?: boolean } = {},
): Promise<string> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) throw new Error("OPENROUTER_API_KEY missing");

  const wantJson = !!opts.jsonMode;
  const finalMessages = wantJson
    ? [
        ...messages.slice(0, 1),
        { role: "system", content: "Return raw JSON only. No markdown fences. No prose." },
        ...messages.slice(1),
      ]
    : messages;

  let lastErr: unknown = null;
  for (const model of FILES_MODEL_CHAIN) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 60_000);
      const body: Record<string, unknown> = { model, messages: finalMessages };
      if (wantJson) body.response_format = { type: "json_object" };

      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://megsyai.com",
          "X-Title": "Megsy Files",
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      }).finally(() => clearTimeout(t));

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.warn(`[ai:${model}] ${r.status}: ${txt.slice(0, 160)}`);
        lastErr = new Error(`${r.status}`);
        continue;
      }
      const d = await r.json();
      const content = d?.choices?.[0]?.message?.content;
      if (!content) { lastErr = new Error("empty"); continue; }
      return content;
    } catch (e) {
      console.warn(`[ai:${model}] error`, e);
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("All providers failed");
}

function safeParseJson<T = unknown>(raw: string): T | null {
  try { return JSON.parse(raw) as T; } catch { /* fall through */ }
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]) as T; } catch { /* */ } }
  return null;
}

/* ============================================================
 * DEEP IMAGE SEARCH — Serper (Google Images) → Pexels → null
 * ========================================================== */
async function fetchSerperImage(query: string, key: string): Promise<string | null> {
  try {
    const r = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 5, safe: "active" }),
    });
    if (!r.ok) { console.warn("[serper-img] http", r.status); return null; }
    const d = await r.json();
    const list = d?.images;
    if (!Array.isArray(list)) return null;
    // Filter to https + reasonable dimensions
    const ok = list.find((it: { imageUrl?: string; imageWidth?: number }) =>
      it?.imageUrl && it.imageUrl.startsWith("https://") && (it.imageWidth ?? 800) >= 600
    );
    return ok?.imageUrl ?? list[0]?.imageUrl ?? null;
  } catch (e) {
    console.warn("[serper-img] error", e);
    return null;
  }
}

async function fetchPexelsImage(query: string, apiKey: string): Promise<string | null> {
  try {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query.slice(0, 100));
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", "landscape");
    const r = await fetch(url.toString(), { headers: { Authorization: apiKey } });
    if (!r.ok) { console.warn("[pexels] http", r.status, "for", query); return null; }
    const d = await r.json();
    const photo = d?.photos?.[0];
    return photo?.src?.large2x || photo?.src?.large || photo?.src?.original || null;
  } catch (e) {
    console.warn("[pexels] error", e);
    return null;
  }
}

function sanitizeQueryForSearch(q: string): string {
  return q
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, " ")
    .replace(/[\u0600-\u06FF\u0750-\u077F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/g, " ")
    .replace(/\s+/g, " ").trim();
}

async function deepImageSearch(query: string | undefined): Promise<string | null> {
  if (!query) return null;
  const cleaned = sanitizeQueryForSearch(query);
  if (!cleaned) return null;

  const serperKey = Deno.env.get("SERPER_API_KEY");
  const pexelsKey = Deno.env.get("PEXELS_API_KEY");

  const tries = [cleaned, cleaned.split(/\s+/).slice(0, 3).join(" "), cleaned.split(/\s+/)[0]]
    .filter((q, i, arr) => q && arr.indexOf(q) === i);

  for (const q of tries) {
    if (serperKey) {
      const url = await fetchSerperImage(q, serperKey);
      if (url) return url;
    }
    if (pexelsKey) {
      const url = await fetchPexelsImage(q, pexelsKey);
      if (url) return url;
    }
  }
  console.warn("[deep-image] no result for", query);
  return null;
}

function isMostlyEnglish(s: string): boolean {
  if (!s) return false;
  const latinChars = (s.match(/[A-Za-z]/g) || []).length;
  return latinChars >= Math.max(3, s.replace(/\s/g, "").length * 0.6);
}

/* ============================================================
 * Stage A: Outline
 * ========================================================== */
async function generateOutline(opts: {
  topic: string;
  content: string;
  pageCount: number;
}): Promise<{ title?: string; slides: RawSlide[]; language?: string; subtitle?: string }> {
  const { topic, content, pageCount } = opts;

  const lengthRule = pageCount > 0
    ? `Produce EXACTLY ${pageCount} slide entries.`
    : `Decide the optimal slide count: 8 for simple topics, 12-15 for standard, 18-25 for deep/complex. Min 8, max 25.`;

  const sys = `You are a presentation strategist. Output ONLY a JSON object — no markdown.

Schema:
{
  "title": "deck title (in user language)",
  "subtitle": "short subtitle",
  "language": "ar|en|fr|...",
  "slides": [
    {"type":"cover","title":"...","subtitle":"...","image_query":"3-5 ENGLISH visual keywords"},
    {"type":"section","title":"section name","kicker":"01","image_query":"english keywords"},
    {"type":"content","title":"slide title","image_query":"english keywords","focus":"1 sentence describing what this slide will explore in depth"},
    {"type":"quote","focus":"who and on which sub-topic"},
    {"type":"stats","title":"...","focus":"what kind of stats: percentages / growth / costs"},
    {"type":"closing","title":"Thank You","subtitle":"...","cta":"..."}
  ]
}

Rules:
- ${lengthRule}
- First slide MUST be "cover", last MUST be "closing".
- Mix types: insert a "section" every 4-6 slides; include >=1 "stats" and >=1 "quote" slide if length >= 10.
- "image_query" MUST be 3-5 visual ENGLISH keywords. NO arabic, NO chinese, NO punctuation other than spaces.
- "focus" is a brief instruction for the next stage — what the deep-content writer should expand. Be specific about the angle.
- Detect language from topic and put title/subtitle in THAT language.`;

  const userMsg = `Topic: ${topic}\n${content ? `Reference material:\n${content.slice(0, 6000)}` : ""}`;

  const raw = await callAIWithFallback(
    [{ role: "system", content: sys }, { role: "user", content: userMsg }],
    { jsonMode: true },
  );

  const outline = safeParseJson<{ title?: string; slides?: RawSlide[]; language?: string; subtitle?: string }>(raw)
    ?? { title: topic, slides: [] };
  if (!Array.isArray(outline.slides) || outline.slides.length === 0) {
    outline.slides = [{ type: "cover", title: topic }, { type: "closing", title: "Thank You" }];
  }
  return { ...outline, slides: outline.slides };
}

/* ============================================================
 * Stage B: Deep Content
 * ========================================================== */
type RawSlide = Record<string, unknown> & { type?: string; title?: string; body?: string; bullets?: string[] };

async function expandWithDeepContent(opts: {
  outline: { language?: string; slides: RawSlide[] };
  topic: string;
  content: string;
}): Promise<RawSlide[]> {
  const { outline, topic, content } = opts;
  const language = outline.language || "auto";

  const sys = `You are a senior research writer creating a presentation. Output ONLY a JSON object.

You are given an OUTLINE and you must EXPAND every slide with rich, factual content.

For each slide return the same fields PLUS:
- "title": polished slide title in the same language as outline
- "body": REQUIRED for content/section slides — 60-120 words, specific facts, NEVER empty.
- "bullets": REQUIRED for content slides — 4-6 bullets, 6-15 words each, concrete (NOT 2-word fragments).
- "stats": REQUIRED for stats slides — 3-5 {label, value} ("87%", "$2.4M", "12x growth").
- "quote": REQUIRED for quote slides — 15-30 word memorable quote tied to the topic.
- "attribution": REQUIRED for quote slides — plausible person + role.
- Keep "image_query" exactly as outline gives it (English).
- Keep "type", "kicker", "subtitle", "cta" as outline gives them.

Hard rules:
- Output language = ${language}.
- Use the reference material as ground truth; expand with widely-known facts when sparse.
- NEVER produce empty body or empty bullets for content/section slides.
- NEVER write filler ("More info coming", "TBD", "Lorem ipsum").
- Be specific: name people, products, dates, numbers, places when possible.

Return JSON: { "slides": [ {full slide object}, ... ] } in the SAME ORDER as outline.`;

  const userMsg = `Topic: ${topic}
Outline (expand each slide deeply):
${JSON.stringify({ slides: outline.slides }, null, 2)}

${content ? `Reference material:\n${content.slice(0, 8000)}` : ""}`;

  try {
    const raw = await callAIWithFallback(
      [{ role: "system", content: sys }, { role: "user", content: userMsg }],
      { jsonMode: true },
    );
    const parsed = safeParseJson<{ slides?: RawSlide[] }>(raw);
    if (parsed && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
      return outline.slides.map((o, i) => {
        const deep = parsed.slides![i] || {};
        return { ...o, ...deep, image_query: (deep.image_query as string) || (o.image_query as string) };
      });
    }
  } catch (e) {
    console.warn("[deep-content] failed:", e);
  }
  return outline.slides;
}

/* ============================================================
 * Empty-slide retry: re-generate any slide left blank
 * ========================================================== */
async function fillEmptySlides(slides: RawSlide[], topic: string, language: string): Promise<RawSlide[]> {
  const empties: { idx: number; slide: RawSlide }[] = [];
  slides.forEach((s, idx) => {
    const t = (s.type as string) ?? "content";
    if (t === "cover" || t === "closing") return;
    const hasBody = typeof s.body === "string" && s.body.trim().length > 30;
    const hasBullets = Array.isArray(s.bullets) && s.bullets.length >= 2;
    const hasQuote = typeof (s as { quote?: string }).quote === "string" && (s as { quote: string }).quote.length > 10;
    const hasStats = Array.isArray((s as { stats?: unknown[] }).stats) && ((s as { stats: unknown[] }).stats.length > 0);
    if (!hasBody && !hasBullets && !hasQuote && !hasStats) {
      empties.push({ idx, slide: s });
    }
  });

  if (empties.length === 0) return slides;
  console.log(`[fill-empty] regenerating ${empties.length} empty slide(s)`);

  const sys = `You fill in blank presentation slides with rich, factual content. Return ONLY JSON: {"slides":[{"i":<index>,"body":"60-120 words","bullets":["...","...","...","...","..."]}]}. Language: ${language}. Be specific and informative.`;
  const userMsg = `Topic: ${topic}\n\nFill these slides:\n${empties.map(e => `Index ${e.idx}: title="${e.slide.title}" type=${e.slide.type}`).join("\n")}`;

  try {
    const raw = await callAIWithFallback(
      [{ role: "system", content: sys }, { role: "user", content: userMsg }],
      { jsonMode: true },
    );
    const parsed = safeParseJson<{ slides?: { i: number; body?: string; bullets?: string[] }[] }>(raw);
    if (parsed?.slides) {
      parsed.slides.forEach(fill => {
        const target = slides[fill.i];
        if (target) {
          if (fill.body) target.body = fill.body;
          if (fill.bullets?.length) target.bullets = fill.bullets;
        }
      });
    }
  } catch (e) {
    console.warn("[fill-empty] failed:", e);
  }
  return slides;
}

/* ============================================================
 * English image-query enforcement
 * ========================================================== */
async function ensureEnglishQueries(slides: RawSlide[]): Promise<void> {
  const offenders: { idx: number; q: string }[] = [];
  slides.forEach((s, idx) => {
    const q = s.image_query as string | undefined;
    if (q && !isMostlyEnglish(q)) offenders.push({ idx, q });
  });
  if (offenders.length === 0) return;

  const sys = `Translate each phrase into 3-5 visual ENGLISH keywords for image search. Output ONLY JSON: {"translations":[{"i":0,"q":"english keywords"}]}.`;
  const userMsg = `Translate each:\n${offenders.map((o, i) => `${i}. ${o.q}`).join("\n")}`;

  try {
    const raw = await callAIWithFallback(
      [{ role: "system", content: sys }, { role: "user", content: userMsg }],
      { jsonMode: true },
    );
    const parsed = safeParseJson<{ translations?: { i: number; q: string }[] }>(raw);
    parsed?.translations?.forEach(t => {
      const slot = offenders[t.i];
      if (slot && t.q) slides[slot.idx].image_query = t.q;
    });
  } catch (e) {
    console.warn("[image-query] translation failed:", e);
  }
}

/* ============================================================
 * Main two-stage builder
 * ========================================================== */
async function generateReactSlideDeck(opts: {
  topic: string;
  content: string;
  templateId: string;
  pageCount: number;
}) {
  const { topic, content, templateId, pageCount } = opts;
  const palette = PALETTES[templateId] ?? PALETTES["premium-glass-pitch"];

  const outline = await generateOutline({ topic, content, pageCount });
  let deepSlides = await expandWithDeepContent({ outline, topic, content });
  await ensureEnglishQueries(deepSlides);
  deepSlides = await fillEmptySlides(deepSlides, topic, outline.language ?? "auto");

  const deck = {
    title: outline.title || topic,
    subtitle: outline.subtitle,
    language: outline.language,
    templateId,
    palette,
    slides: deepSlides,
  };

  // Inject deep-search images in parallel.
  await Promise.all(deck.slides.map(async (slide: RawSlide) => {
    const q = slide.image_query as string | undefined;
    if (q && !slide.image) {
      const url = await deepImageSearch(q);
      if (url) (slide as { image?: string }).image = url;
    }
  }));

  return deck;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, content, templateId, tier, userId, pageCount } = await req.json();
    if (!topic) throw new Error("Topic is required");

    let pages = 0;
    if (typeof pageCount === "number" && Number.isFinite(pageCount) && pageCount > 0) {
      pages = Math.max(0, Math.min(60, Math.floor(pageCount)));
    }

    if (templateId && REACT_TEMPLATES.has(templateId)) {
      try {
        const deck = await generateReactSlideDeck({
          topic, content: content || "", templateId, pageCount: pages,
        });

        if (userId) {
          try {
            const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
            await sb.rpc("deduct_credits", { p_user_id: userId, p_amount: 2, p_action_type: "slides_premium", p_description: "Premium React slides" });
          } catch (e) { console.error("Credit deduction failed:", e); }
        }

        return new Response(JSON.stringify({
          success: true,
          engine: "react-native",
          deck,
          slide_count: deck.slides?.length ?? 0,
          title: deck.title || topic,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        console.error("react-native deck error:", e);
        return new Response(JSON.stringify({ success: false, fallback: true, error: "Premium deck generation failed." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // -------- Legacy 2Slides path --------
    const apiKey = Deno.env.get("TWOSLIDES_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, fallback: true, error: "Slides service not configured." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const isPro = tier === "pro";
    const authHeaders = { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" };

    if (isPro) {
      const body: Record<string, unknown> = {
        userInput: content || topic, responseLanguage: "Auto", aspectRatio: "16:9", resolution: "2K",
        page: pages, contentDetail: "standard",
        referenceImageUrl: "https://2slides.com/_next/image?url=/login_preview/st-1763716811881-gt30ikwgk_slide1.webp&w=640&q=75",
      };
      const resp = await fetch(`${BASE_URL}/api/v1/slides/create-like-this`, {
        method: "POST", headers: authHeaders, body: JSON.stringify(body),
      });
      if (!resp.ok) {
        return new Response(JSON.stringify({ success: false, fallback: true, error: "Pro slide generation failed." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await resp.json();
      const downloadUrl = data?.data?.downloadUrl || data?.downloadUrl;
      const slideCount = data?.data?.slidePageCount || data?.data?.successCount || pages || 10;
      if (data?.success && downloadUrl) {
        if (userId) {
          try {
            const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
            await sb.rpc("deduct_credits", { p_user_id: userId, p_amount: 2, p_action_type: "slides_pro", p_description: "Slides Pro generation" });
          } catch { /* ignore */ }
        }
        return new Response(JSON.stringify({ success: true, download_url: downloadUrl, slide_count: slideCount, title: topic }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: false, fallback: true, error: "Pro generation failed." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      const body: Record<string, unknown> = { userInput: content || topic, responseLanguage: "Auto", mode: "sync" };
      if (templateId) body.themeId = templateId;
      if (pages > 0) body.page = pages;

      const resp = await fetch(`${BASE_URL}/api/v1/slides/generate`, {
        method: "POST", headers: authHeaders, body: JSON.stringify(body),
      });
      if (!resp.ok) {
        return new Response(JSON.stringify({ success: false, fallback: true, error: "Slide generation failed." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await resp.json();
      const downloadUrl = data?.data?.downloadUrl || data?.downloadUrl;
      const slideCount = data?.data?.slidePageCount || pages || 10;
      const jobId = data?.data?.jobId;

      if (data?.success && downloadUrl) {
        return new Response(JSON.stringify({ success: true, download_url: downloadUrl, slide_count: slideCount, title: topic }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (data?.success && jobId && !downloadUrl) {
        const maxPolls = pages > 30 ? 20 : 12;
        for (let i = 0; i < maxPolls; i++) {
          await new Promise(r => setTimeout(r, 15000));
          try {
            const jobResp = await fetch(`${BASE_URL}/api/v1/jobs/${jobId}`, { headers: authHeaders });
            if (!jobResp.ok) continue;
            const jobData = await jobResp.json();
            const jd = jobData?.data || jobData;
            if (jd.status === "success") {
              return new Response(JSON.stringify({ success: true, download_url: jd.downloadUrl, slide_count: jd.slidePageCount || slideCount, title: topic }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            if (jd.status === "failed") break;
          } catch { /* keep polling */ }
        }
      }
      return new Response(JSON.stringify({ success: false, fallback: true, error: "Slide generation did not return a download." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    console.error("generate-slides error:", e);
    return new Response(JSON.stringify({ success: false, fallback: true, error: "Presentation generation failed." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
