// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SLIDE_SYSTEM_PROMPT, CONTENT_PATTERNS } from "./slidePrompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LANDING_SYSTEM_PROMPT = `You are an elite landing page designer + frontend engineer.
Generate a single, complete, BEAUTIFUL React component for a marketing landing page based on the user's idea.

STRICT OUTPUT RULES:
- Output ONLY raw JSX code, no markdown fences, no explanations.
- Define one component named LandingPage and end with: ReactDOM.createRoot(document.getElementById('root')).render(<LandingPage />);
- Available globals (already loaded): React, ReactDOM, framerMotion (use as: const { motion, AnimatePresence } = framerMotion), lucideReact (use as: const { ArrowRight, Star, Check, Menu, X, ... } = lucideReact).
- Use Tailwind CSS classes for ALL styling (Tailwind CDN is loaded).
- Use modern, bold, creative design.
- Make it fully responsive (mobile-first).

Begin output with: const { useState, useEffect, useRef } = React;`;

function compileToHtml(jsx: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<script src="https://cdn.tailwindcss.com"></script>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/framer-motion@11.0.0/dist/framer-motion.js"></script>
<script src="https://unpkg.com/lucide-react@0.400.0/dist/umd/lucide-react.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>html,body,#root{margin:0;padding:0;min-height:100%;}</style>
</head>
<body>
<div id="root"></div>
<script>
  window.framerMotion = window.framerMotion || window.Motion || window.FramerMotion || {};
  window.lucideReact  = window.lucideReact  || window.lucide      || window.LucideReact  || {};
</script>
<script type="text/babel" data-presets="react">
try {
${jsx}
} catch(e) {
  document.getElementById('root').innerHTML = '<pre style="padding:20px;color:red;font-family:monospace;white-space:pre-wrap;">'+(e && e.stack || e)+'</pre>';
}
</script>
</body>
</html>`;
}

function extractCode(raw: string): string {
  const fence = raw.match(/```(?:jsx?|tsx?|javascript|js)?\s*([\s\S]*?)```/);
  return (fence ? fence[1] : raw).trim();
}

function extractHtml(raw: string): string {
  const fence = raw.match(/```(?:html)?\s*([\s\S]*?)```/i);
  let s = (fence ? fence[1] : raw).trim();
  const i = s.search(/<!DOCTYPE|<html/i);
  if (i > 0) s = s.slice(i);
  return s.trim();
}

/** Strip emoji + icon-font glyphs the AI may sneak in. */
function stripEmojis(html: string): string {
  // unicode emoji ranges
  return html.replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{2B00}-\u{2BFF}]|[\u{1F000}-\u{1F2FF}]/gu, "");
}

function buildImageQuery(prompt: string): string {
  // Keep the user's original wording (Arabic or otherwise) — Firecrawl/Google
  // image search supports multilingual queries far better than our hand-mapped
  // English bucket. Just trim to a reasonable length.
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 180) || "documentary photography";
}

/** Optional: ask a tiny LLM to convert an Arabic/long brief into 4-6 English
 * image-search keywords. Cheap (Gemini Flash Lite, ~30 output tokens) and
 * massively improves Firecrawl image relevance for non-English prompts. */
async function translateToImageKeywords(prompt: string): Promise<string> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) return "";
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        max_tokens: 40,
        temperature: 0,
        messages: [
          { role: "system", content: "You convert any user brief into 4-6 specific English image-search keywords for finding the most relevant real photos. Include proper nouns (people, places, brands) transliterated to English. Output ONLY the keywords, no quotes, no punctuation other than spaces." },
          { role: "user", content: prompt.slice(0, 500) },
        ],
      }),
    });
    if (!r.ok) return "";
    const j = await r.json();
    const text = String(j?.choices?.[0]?.message?.content || "").trim();
    return text.replace(/[\n"]+/g, " ").slice(0, 160);
  } catch { return ""; }
}

async function fetchImagesFromFirecrawl(query: string): Promise<Array<{ url: string; alt: string }>> {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) return [];
  try {
    const resp = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 18, sources: ["images"] }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    const items = (data?.data?.images || data?.images || data?.data || []) as any[];
    const collected: Array<{ url: string; alt: string }> = [];
    for (const it of items) {
      const url = it?.imageUrl || it?.url || it?.src;
      if (url && /^https?:\/\//.test(url) && !collected.find((c) => c.url === url)) {
        collected.push({ url, alt: it?.title || it?.alt || query });
      }
    }
    return collected.slice(0, 18);
  } catch {
    return [];
  }
}

async function fetchImagesFromPexels(query: string): Promise<Array<{ url: string; alt: string }>> {
  const apiKey = Deno.env.get("PEXELS_API_KEY");
  if (!apiKey) return [];
  try {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "18");
    url.searchParams.set("orientation", "landscape");
    const resp = await fetch(url.toString(), { headers: { Authorization: apiKey } });
    if (!resp.ok) return [];
    const data = await resp.json();
    return ((data?.photos || []) as any[]).map((p) => ({
      url: p?.src?.large2x || p?.src?.large || p?.src?.original,
      alt: p?.alt || query,
    })).filter((p) => p.url).slice(0, 18);
  } catch {
    return [];
  }
}

async function fetchImageUrls(prompt: string): Promise<Array<{ url: string; alt: string }>> {
  const original = buildImageQuery(prompt);
  const isArabic = /[\u0600-\u06FF]/.test(prompt);
  const [fcOriginal, englishKeywords] = await Promise.all([
    fetchImagesFromFirecrawl(original),
    isArabic ? translateToImageKeywords(prompt) : Promise.resolve(""),
  ]);
  let collected = fcOriginal;
  if (collected.length < 10 && englishKeywords) {
    const fcEn = await fetchImagesFromFirecrawl(englishKeywords);
    collected = [...collected, ...fcEn.filter((p) => !collected.find((c) => c.url === p.url))];
  }
  if (collected.length >= 10) return collected.slice(0, 18);
  const pxQuery = englishKeywords || original;
  const px = await fetchImagesFromPexels(pxQuery);
  const merged = [...collected, ...px.filter((p) => !collected.find((c) => c.url === p.url))];
  while (merged.length < 14) {
    const seed = Math.floor(Math.random() * 100000) + merged.length;
    merged.push({ url: `https://picsum.photos/seed/${seed}/1600/900`, alt: pxQuery });
  }
  return merged.slice(0, 18);
}

/**
 * Compress a full template HTML down to its visual DNA so we don't ship
 * 100KB+ of markup to the model. We keep <head> CSS / fonts / scripts and
 * a small body sample so the model can mimic the design system, then it
 * generates fresh long-form content from scratch.
 */
function compressTemplate(html: string, maxChars = 3500): string {
  if (!html) return "";

  // Extract Google Fonts <link> tags (cheap, high-signal).
  const fontLinks = (html.match(/<link[^>]*fonts\.googleapis[^>]*>/gi) || []).join("\n");

  // Extract CSS custom properties (color tokens, radii) and body font rules.
  const styleBlocks = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  const allCss = styleBlocks.map((s) => s.replace(/<\/?style[^>]*>/gi, "")).join("\n");
  const rootVars = (allCss.match(/:root\s*\{[\s\S]*?\}/g) || []).join("\n");
  const bodyRules = (allCss.match(/(?:^|[^.\w-])body\s*\{[\s\S]*?\}/g) || []).join("\n");
  const fontFaceRules = (allCss.match(/@font-face\s*\{[\s\S]*?\}/g) || []).join("\n");

  const dna = [
    "<!-- TEMPLATE VISUAL DNA (color tokens + fonts only — recreate sections from scratch using these) -->",
    fontLinks,
    "<style>",
    fontFaceRules,
    rootVars,
    bodyRules,
    "</style>",
  ].filter(Boolean).join("\n").slice(0, maxChars);

  return dna || html.slice(0, maxChars);
}

function normalizeSlidesHtml(html: string, images: Array<{ url: string; alt: string }>, imageQuery: string): string {
  let out = html.trim();
  if (!/^\s*<!doctype/i.test(out) && !/^\s*<html/i.test(out)) out = `<!DOCTYPE html>\n${out}`;
  // If model never opened a <body> (e.g. drowned in <style>), append an empty body so the
  // gallery + section fallbacks below have a place to inject content.
  if (!/<body\b/i.test(out)) out = out + "\n<body></body>";
  if (!/<\/body>/i.test(out)) out = out + "\n</body>";
  if (!/<\/html>/i.test(out)) out = out + "\n</html>";
  out = out.replace(/<header\b[\s\S]*?<\/header>/gi, "");
  out = out.replace(/<nav\b[\s\S]*?<\/nav>/gi, "");
  out = out.replace(/<footer\b[\s\S]*?<\/footer>/gi, "");
  out = out.replace(/<button\b[\s\S]*?<\/button>/gi, "");
  out = out.replace(/<a\b(?![^>]*href=["']#)[\s\S]*?<\/a>/gi, "");

  const fallbackImages = images.length ? images : Array.from({ length: 14 }, (_, i) => ({
    url: `https://picsum.photos/seed/${imageQuery}-${i}/1600/900`,
    alt: imageQuery,
  }));
  let imageIndex = 0;
  out = out.replace(/<img\b([^>]*?)>/gi, (match, attrs) => {
    const picked = fallbackImages[imageIndex % fallbackImages.length];
    imageIndex++;
    const cleanedAttrs = String(attrs)
      .replace(/\s(?:src|srcset|data-src|data-lazy-src|alt)=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/\sloading=("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    const alt = String(picked.alt || imageQuery).replace(/"/g, "&quot;");
    return `<img${cleanedAttrs} src="${picked.url}" alt="${alt}" loading="lazy">`;
  });

  const imgCount = (out.match(/<img\b/gi) || []).length;
  if (imgCount < 10 && /<\/body>/i.test(out)) {
    const needed = 10 - imgCount;
    const gallery = `<section class="slide-media-gallery" style="padding:8rem 6vw;display:grid;gap:2rem;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));">${Array.from({ length: needed }, (_, i) => {
      const picked = fallbackImages[(imageIndex + i) % fallbackImages.length];
      const alt = String(picked.alt || imageQuery).replace(/"/g, "&quot;");
      return `<figure style="margin:0;aspect-ratio:16/10;overflow:hidden;border-radius:24px;"><img src="${picked.url}" alt="${alt}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;"></figure>`;
    }).join("")}</section>`;
    out = out.replace(/<\/body>/i, `${gallery}\n</body>`);
  }

  const hardeningCss = `<style id="megsy-slide-hardening">
html,body{min-height:100%;max-width:100vw;overflow-x:hidden;}
*,*::before,*::after{max-width:100%;}
img,video,svg,picture{max-width:100%;height:auto;display:block;}
section{position:relative;max-width:100vw;overflow-x:hidden;}
header,nav,footer,button{display:none!important;}
table{display:block;max-width:100%;overflow-x:auto;}
pre,code{white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;}
@media (max-width: 640px){
  body{font-size:16px;}
  [class*="text-9xl"],[class*="text-8xl"]{font-size:clamp(2.5rem,11vw,5rem)!important;line-height:1.05!important;}
  [class*="text-7xl"],[class*="text-6xl"]{font-size:clamp(2rem,9vw,3.5rem)!important;line-height:1.1!important;}
  [class*="text-5xl"]{font-size:clamp(1.75rem,7.5vw,2.75rem)!important;line-height:1.15!important;}
  [class*="text-4xl"]{font-size:clamp(1.5rem,6.5vw,2.25rem)!important;line-height:1.2!important;}
  [class*="py-48"],[class*="py-40"],[class*="py-36"],[class*="py-32"]{padding-top:4rem!important;padding-bottom:4rem!important;}
  [class*="py-24"],[class*="py-20"]{padding-top:3rem!important;padding-bottom:3rem!important;}
  [class*="px-20"],[class*="px-16"],[class*="px-12"]{padding-left:1.25rem!important;padding-right:1.25rem!important;}
  [class*="grid-cols-2"],[class*="grid-cols-3"],[class*="grid-cols-4"],[class*="grid-cols-5"],[class*="grid-cols-6"]{grid-template-columns:1fr!important;}
  [class*="gap-16"],[class*="gap-20"],[class*="gap-24"]{gap:1.5rem!important;}
  [style*="grid-template-columns"]{grid-template-columns:1fr!important;}
  [style*="writing-mode"]{writing-mode:horizontal-tb!important;}
  [class*="h-screen"]{min-height:80vh!important;height:auto!important;}
  .slide-media-gallery{padding:3rem 1.25rem!important;grid-template-columns:1fr!important;}
}
@media (max-width: 900px){
  [class*="grid-cols-3"],[class*="grid-cols-4"],[class*="grid-cols-5"]{grid-template-columns:repeat(2,minmax(0,1fr))!important;}
}
</style>`;
  out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, `${hardeningCss}\n</head>`) : out.replace(/<body/i, `<head>${hardeningCss}</head><body`);
  return out;
}



Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser(token);
    const user = userData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json();
    const prompt: string = String(body?.prompt || "").slice(0, 4000);
    const kind: string = String(body?.kind || "site");
    const isSlides = kind === "slides";
    const templateName: string = String(body?.templateName || body?.template || "");
    const templateId: string = String(body?.template || "");
    const templateFolder: string = String(body?.templateFolder || "");
    const rawTemplateHtml: string = String(body?.templateHtml || "");
    const category: string = String(body?.category || "premium");
    if (isSlides && !rawTemplateHtml) throw new Error("templateHtml is required for slides");

    // ─── PREMIUM DAILY LIMIT (3 / day) ─────────────────────────────
    if (isSlides && category === "premium") {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("premium_usage")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("used_at", since);
      if ((count ?? 0) >= 3) {
        return new Response(JSON.stringify({
          error: "PREMIUM_LIMIT_REACHED",
          message: "لقد وصلت إلى الحد اليومي (3) لقوالب Premium. جرّب القوالب العادية أو عُد غدًا.",
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await admin.from("premium_usage").insert({ user_id: user.id, template_id: templateId });
    }

    const imageQuery = isSlides ? buildImageQuery(prompt) : "";
    const imageUrls = isSlides ? await fetchImageUrls(prompt) : [];


    // ─── TOKEN GUARD ───────────────────────────────────────────────
    // Compress the template HTML to ~9KB of visual DNA so we don't ship
    // 100KB+ to the model. Combined with smaller output target this keeps
    // total request well under 30K tokens (vs 100K+ before).
    const templateHtml = isSlides ? compressTemplate(rawTemplateHtml, 3500) : rawTemplateHtml;

    // FREE strong model from OpenRouter (1M ctx, no per-token cost).
    // Falls back automatically inside the model chain on the gateway.
    // Cheap & strong: Gemini 2.5 Flash Lite (~$0.10/M output, 1M ctx).
    const model: string = body?.model || "google/gemini-2.5-flash-lite";
    const requestedSlideCount = Math.max(12, Math.min(20, Number(body?.slideCount) || 14));
    const requestedDepth = Math.max(3, Math.min(5, Number(body?.contentDepth) || 4));
    const maxOutputTokens = isSlides
      ? Math.min(48000, Math.max(28000, requestedSlideCount * (1400 + requestedDepth * 320)))
      : 9000;
    if (!prompt) throw new Error("prompt is required");

    const { data: site, error: insErr } = await admin
      .from("generated_sites")
      .insert({
        user_id: user.id,
        prompt,
        title: prompt.slice(0, 80),
        model_used: model,
        status: "generating",
      })
      .select()
      .single();
    if (insErr) throw insErr;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (obj: unknown) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

        send({ siteId: site.id });
        send({ step: "starting", message: isSlides ? "🎯 Preparing slide deck" : "Generating site" });

        try {
          send({ step: "outlining", message: "📐 Designing layout & content patterns" });

          const systemPrompt = isSlides
            ? `${SLIDE_SYSTEM_PROMPT}\n\n## CONTENT PATTERN LIBRARY (pick freely, mix many per page)\n${CONTENT_PATTERNS}`
            : LANDING_SYSTEM_PROMPT;

          const userPrompt = isSlides
            ? [
                `USER BRIEF:\n${prompt}`,
                `\nREQUESTED SLIDE COUNT: ${requestedSlideCount}`,
                `\nCONTENT DEPTH (1-5): ${requestedDepth}`,
                `\nTEMPLATE LOCK: You MUST use this exact chosen template identity. Do not switch styles.`,
                `TEMPLATE ID/FOLDER: ${templateFolder || templateName}`,
                `TEMPLATE NAME: ${templateName}`,
                `\nIMAGE TOPIC: ${imageQuery}`,
                imageUrls.length
                  ? `\nAPPROVED IMAGE URLS (use these exact working URLs before any other source, keep them relevant to the brief):\n${imageUrls.map((img, i) => `${i + 1}. ${img.url} — ALT: ${img.alt}`).join("\n")}`
                  : `\nIMAGE FALLBACK: use https://source.unsplash.com/1600x900/?${encodeURIComponent(imageQuery)} with varied relevant keywords.`,
                `\nTEMPLATE VISUAL DNA (head/CSS + first section — REUSE the styles, fonts, color palette and design language. EXPAND the body into 12-20 distinct sections of fresh content):\n\n${templateHtml}`,
              ].join("\n")
            : prompt;

          send({ step: "writing", message: "✍️ Writing slides..." });

          const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": SUPABASE_URL,
              "X-Title": isSlides ? "Megsy Slide Generator" : "Lovable Landing Generator",
            },
            body: JSON.stringify({
              model,
              stream: true,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              temperature: isSlides ? 0.45 : 0.8,
              max_tokens: maxOutputTokens,
            }),
          });

          if (!orRes.ok || !orRes.body) {
            const errText = await orRes.text();
            throw new Error(`OpenRouter ${orRes.status}: ${errText.slice(0, 500)}`);
          }

          const decoder = new TextDecoder();
          let fullText = "";
          let buffer = "";
          let chunks = 0;

          const reader = orRes.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx: number;
            while ((idx = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, idx).trim();
              buffer = buffer.slice(idx + 1);
              if (!line || line.startsWith(":")) continue;
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullText += delta;
                  chunks++;
                  send({ delta });
                  if (chunks % 40 === 0) {
                    send({ step: "writing_progress", message: `✍️ ${fullText.length} chars written...` });
                  }
                }
              } catch { /* partial */ }
            }
          }

          send({ step: "finalizing", message: "🧹 Cleaning output (stripping emojis/buttons)" });

          let html: string;
          let stored: string;
          if (isSlides) {
            html = extractHtml(fullText);
            html = stripEmojis(html);
            if (!html || html.length < 200) throw new Error("Model returned empty HTML");
            html = normalizeSlidesHtml(html, imageUrls, imageQuery);
            stored = html;
          } else {
            stored = extractCode(fullText);
            html = compileToHtml(stored);
          }

          await admin.from("generated_sites").update({
            jsx_code: stored,
            html_compiled: html,
            status: "completed",
            tokens_used: Math.ceil(fullText.length / 4),
          }).eq("id", site.id);

          send({ step: "done", message: "✅ Done", done: true, siteId: site.id });
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        } catch (e) {
          await admin.from("generated_sites").update({
            status: "failed",
            error_message: String(e).slice(0, 500),
          }).eq("id", site.id);
          send({ error: String(e), step: "error" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    console.error("generate-site error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
