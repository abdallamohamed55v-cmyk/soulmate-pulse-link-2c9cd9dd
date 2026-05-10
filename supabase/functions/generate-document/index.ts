// Generates a Document / Report / Letter / Resume from a prompt + template.
// Streams progress + content via SSE, persists final HTML to generated_sites,
// and enforces a 3/day quota for premium templates.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_KEY  = Deno.env.get("LOVABLE_API_KEY")!;
const PREMIUM_DAILY_LIMIT = 3;

type Kind = "document" | "report" | "letter" | "resume";

const SECTION_HINTS: Record<Kind, string> = {
  document: "Open structure: title, intro, well-formed body sections with H2 headings, conclusion.",
  report:   "Cover heading, Executive Summary, numbered sections (Introduction, Methodology, Findings, Recommendations), References list at the end.",
  letter:   "Letterhead block, Date, Recipient block, Greeting, 3-4 short paragraphs, Sign-off and Signature.",
  resume:   "Header (Name, Title, Contact), Summary, Experience (job, dates, bullets), Education, Skills (chips), Languages.",
};

// ─────────────────────────────────────────────────────────────────────────
// Editorial Magazine theme system — one theme per template id.
// Inspired by Editorial New, Pitchfork redesign, Are.na, Vellum, Apple Newsroom.
// ─────────────────────────────────────────────────────────────────────────
type Theme = {
  bg: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accent2: string;
  fontDisplay: string;
  fontBody: string;
  fontMono: string;
  // Layout/feature flags
  layout: "single" | "narrow" | "two-column" | "centered-card";
  dropCap: boolean;
  pullQuoteStyle: "side" | "card" | "rule" | "centered";
  h1Size: string;        // clamp() for hero
  h1Italic: boolean;     // <em> in hero italic+colored
  sectionNumbering: "decimal" | "roman" | "none";
  showRunningHeader: boolean;
  paperGrain: boolean;   // subtle paper texture
  prose: "serif" | "sans";
  promptHint: string;    // extra system prompt guidance for the writer
};

const TEMPLATE_THEMES: Record<string, Theme> = {
  // ───────── DOCUMENT ─────────
  "broadsheet": {
    bg: "#fbf7f5", ink: "#1a1614", muted: "#6b6660", line: "#e8dfd6",
    accent: "#e84c2b", accent2: "#c9a84c",
    fontDisplay: "'Fraunces', Georgia, serif",
    fontBody: "'Inter Tight', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    layout: "single", dropCap: true, pullQuoteStyle: "side",
    h1Size: "clamp(56px, 9vw, 128px)", h1Italic: true,
    sectionNumbering: "decimal", showRunningHeader: true, paperGrain: true,
    prose: "sans",
    promptHint: "Open with one bold lead paragraph (1-3 sentences) that sets the stakes. Include at least one <blockquote> pull-quote. Vary paragraph rhythm — short punchy lines mixed with longer ones.",
  },
  "quiet": {
    bg: "#ffffff", ink: "#0e0e10", muted: "#8a8783", line: "#ececec",
    accent: "#c9a84c", accent2: "#e84c2b",
    fontDisplay: "'Inter Tight', system-ui, sans-serif",
    fontBody: "'Inter Tight', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    layout: "narrow", dropCap: false, pullQuoteStyle: "centered",
    h1Size: "clamp(40px, 5.5vw, 72px)", h1Italic: false,
    sectionNumbering: "none", showRunningHeader: false, paperGrain: false,
    prose: "sans",
    promptHint: "Write with quiet confidence — short paragraphs, plain language, no decoration. Use H2 sparingly.",
  },
  "manuscript": {
    bg: "#f4ede0", ink: "#23170d", muted: "#7a6a55", line: "#d8cdb8",
    accent: "#7a3520", accent2: "#c9a84c",
    fontDisplay: "'Cormorant Garamond', 'EB Garamond', Georgia, serif",
    fontBody: "'Cormorant Garamond', Georgia, serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    layout: "narrow", dropCap: true, pullQuoteStyle: "rule",
    h1Size: "clamp(48px, 7vw, 96px)", h1Italic: true,
    sectionNumbering: "roman", showRunningHeader: true, paperGrain: true,
    prose: "serif",
    promptHint: "Adopt a literary voice — crafted sentences, evocative imagery. Use <em> for emphasis. End with a contemplative closing paragraph.",
  },

  // ───────── REPORT ─────────
  "quarterly": {
    bg: "#fbf7f5", ink: "#0e0e10", muted: "#6b6660", line: "#e2dad0",
    accent: "#0e0e10", accent2: "#e84c2b",
    fontDisplay: "'Fraunces', Georgia, serif",
    fontBody: "'Inter Tight', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    layout: "single", dropCap: false, pullQuoteStyle: "card",
    h1Size: "clamp(48px, 7vw, 96px)", h1Italic: true,
    sectionNumbering: "decimal", showRunningHeader: true, paperGrain: false,
    prose: "sans",
    promptHint: "Lead with an Executive Summary (h2). Include at least one HTML <table> with key metrics. Use <strong> for headline numbers inline. End with References as a numbered <ol>.",
  },
  "field-notes": {
    bg: "#e8dfce", ink: "#1f1813", muted: "#6e604e", line: "#cdc1ac",
    accent: "#5a3a1d", accent2: "#a36d2d",
    fontDisplay: "'Fraunces', Georgia, serif",
    fontBody: "'Source Serif 4', 'Source Serif Pro', Georgia, serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    layout: "single", dropCap: true, pullQuoteStyle: "side",
    h1Size: "clamp(44px, 6.5vw, 84px)", h1Italic: false,
    sectionNumbering: "decimal", showRunningHeader: true, paperGrain: true,
    prose: "serif",
    promptHint: "Adopt a research-paper tone. Cite findings with <strong>numbers</strong> inline. Use <blockquote> for stat callouts. Sectioning: Abstract, Methodology, Findings, Discussion, References.",
  },
  "briefing": {
    bg: "#ffffff", ink: "#0a0a0a", muted: "#6b6b6b", line: "#e8e8e8",
    accent: "#0a0a0a", accent2: "#3b82f6",
    fontDisplay: "'Inter Tight', system-ui, sans-serif",
    fontBody: "'Inter Tight', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    layout: "single", dropCap: false, pullQuoteStyle: "card",
    h1Size: "clamp(40px, 6vw, 80px)", h1Italic: false,
    sectionNumbering: "decimal", showRunningHeader: false, paperGrain: false,
    prose: "sans",
    promptHint: "Open with a tight executive summary in <blockquote>. Use bold short H2s (2-3 words). Bullets over prose. Include a closing 'Recommendations' h2 with numbered actions.",
  },

  // ───────── LETTER ─────────
  "correspondence": {
    bg: "#fbf7f5", ink: "#1a1614", muted: "#7a7068", line: "#e8dfd6",
    accent: "#7a3520", accent2: "#c9a84c",
    fontDisplay: "'Fraunces', Georgia, serif",
    fontBody: "'Inter Tight', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    layout: "narrow", dropCap: false, pullQuoteStyle: "centered",
    h1Size: "clamp(36px, 5vw, 64px)", h1Italic: true,
    sectionNumbering: "none", showRunningHeader: false, paperGrain: true,
    prose: "sans",
    promptHint: "Write as a warm personal letter. Begin with date as <p class='meta'>. Greet with 'Dear [Name],' inside H1 with the recipient's name in <em>. Close with 'Yours,' then a <div class='signature'>Name</div>.",
  },
  "memorandum": {
    bg: "#ffffff", ink: "#0a0a0a", muted: "#6b6b6b", line: "#e2e2e2",
    accent: "#0a0a0a", accent2: "#e84c2b",
    fontDisplay: "'Inter Tight', system-ui, sans-serif",
    fontBody: "'Inter Tight', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    layout: "single", dropCap: false, pullQuoteStyle: "rule",
    h1Size: "clamp(28px, 3.5vw, 44px)", h1Italic: false,
    sectionNumbering: "none", showRunningHeader: false, paperGrain: false,
    prose: "sans",
    promptHint: "Output a proper memo. Start with a <table class='memo-head'> with rows: TO, FROM, DATE, RE. Then H1 = subject. Then 2-4 concise paragraphs. Close with 'Regards,' + signature.",
  },
  "invitation": {
    bg: "#0e0e10", ink: "#f5efde", muted: "#a99b78", line: "rgba(201,168,76,.25)",
    accent: "#c9a84c", accent2: "#f0d78c",
    fontDisplay: "'Cormorant Garamond', Georgia, serif",
    fontBody: "'Cormorant Garamond', Georgia, serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    layout: "centered-card", dropCap: false, pullQuoteStyle: "centered",
    h1Size: "clamp(56px, 10vw, 128px)", h1Italic: true,
    sectionNumbering: "none", showRunningHeader: false, paperGrain: false,
    prose: "serif",
    promptHint: "Compose a luxe invitation. Center alignment. H1 = event name in italic. One short evocative paragraph. Then a <p class='meta'> with date · time · venue, each separated by ·. Close with 'RSVP' line.",
  },

  // ───────── RESUME ─────────
  "editorial-cv": {
    bg: "#fbf7f5", ink: "#1a1614", muted: "#7a7068", line: "#e8dfd6",
    accent: "#e84c2b", accent2: "#c9a84c",
    fontDisplay: "'Fraunces', Georgia, serif",
    fontBody: "'Inter Tight', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    layout: "single", dropCap: false, pullQuoteStyle: "centered",
    h1Size: "clamp(56px, 9vw, 120px)", h1Italic: true,
    sectionNumbering: "none", showRunningHeader: true, paperGrain: false,
    prose: "sans",
    promptHint: "Treat the CV like a magazine profile. H1 = Name only. Below it <p class='meta'> with role · location · email. Use <blockquote> for the summary. Each role: <div class='experience-item'> with <div class='role'>, <div class='dates'>, then <ul> of 3-5 measurable achievements. Skills as <ul class='skills'> chips.",
  },
  "two-column": {
    bg: "#fbf7f5", ink: "#1a1614", muted: "#7a7068", line: "#e2dad0",
    accent: "#0e0e10", accent2: "#e84c2b",
    fontDisplay: "'Inter Tight', system-ui, sans-serif",
    fontBody: "'Inter Tight', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    layout: "two-column", dropCap: false, pullQuoteStyle: "card",
    h1Size: "clamp(36px, 5vw, 64px)", h1Italic: false,
    sectionNumbering: "none", showRunningHeader: false, paperGrain: false,
    prose: "sans",
    promptHint: "Output as two columns. Wrap left column in <aside> (Contact, Skills as ul.skills, Languages, Education). Wrap right column in <main> (H1 name, role subtitle as p.meta, Summary, Experience as div.experience-item blocks).",
  },
  "minimalist": {
    bg: "#ffffff", ink: "#0a0a0a", muted: "#8a8a8a", line: "#ebebeb",
    accent: "#0a0a0a", accent2: "#3b82f6",
    fontDisplay: "'Inter Tight', system-ui, sans-serif",
    fontBody: "'Inter Tight', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    layout: "narrow", dropCap: false, pullQuoteStyle: "rule",
    h1Size: "clamp(40px, 5vw, 64px)", h1Italic: false,
    sectionNumbering: "none", showRunningHeader: false, paperGrain: false,
    prose: "sans",
    promptHint: "Pure Swiss minimalism. H1 = Name. Below: p.meta with title · email · website. H2 sections only: Summary, Experience, Education, Skills. Each role as div.experience-item. Skills as comma-separated text inside <p>, no chips.",
  },
};

function themeForTemplate(templateId: string | undefined, kind: Kind): Theme {
  const fallback: Record<Kind, string> = {
    document: "broadsheet", report: "quarterly",
    letter: "correspondence", resume: "editorial-cv",
  };
  return TEMPLATE_THEMES[templateId || ""] || TEMPLATE_THEMES[fallback[kind]];
}

function buildHtmlShell(inner: string, kind: Kind, template: any): string {
  const t = themeForTemplate(template?.id, kind);
  const title = (template?.name || kind).toString().replace(/</g, "");
  const isDark = t.bg.startsWith("#0") || t.bg.startsWith("#1");

  const measureMax =
    t.layout === "narrow" ? "640px" :
    t.layout === "centered-card" ? "720px" :
    t.layout === "two-column" ? "1080px" : "880px";

  const dropCapCss = t.dropCap ? `
.doc > p:nth-of-type(1)::first-letter,
.doc > div[dir] > p:nth-of-type(1)::first-letter {
  font-family: var(--font-display);
  float: left; font-size: 5.4em; line-height: 0.82;
  padding: 0.08em 0.12em 0 0; color: var(--accent);
  font-weight: 700;
}` : "";

  const sectionNumberCss =
    t.sectionNumbering === "decimal" ? `
.doc { counter-reset: h2-counter; }
h2::before {
  content: counter(h2-counter, decimal-leading-zero);
  counter-increment: h2-counter;
  font-family: var(--font-mono); font-size: 12px; font-weight: 500;
  color: var(--accent); letter-spacing: 0.08em;
  display: block; margin-bottom: 6px;
}` : t.sectionNumbering === "roman" ? `
.doc { counter-reset: h2-counter; }
h2::before {
  content: counter(h2-counter, upper-roman) ".";
  counter-increment: h2-counter;
  font-family: var(--font-display); font-style: italic; font-size: 0.7em;
  color: var(--accent); margin-right: 0.5em; font-weight: 400;
}` : "";

  const pullQuoteCss =
    t.pullQuoteStyle === "side" ? `
blockquote {
  margin: 56px -32px; padding: 8px 32px;
  border-left: 3px solid var(--accent);
  font-family: var(--font-display); font-style: italic;
  font-size: clamp(24px, 3vw, 40px); line-height: 1.25;
  letter-spacing: -0.02em; color: var(--ink);
}` : t.pullQuoteStyle === "card" ? `
blockquote {
  margin: 40px 0; padding: 28px 32px;
  background: color-mix(in srgb, var(--accent-2) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-2) 30%, var(--line));
  border-radius: 16px;
  font-family: var(--font-display); font-size: clamp(20px, 2.4vw, 28px);
  line-height: 1.4; color: var(--ink);
}` : t.pullQuoteStyle === "centered" ? `
blockquote {
  margin: 64px auto; max-width: 28em; text-align: center;
  font-family: var(--font-display); font-style: italic;
  font-size: clamp(24px, 3.2vw, 40px); line-height: 1.3;
  letter-spacing: -0.02em; color: var(--ink);
  position: relative; padding: 32px 0;
}
blockquote::before, blockquote::after {
  content: ""; display: block; width: 48px; height: 1px;
  background: var(--accent); margin: 0 auto;
}
blockquote::before { margin-bottom: 24px; }
blockquote::after { margin-top: 24px; }` : `
blockquote {
  margin: 48px 0; padding: 24px 0;
  border-top: 1px solid var(--ink); border-bottom: 1px solid var(--ink);
  font-family: var(--font-display); font-style: italic;
  font-size: clamp(22px, 2.8vw, 32px); line-height: 1.3;
  color: var(--ink); text-align: center;
}`;

  const layoutCss =
    t.layout === "two-column" ? `
.doc { display: grid; grid-template-columns: 280px 1fr; gap: 56px; max-width: ${measureMax}; padding: 64px 48px; }
.doc > aside {
  background: var(--ink); color: var(--bg); padding: 40px 28px;
  border-radius: 20px; align-self: start; position: sticky; top: 32px;
}
.doc > aside h2 { color: var(--bg); font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; margin: 28px 0 12px; font-family: var(--font-mono); font-weight: 500; }
.doc > aside h2:first-child { margin-top: 0; }
.doc > aside h2::before { display: none; }
.doc > aside p, .doc > aside li { color: color-mix(in srgb, var(--bg) 78%, transparent); font-size: 14px; }
.doc > aside .skills span, .doc > aside .skills li { background: color-mix(in srgb, var(--bg) 10%, transparent); border-color: color-mix(in srgb, var(--bg) 18%, transparent); color: var(--bg); }
.doc > aside a { color: var(--accent-2); border-bottom-color: color-mix(in srgb, var(--accent-2) 40%, transparent); }
.doc > main { min-width: 0; }
@media (max-width: 760px) { .doc { grid-template-columns: 1fr; padding: 40px 20px; gap: 32px; } .doc > aside { position: static; } }
` : t.layout === "centered-card" ? `
.doc { max-width: ${measureMax}; padding: 80px 48px; text-align: center; }
.doc > h1:first-child { text-align: center; }
.doc p, .doc .meta { text-align: center; }
` : `
.doc { max-width: ${measureMax}; padding: 88px 56px 120px; }
@media (max-width: 720px) { .doc { padding: 48px 22px 72px; } }
`;

  const grainCss = t.paperGrain ? `
.doc::after {
  content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 2; opacity: .35;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  mix-blend-mode: ${isDark ? "screen" : "multiply"};
}` : "";

  const runningHeaderCss = t.showRunningHeader ? `
.doc::before {
  content: "${title.replace(/"/g, "&quot;")}";
  position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--muted); z-index: 1;
  padding: 6px 14px; background: color-mix(in srgb, var(--bg) 80%, transparent);
  backdrop-filter: blur(8px); border-radius: 999px; border: 1px solid var(--line);
}` : "";

  const heroEmCss = t.h1Italic ? `
.doc h1:first-child em, .doc > div[dir] > h1:first-child em,
.doc > main > h1:first-child em {
  font-style: italic; color: var(--accent); font-weight: inherit;
}` : "";

  const memoHeadCss = `
table.memo-head {
  border: none; border-top: 2px solid var(--ink); border-bottom: 2px solid var(--ink);
  margin: 0 0 48px; padding: 16px 0;
}
table.memo-head td { border: none; padding: 4px 0; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
table.memo-head td:first-child { color: var(--muted); width: 80px; }
table.memo-head td:last-child { color: var(--ink); }
`;

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,400;1,9..144,600;1,9..144,700&family=Inter+Tight:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {
  --bg: ${t.bg};
  --ink: ${t.ink};
  --muted: ${t.muted};
  --line: ${t.line};
  --accent: ${t.accent};
  --accent-2: ${t.accent2};
  --font-display: ${t.fontDisplay};
  --font-body: ${t.fontBody};
  --font-mono: ${t.fontMono};
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  background: var(--bg); color: var(--ink);
  font-family: var(--font-body);
  font-size: ${t.prose === "serif" ? "19px" : "17px"};
  line-height: ${t.prose === "serif" ? "1.7" : "1.65"};
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
}
::selection { background: var(--accent); color: ${isDark ? "#000" : "#fff"}; }

${layoutCss}
.doc { position: relative; margin: 0 auto; }

${runningHeaderCss}
${grainCss}

/* Hero H1 */
.doc h1:first-child,
.doc > div[dir] > h1:first-child,
.doc > main > h1:first-child {
  font-family: var(--font-display);
  font-size: ${t.h1Size};
  font-weight: ${t.prose === "serif" ? "500" : "700"};
  line-height: 0.95;
  letter-spacing: -0.035em;
  margin: 0 0 32px;
  color: var(--ink);
}
${heroEmCss}

h1 { font-family: var(--font-display); font-size: clamp(32px, 4vw, 48px); font-weight: 600; line-height: 1.05; letter-spacing: -0.025em; margin: 56px 0 20px; }
h2 {
  font-family: var(--font-display);
  font-size: clamp(22px, 2.4vw, 30px);
  font-weight: ${t.prose === "serif" ? "500" : "600"};
  line-height: 1.2; letter-spacing: -0.015em;
  margin: 64px 0 18px; color: var(--ink);
}
${sectionNumberCss}
h3 { font-family: var(--font-display); font-size: 20px; font-weight: 600; margin: 32px 0 10px; color: var(--ink); }

p { margin: 0 0 18px; color: ${isDark ? "rgba(245,239,222,.82)" : "var(--ink)"}; }

/* Lead paragraph */
.doc > p:nth-of-type(1),
.doc > div[dir] > p:nth-of-type(1),
.doc > main > p:nth-of-type(1) {
  font-size: ${t.prose === "serif" ? "1.25em" : "1.2em"};
  line-height: 1.5;
  color: ${isDark ? "rgba(245,239,222,.92)" : "var(--ink)"};
  margin-bottom: 32px;
  ${t.dropCap ? "" : `font-family: var(--font-display); ${t.h1Italic ? "font-style: italic;" : ""}`}
}

${dropCapCss}

strong { color: var(--ink); font-weight: ${t.prose === "serif" ? "600" : "600"}; }
em { font-style: italic; }
a {
  color: var(--accent); text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
}
a:hover { border-bottom-color: var(--accent); }

ul, ol { margin: 0 0 24px; padding-left: 22px; }
li { margin-bottom: 8px; color: ${isDark ? "rgba(245,239,222,.82)" : "var(--ink)"}; }
li::marker { color: var(--accent); ${t.prose === "sans" ? "font-family: var(--font-mono); font-size: 0.9em;" : ""} }

/* Tables */
table { width: 100%; border-collapse: collapse; margin: 32px 0; font-size: 15px; }
th, td { padding: 14px 14px 14px 0; text-align: left; border-bottom: 1px solid var(--line); vertical-align: top; }
thead th { border-top: 2px solid var(--ink); border-bottom: 1px solid var(--ink); }
th { font-family: var(--font-mono); font-size: 11px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
${memoHeadCss}

${pullQuoteCss}

hr { border: none; border-top: 1px solid var(--line); margin: 56px 0; }

.meta {
  font-family: var(--font-mono); font-size: 11px;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--muted); margin-bottom: 24px; font-weight: 500;
}

/* Letter */
.signature {
  margin-top: 64px; padding-top: 28px; border-top: 1px solid var(--line);
  font-family: var(--font-display); font-style: italic; font-size: 24px;
  color: var(--ink);
}

/* Resume */
.skills { display: flex; flex-wrap: wrap; gap: 8px 14px; margin: 12px 0 24px; padding: 0; list-style: none; }
.skills span, .skills li {
  font-family: var(--font-mono); font-size: 12px; font-weight: 500;
  color: var(--ink);
  padding: 5px 0; letter-spacing: 0.04em;
  border-bottom: 1px solid var(--line);
}
.experience-item {
  margin-bottom: 36px; padding-bottom: 28px;
  border-bottom: 1px solid var(--line);
  display: grid; grid-template-columns: 120px 1fr; gap: 24px;
}
.experience-item:last-child { border-bottom: none; }
.experience-item .role { font-family: var(--font-display); font-weight: 600; font-size: 19px; color: var(--ink); grid-column: 2; letter-spacing: -0.01em; }
.experience-item .dates {
  font-family: var(--font-mono); font-size: 11px; color: var(--muted);
  letter-spacing: 0.1em; text-transform: uppercase;
  grid-column: 1; grid-row: 1 / span 3; padding-top: 4px;
}
.experience-item ul, .experience-item p { grid-column: 2; margin-top: 8px; }
@media (max-width: 720px) {
  .experience-item { grid-template-columns: 1fr; gap: 6px; }
  .experience-item .dates { grid-row: auto; }
  .experience-item .role { grid-column: 1; }
  .experience-item ul, .experience-item p { grid-column: 1; }
}

/* RTL */
[dir="rtl"] ul, [dir="rtl"] ol { padding-left: 0; padding-right: 22px; }
[dir="rtl"] blockquote { border-left: none; border-right: 3px solid var(--accent); margin: 56px 0; padding: 8px 32px 8px 0; }
[dir="rtl"] th, [dir="rtl"] td { text-align: right; padding: 14px 0 14px 14px; }
[dir="rtl"] .experience-item { direction: rtl; }

/* Print */
@media print {
  body { background: #fff; color: #000; }
  .doc::before, .doc::after { display: none !important; }
  .doc { padding: 22mm 18mm; max-width: 100%; }
  h1, h2, h3, p, li { color: #000 !important; }
  blockquote { background: transparent; }
  a { color: #000; }
}
</style>
</head><body><article class="doc">${inner}</article></body></html>`;
}

function sseLine(obj: any): string { return `data: ${JSON.stringify(obj)}\n\n`; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const prompt   = (body?.prompt || "").toString().trim();
    const kind     = (body?.kind || "document") as Kind;
    const tpl      = body?.template || null;
    if (!prompt) return new Response("Missing prompt", { status: 400, headers: corsHeaders });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    if (tpl?.category === "premium") {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("document_premium_usage")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("used_at", since);
      if ((count || 0) >= PREMIUM_DAILY_LIMIT) {
        return new Response(JSON.stringify({
          message: `وصلت إلى الحد اليومي للقوالب المميزة (${PREMIUM_DAILY_LIMIT}/يوم). استخدم القوالب العادية أو حاول غداً.`,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (o: any) => controller.enqueue(enc.encode(sseLine(o)));

        try {
          send({ step: "start", message: "Loading template" });

          const { data: row, error: insErr } = await admin
            .from("generated_sites")
            .insert({
              user_id: userId,
              title: (tpl?.name || prompt || kind).toString().slice(0, 80),
              prompt,
              jsx_code: "",
              html_compiled: "",
              model_used: "google/gemini-2.5-flash",
              status: "generating",
            } as any)
            .select("id").single();
          if (insErr || !row) throw new Error(insErr?.message || "Could not create record");
          const siteId = row.id as string;
          send({ siteId });

          send({ step: "writing", message: "Writing content" });

          const theme = themeForTemplate(tpl?.id, kind);
          const sectionHint = SECTION_HINTS[kind] || SECTION_HINTS.document;
          const sysPrompt = [
            `You are an award-winning ${kind} writer producing editorial-grade content for a magazine-style template called "${tpl?.name || "default"}".`,
            `Output ONLY clean HTML body content (NO <html>, <head>, <body>, NO <style>, NO <script>, NO markdown fences, NO code-block backticks).`,
            `Use ONLY semantic tags: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <hr>, <blockquote>, <aside>, <main>, <div>.`,
            `Start with exactly one top-level <h1> (the title). Do NOT prefix H2s with numbers — numbering is added by CSS automatically.`,
            `Avoid generic placeholder phrases like "Section 1", "Key Perspective", "This chapter expands". Write specific, substantive content tied to the user's prompt.`,
            `Prefer short scannable paragraphs (2-4 sentences). Use <strong> for key facts and <em> for emphasis.`,
            `If the user prompt is in Arabic, wrap the entire content in <div dir="rtl"> ... </div> and write in Arabic.`,
            `Template style guidance: ${tpl?.description || ""}`,
            `Template-specific direction: ${theme.promptHint}`,
            `Structure hint for a ${kind}: ${sectionHint}`,
          ].filter(Boolean).join("\n");

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${LOVABLE_KEY}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              stream: true,
              messages: [
                { role: "system", content: sysPrompt },
                { role: "user",   content: prompt },
              ],
            }),
          });

          if (!aiRes.ok || !aiRes.body) {
            const txt = await aiRes.text().catch(() => "");
            if (aiRes.status === 429) {
              throw new Error("AI gateway rate limit. Please retry shortly.");
            }
            throw new Error(`AI error ${aiRes.status}: ${txt.slice(0, 200)}`);
          }

          const reader = aiRes.body.getReader();
          const dec = new TextDecoder();
          let buf = "";
          let inner = "";
          let charsSinceTick = 0;

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            let idx: number;
            while ((idx = buf.indexOf("\n")) !== -1) {
              const raw = buf.slice(0, idx).trim();
              buf = buf.slice(idx + 1);
              if (!raw.startsWith("data:")) continue;
              const data = raw.slice(5).trim();
              if (data === "[DONE]") continue;
              try {
                const j = JSON.parse(data);
                const piece = j?.choices?.[0]?.delta?.content || "";
                if (piece) {
                  inner += piece;
                  charsSinceTick += piece.length;
                  send({ delta: piece });
                  if (charsSinceTick > 1500) {
                    charsSinceTick = 0;
                    send({ step: "writing", message: "Writing content" });
                  }
                }
              } catch { /* partial */ }
            }
          }

          send({ step: "polishing", message: "Polishing" });

          const cleaned = inner
            .replace(/^```html\s*/i, "")
            .replace(/```\s*$/i, "")
            .replace(/<\/?(html|head|body|!doctype)[^>]*>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .trim();

          const finalHtml = buildHtmlShell(cleaned || `<h1>${prompt}</h1><p>(empty result)</p>`, kind, tpl);

          await admin.from("generated_sites").update({
            html_compiled: finalHtml,
            jsx_code: cleaned,
            status: "completed",
          } as any).eq("id", siteId);

          if (tpl?.category === "premium") {
            await admin.from("document_premium_usage").insert({
              user_id: userId,
              template_id: tpl?.id || null,
              kind,
            } as any);
          }

          send({ done: true, siteId });
          controller.enqueue(enc.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (e: any) {
          console.error("[generate-document] stream error:", e?.message, e?.stack);
          try {
            controller.enqueue(new TextEncoder().encode(sseLine({ error: e?.message || "Generation failed" })));
            controller.close();
          } catch {}
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
