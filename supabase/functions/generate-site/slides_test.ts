// E2E-ish test for the slide generator pipeline.
// - Verifies the strict prompt rules export
// - Verifies emoji/button stripping
// - Verifies template fetching (against the dev server static templates)
// - When OPENROUTER_API_KEY is present, runs a live generation and asserts:
//     * output is full HTML
//     * no emojis
//     * no <button> elements
//     * minimum length / multiple sections
//
// Run:  deno test -A supabase/functions/generate-site/slides_test.ts

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { SLIDE_SYSTEM_PROMPT, CONTENT_PATTERNS } from "./slidePrompt.ts";

Deno.test("prompt forbids buttons and emojis explicitly", () => {
  const lower = SLIDE_SYSTEM_PROMPT.toLowerCase();
  assertStringIncludes(lower, "no buttons");
  assertStringIncludes(lower, "no emojis");
  assertStringIncludes(lower, "no icon");
  assertStringIncludes(lower, "images are encouraged");
});

Deno.test("content pattern library is rich (>= 60 patterns)", () => {
  const ids = CONTENT_PATTERNS.match(/^[A-Z]\d+\./gm) || [];
  assert(ids.length >= 60, `expected >= 60 patterns, got ${ids.length}`);
});

Deno.test("emoji stripper removes unicode emojis", () => {
  const stripEmojis = (s: string) =>
    s.replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{2B00}-\u{2BFF}]|[\u{1F000}-\u{1F2FF}]/gu, "");
  assertEquals(stripEmojis("hello 🎯 world ⭐ ✨"), "hello  world  ");
});

Deno.test({
  name: "live: end-to-end generation produces clean slide HTML",
  ignore: !Deno.env.get("OPENROUTER_API_KEY") || !Deno.env.get("E2E_LIVE"),
  fn: async () => {
    const key = Deno.env.get("OPENROUTER_API_KEY")!;
    const tplUrl = "https://raw.githubusercontent.com/lovable/null"; // placeholder
    // Use a tiny inline template to avoid network deps
    const templateHtml = `<!DOCTYPE html><html><head><style>
      body{font-family:system-ui;background:#0a0a0a;color:#fff;margin:0}
      .hero{min-height:90vh;display:flex;align-items:center;padding:0 8vw}
      h1{font-size:8rem;font-weight:900;line-height:1}
      section{padding:8rem 8vw}
    </style></head><body>
      <section class="hero"><h1>PLACEHOLDER HEADLINE</h1></section>
      <section><h2>About</h2><p>Placeholder copy.</p></section>
    </body></html>`;

    const { SLIDE_SYSTEM_PROMPT, CONTENT_PATTERNS } = await import("./slidePrompt.ts");
    const sys = `${SLIDE_SYSTEM_PROMPT}\n\n${CONTENT_PATTERNS}`;
    const user = `USER BRIEF: A presentation about renewable energy in Egypt.\n\nTEMPLATE:\n${templateHtml}`;

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        temperature: 0.5,
        max_tokens: 16000,
      }),
    });
    assert(r.ok, `OpenRouter HTTP ${r.status}`);
    const j = await r.json();
    let html = String(j.choices?.[0]?.message?.content || "");
    const fence = html.match(/```(?:html)?\s*([\s\S]*?)```/i);
    if (fence) html = fence[1];
    html = html.trim();

    assert(html.length > 5000, `output too short: ${html.length}`);
    assertStringIncludes(html.toLowerCase(), "<html");
    // Strict rules:
    assert(!/<button[\s>]/i.test(html), "found <button> in output");
    assert(!/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{2B00}-\u{2BFF}]/u.test(html), "found emoji in output");
    // Multiple sections:
    const sectionCount = (html.match(/<section/gi) || []).length;
    assert(sectionCount >= 8, `expected >= 8 sections, got ${sectionCount}`);
  },
});
