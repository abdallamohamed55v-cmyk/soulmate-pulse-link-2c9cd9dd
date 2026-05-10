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

/** Lightweight web-search to ground the slides in fresh facts. */
async function researchTopic(prompt: string, key: string): Promise<string> {
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash:online",
        messages: [
          {
            role: "system",
            content:
              "You are a research assistant. Given a slide-deck topic, search the web and return a tight, factual brief (under 1200 words) with: key facts, current numbers/statistics with sources, 3-5 notable examples or case studies, and a recommended outline of 8-12 sections. Plain text only, no markdown.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });
    if (!r.ok) return "";
    const j = await r.json();
    return String(j.choices?.[0]?.message?.content || "").slice(0, 6000);
  } catch {
    return "";
  }
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
    const enableSearch: boolean = body?.search !== false; // default true for slides
    const templateName: string = String(body?.templateName || body?.template || "");
    const templateHtml: string = String(body?.templateHtml || "");
    if (isSlides && !templateHtml) throw new Error("templateHtml is required for slides");

    const model: string = body?.model || (isSlides ? "google/gemini-2.5-flash" : "deepseek/deepseek-chat-v3.1");
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
          let researchBrief = "";
          if (isSlides && enableSearch) {
            send({ step: "research", message: "🔎 Searching the web for fresh facts..." });
            researchBrief = await researchTopic(prompt, OPENROUTER_API_KEY);
            if (researchBrief) {
              send({ step: "research_done", message: `✅ Research complete (${researchBrief.length} chars)` });
            } else {
              send({ step: "research_skipped", message: "ℹ️ Skipped web research" });
            }
          }

          send({ step: "outlining", message: "📐 Designing layout & content patterns" });

          const systemPrompt = isSlides
            ? `${SLIDE_SYSTEM_PROMPT}\n\n## CONTENT PATTERN LIBRARY (pick freely, mix many per page)\n${CONTENT_PATTERNS}`
            : LANDING_SYSTEM_PROMPT;

          const userPrompt = isSlides
            ? [
                `USER BRIEF:\n${prompt}`,
                researchBrief ? `\nRESEARCH FACTS (use these — cite numbers verbatim):\n${researchBrief}` : "",
                `\nTEMPLATE NAME: ${templateName}`,
                `\nTEMPLATE HTML (modify this — keep design DNA, expand content massively, follow ALL strict rules):\n\n${templateHtml}`,
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
              temperature: isSlides ? 0.55 : 0.8,
              max_tokens: isSlides ? 32000 : 9000,
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
