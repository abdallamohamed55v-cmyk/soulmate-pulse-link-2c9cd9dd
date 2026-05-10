import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AppSidebar from "@/components/AppSidebar";
import AppLayout from "@/layouts/AppLayout";
import ScaledHtmlPreview from "@/components/files/ScaledHtmlPreview";
import TemplatePickerSheet, { type PickerTemplate } from "@/components/files/TemplatePickerSheet";
import MegsyStar from "@/components/files/MegsyStar";
import { LANDING_TEMPLATES, DEFAULT_LANDING_TEMPLATE, findLandingTemplate } from "@/lib/landingTemplates";
import {
  Menu, ArrowUp, ChevronLeft, Eye, Download,
  Plus, LayoutTemplate, SlidersHorizontal, Square,
} from "lucide-react";

const DDS_BASE = "https://docs-design-studio.lovable.app";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/** Wrap raw JSX (from generate-site) into a self-contained HTML preview. */
function buildSiteHtml(jsx: string): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<script src="https://cdn.tailwindcss.com"></script>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/framer-motion@11.0.0/dist/framer-motion.js"></script>
<script src="https://unpkg.com/lucide-react@0.400.0/dist/umd/lucide-react.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>html,body,#root{margin:0;padding:0;min-height:100%;background:#fff;}</style>
</head><body><div id="root"></div>
<script>
  window.framerMotion = window.framerMotion || window.Motion || window.FramerMotion || {};
  window.lucideReact  = window.lucideReact  || window.lucide      || window.LucideReact  || {};
</script>
<script type="text/babel" data-presets="react">
try {
${jsx}
} catch(e) {
  document.getElementById('root').innerHTML = '<pre style="padding:20px;color:#888;font-family:monospace;white-space:pre-wrap;font-size:12px;">'+(e&&e.message||e)+'</pre>';
}
</script></body></html>`;
}

/** Stream JSX from the internal generate-site edge function. */
async function streamSlidesGeneration(
  prompt: string,
  options: { slideCount: number; contentDepth: number; template?: string },
  onStatus: (msg: string) => void,
  onStep: (msg: string) => void,
  signal?: AbortSignal,
): Promise<{ id: string; jsx: string; html: string }> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Please sign in");

  onStatus("Loading template");
  onStep("Loading template");

  const tpl = findLandingTemplate(options.template);
  let templateHtml = "";
  try {
    const r = await fetch(tpl.path, { cache: "no-store" });
    if (r.ok) templateHtml = await r.text();
  } catch {}
  if (!templateHtml || !templateHtml.toLowerCase().includes("<html")) {
    throw new Error(`Could not load template: ${tpl.name}`);
  }

  onStatus("Warming up");
  onStep("Warming up");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-site`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      prompt,
      kind: "slides",
      slideCount: options.slideCount,
      contentDepth: options.contentDepth,
      template: tpl.id,
      templateName: tpl.name,
      templateFolder: tpl.folder,
      templateHtml,
      category: tpl.category,
    }),
    signal,
  });
  if (!res.ok || !res.body) {
    if (res.status === 429) {
      const j = await res.json().catch(() => ({} as any));
      throw new Error(j?.message || "وصلت إلى حد القوالب Premium اليومي");
    }
    throw new Error(`Generation failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", jsx = "", siteId = "", lastStep = "";
  let charsSinceStep = 0;
  let phaseIdx = 0;
  const PHASES = [
    "Drafting outline",
    "Writing content",
    "Composing layout",
    "Adding visuals",
    "Refining sections",
    "Polishing details",
    "Finalizing",
  ];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      try {
        const p = JSON.parse(data);
        if (p.siteId && !p.done) siteId = p.siteId;
        if (p.step && p.message && p.message !== lastStep) {
          onStatus(p.message);
          onStep(p.message);
          lastStep = p.message;
        }
        if (p.delta) {
          jsx += p.delta;
          charsSinceStep += p.delta.length;
          if (charsSinceStep > 2800) {
            charsSinceStep = 0;
            const msg = PHASES[phaseIdx % PHASES.length];
            phaseIdx++;
            if (msg !== lastStep) { onStatus(msg); onStep(msg); lastStep = msg; }
          }
        }
        if (p.done && p.siteId) siteId = p.siteId;
        if (p.error) throw new Error(p.error);
      } catch { /* partial */ }
    }
  }

  const cleaned = jsx.replace(/```(?:jsx?|tsx?|javascript)?\s*/g, "").replace(/```\s*$/g, "").trim();
  if (!siteId) throw new Error("Generation completed without an id");
  const { data, error } = await supabase
    .from("generated_sites")
    .select("html_compiled, jsx_code")
    .eq("id", siteId)
    .maybeSingle();
  if (error) throw error;
  const html = data?.html_compiled || "";
  if (!html) throw new Error("Slides render failed");
  return { id: siteId, jsx: data?.jsx_code || cleaned, html };
}


type Kind =
  | "slides" | "document" | "resume" | "report"
  | "spreadsheet" | "letter" | "roadmap" | "mindmap" | "timeline";

interface Template { type: Kind; id: string; name: string; description?: string; preview?: string; style?: string; order?: number; folder?: string; category?: "premium" | "standard"; }
interface DocsDoc { kind: Kind; template?: string; title?: string; [k: string]: any; }

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  status?: string;
  generationId?: string;
  doc?: DocsDoc;
  htmlPreview?: string;
  thumbnail?: string | null;
  report?: string[];
}

interface SavedFile {
  id: string;
  title: string;
  kind: string;
  thumbnail: string | null;
  generation_id: string | null;
  conversation_id: string;
  updated_at: string;
}

const KINDS: { id: Kind; label: string; hasTemplates?: boolean }[] = [
  { id: "slides",      label: "Slides",      hasTemplates: true  },
  { id: "document",    label: "Document",    hasTemplates: true  },
  { id: "resume",      label: "Resume",      hasTemplates: true  },
  { id: "report",      label: "Report",      hasTemplates: true  },
  { id: "spreadsheet", label: "Spreadsheet" },
  { id: "letter",      label: "Letter",      hasTemplates: true  },
  { id: "roadmap",     label: "Roadmap"      },
  { id: "mindmap",     label: "Mindmap"      },
  { id: "timeline",    label: "Timeline"     },
];

const DEFAULT_SLIDES_TEMPLATE = DEFAULT_LANDING_TEMPLATE;

/** Clean, brand-safe rephrasing of raw status events from the generator. */
function humanizeStatus(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "Warming up";
  const stripped = s.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  const lower = stripped.toLowerCase();
  if (lower.includes("research")) return "Researching";
  if (lower.includes("plan") || lower.includes("outline")) return "Shaping outline";
  if (lower.includes("writ") || lower.includes("draft") || lower.includes("content")) return "Writing content";
  if (lower.includes("design") || lower.includes("style") || lower.includes("layout")) return "Crafting design";
  if (lower.includes("image") || lower.includes("media") || lower.includes("visual")) return "Curating visuals";
  if (lower.includes("export") || lower.includes("render") || lower.includes("final")) return "Polishing";
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}


/** Stream HTML doc from internal generate-document edge function. */
async function streamDocumentGeneration(
  prompt: string,
  opts: { kind: "document" | "report" | "letter" | "resume"; template: Template | null },
  onStatus: (msg: string) => void,
  onStep: (msg: string) => void,
  signal?: AbortSignal,
): Promise<{ id: string; html: string }> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Please sign in");

  onStatus("Warming up"); onStep("Warming up");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-document`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      prompt, kind: opts.kind,
      template: opts.template ? {
        id: opts.template.id, name: opts.template.name,
        description: opts.template.description, category: opts.template.category,
      } : null,
    }),
    signal,
  });
  if (!res.ok || !res.body) {
    if (res.status === 429) {
      const j = await res.json().catch(() => ({} as any));
      throw new Error(j?.message || "وصلت إلى الحد اليومي للقوالب المميزة");
    }
    throw new Error(`Generation failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", siteId = "", lastStep = "", charsSinceTick = 0, phaseIdx = 0;
  const PHASES = ["Drafting outline", "Writing content", "Refining", "Polishing", "Finalizing"];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      try {
        const p = JSON.parse(data);
        if (p.siteId && !p.done) siteId = p.siteId;
        if (p.message && p.message !== lastStep) { onStatus(p.message); onStep(p.message); lastStep = p.message; }
        if (p.delta) {
          charsSinceTick += p.delta.length;
          if (charsSinceTick > 1200) {
            charsSinceTick = 0;
            const msg = PHASES[phaseIdx++ % PHASES.length];
            if (msg !== lastStep) { onStatus(msg); onStep(msg); lastStep = msg; }
          }
        }
        if (p.done && p.siteId) siteId = p.siteId;
        if (p.error) throw new Error(p.error);
      } catch { /* partial */ }
    }
  }

  if (!siteId) throw new Error("Generation completed without an id");
  const { data, error } = await supabase
    .from("generated_sites").select("html_compiled").eq("id", siteId).maybeSingle();
  if (error) throw error;
  const html = data?.html_compiled || "";
  if (!html) throw new Error("Document render failed");
  return { id: siteId, html };
}

async function streamGenerate(body: any, onStatus: (msg: string) => void, onStep: (msg: string) => void, signal?: AbortSignal) {
  const res = await fetch(`${DDS_BASE}/api/v1/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`Generation failed (${res.status})`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let event = "message", data = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      try {
        const payload = JSON.parse(data);
        if (event === "status" && payload.message) {
          const friendly = humanizeStatus(payload.message);
          onStatus(friendly);
          onStep(friendly);
        }
        if (event === "done") return payload;
        if (event === "error") throw new Error(payload.message || "Generation failed");
      } catch (e: any) { if (event === "error") throw e; }
    }
  }
  throw new Error("Stream ended without completion");
}

async function generateProjectName(prompt: string): Promise<string> {
  try {
    const { data } = await supabase.functions.invoke("name-project", { body: { prompt } });
    if (data?.name) return data.name;
  } catch {}
  return prompt.split(/\s+/).slice(0, 4).join(" ") || "New File";
}

async function captureThumb(html: string, fileName: string): Promise<string | null> {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const r = await fetch(`${SUPABASE_URL}/functions/v1/screenshot-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ html, viewportWidth: 1280, viewportHeight: 800, fileName }),
    });
    const data = await r.json().catch(() => ({} as any));
    return data?.preview_url || null;
  } catch { return null; }
}

const FilesPage = () => {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [selectedKind, setSelectedKind] = useState<Kind>("slides");
  const [templatesByKind, setTemplatesByKind] = useState<Record<string, Template[]>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [slideCount, setSlideCount] = useState(10);
  const [contentDepth, setContentDepth] = useState(3);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewTitle, setPreviewTitle] = useState<string>("Preview");
  const [savedFiles, setSavedFiles] = useState<SavedFile[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsGenerating(false);
    setMessages(prev => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role === "assistant" && !last.content) {
        last.status = undefined;
        last.content = "Stopped.";
      }
      return copy;
    });
  }, []);

  const currentKindMeta = KINDS.find(k => k.id === selectedKind);
  const showTemplates = !!currentKindMeta?.hasTemplates;
  const isSlides = selectedKind === "slides";

  // Load templates: slides combine internal "premium" + external DDS "standard";
  // document/report/letter/resume come from our internal document_templates table.
  useEffect(() => {
    (async () => {
      const grouped: Record<string, Template[]> = {};
      const ddsSlides: Template[] = [];
      try {
        const res = await fetch(`${DDS_BASE}/api/v1/templates`);
        const json = await res.json();
        for (const t of (json.templates || [])) {
          const tpl = { ...t, order: t.display_order ?? t.order } as Template;
          if (t.type === "slides") {
            ddsSlides.push({ ...tpl, category: "standard" } as any);
          } else {
            (grouped[t.type] = grouped[t.type] || []).push(tpl);
          }
        }
      } catch {}

      // Pull custom uploaded thumbnails (Telegram bot) for slides
      const slidesImgMap = new Map<string, string>();
      try {
        const { data } = await supabase.from("template_images").select("template_id, image_url");
        for (const r of (data || [])) slidesImgMap.set(r.template_id, r.image_url);
      } catch {}

      const premiumSlides: Template[] = LANDING_TEMPLATES.map((t, i) => ({
        type: "slides",
        id: t.id,
        name: t.name,
        description: t.description,
        preview: slidesImgMap.get(t.id) || "",
        folder: t.folder,
        category: t.category,
        order: i,
      } as Template));

      const standardWithImages = ddsSlides.map(t => ({
        ...t,
        preview: slidesImgMap.get(t.id) || "",
      }));

      grouped.slides = [...premiumSlides, ...standardWithImages];

      // Document templates from our table — overrides DDS for these kinds
      try {
        const [{ data: docTpls }, { data: docImgs }] = await Promise.all([
          supabase.from("document_templates").select("id, kind, name, description, category, sort_order").order("sort_order"),
          supabase.from("document_template_images").select("template_id, image_url"),
        ]);
        const docImgMap = new Map<string, string>();
        for (const r of (docImgs || [])) docImgMap.set(r.template_id, r.image_url);
        for (const t of (docTpls || [])) {
          (grouped[t.kind] = grouped[t.kind] || []);
          // Replace any DDS entry with the same id, otherwise append
          const existing = grouped[t.kind].findIndex(x => x.id === t.id);
          const tpl: Template = {
            type: t.kind as Kind,
            id: t.id,
            name: t.name,
            description: t.description || undefined,
            preview: docImgMap.get(t.id) || "",
            category: (t.category as any) || "standard",
            order: t.sort_order || 0,
          };
          if (existing >= 0) grouped[t.kind][existing] = tpl;
          else grouped[t.kind].push(tpl);
        }
        // Sort each doc kind by order
        for (const k of ["document", "report", "letter", "resume"] as Kind[]) {
          if (grouped[k]) grouped[k].sort((a, b) => (a.order || 0) - (b.order || 0));
        }
      } catch {}

      setTemplatesByKind(grouped);
    })();
  }, []);


  const loadSavedFiles = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("id, title, updated_at, ui_state")
      .eq("user_id", user.id)
      .eq("mode", "files")
      .order("updated_at", { ascending: false })
      .limit(24);
    if (!data) return;
    const list: SavedFile[] = data.map((c: any) => ({
      id: c.id,
      title: c.title || "Untitled",
      kind: c.ui_state?.kind || "document",
      thumbnail: c.ui_state?.thumbnail || null,
      generation_id: c.ui_state?.generation_id || null,
      conversation_id: c.id,
      updated_at: c.updated_at,
    }));
    setSavedFiles(list);
  }, []);

  useEffect(() => { loadSavedFiles(); }, [loadSavedFiles]);

  useEffect(() => {
    const list = templatesByKind[selectedKind];
    if (!list || list.length === 0) { setSelectedTemplate(null); return; }
    if (selectedKind === "slides") {
      const megsy = list.find(t => t.id === DEFAULT_SLIDES_TEMPLATE);
      setSelectedTemplate(megsy || list[0]);
    } else {
      setSelectedTemplate(list[0]);
    }
  }, [selectedKind, templatesByKind]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const currentTemplates = useMemo(() => templatesByKind[selectedKind] || [], [selectedKind, templatesByKind]);

  const handleSend = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || isGenerating) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please sign in"); navigate("/auth"); return; }

    setInput("");
    const userMsg: ChatMsg = { role: "user", content: prompt };
    const assistantMsg: ChatMsg = { role: "assistant", content: "", status: "Getting started", report: [] };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsGenerating(true);

    let convId = conversationId;
    if (!convId) {
      const name = await generateProjectName(prompt);
      const { data: conv } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title: name, mode: "files", ui_state: { kind: selectedKind } as any })
        .select("id").single();
      convId = conv?.id || null;
      if (convId) setConversationId(convId);
    }

    if (convId) {
      await supabase.from("messages").insert({ conversation_id: convId, role: "user", content: prompt } as any);
    }

    abortRef.current = new AbortController();
    try {
      const onStatusCb = (msg: string) => {
        setMessages(prev => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") last.status = msg;
          return copy;
        });
      };
      const onStepCb = (step: string) => {
        setMessages(prev => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            const list = last.report || [];
            if (list[list.length - 1] !== step) last.report = [...list, step];
          }
          return copy;
        });
      };

      // ───── Premium slides → internal generate-site edge function ─────
      if (isSlides && (selectedTemplate?.category || "premium") === "premium") {
        const out = await streamSlidesGeneration(
          prompt,
          { slideCount, contentDepth, template: selectedTemplate?.id || DEFAULT_SLIDES_TEMPLATE },
          onStatusCb,
          onStepCb,
          abortRef.current.signal,
        );
        const title = prompt.slice(0, 80);
        const thumb = await captureThumb(out.html, `file-${convId || out.id}`);
        const summary = `Created "${title}"`;
        setMessages(prev => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            last.status = undefined;
            last.content = summary;
            last.generationId = out.id;
            last.doc = { kind: "slides", title } as DocsDoc;
            last.htmlPreview = out.html;
            last.thumbnail = thumb;
          }
          return copy;
        });
        if (convId) {
          await supabase.from("messages").insert({
            conversation_id: convId, role: "assistant", content: summary,
          } as any);
          await supabase.from("conversations").update({
            title,
            ui_state: { kind: "slides", thumbnail: thumb, generation_id: out.id, source: "generate-site" } as any,
          }).eq("id", convId);
          loadSavedFiles();
        }
        return;
      }

      // ───── Document / Report / Letter / Resume → internal generate-document ─────
      if (selectedKind === "document" || selectedKind === "report" || selectedKind === "letter" || selectedKind === "resume") {
        const out = await streamDocumentGeneration(
          prompt,
          { kind: selectedKind, template: selectedTemplate },
          onStatusCb, onStepCb, abortRef.current.signal,
        );
        const title = prompt.slice(0, 80);
        const thumb = await captureThumb(out.html, `file-${convId || out.id}`);
        const summary = `Created "${title}"`;
        setMessages(prev => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            last.status = undefined;
            last.content = summary;
            last.generationId = out.id;
            last.doc = { kind: selectedKind, title } as DocsDoc;
            last.htmlPreview = out.html;
            last.thumbnail = thumb;
          }
          return copy;
        });
        if (convId) {
          await supabase.from("messages").insert({
            conversation_id: convId, role: "assistant", content: summary,
          } as any);
          await supabase.from("conversations").update({
            title,
            ui_state: { kind: selectedKind, thumbnail: thumb, generation_id: out.id, source: "generate-document" } as any,
          }).eq("id", convId);
          loadSavedFiles();
        }
        return;
      }

      const result = await streamGenerate(
        {
          kind: selectedKind,
          template: selectedTemplate?.id || (isSlides ? DEFAULT_SLIDES_TEMPLATE : "modern"),
          templateStyle: selectedTemplate?.style || "",
          prompt,
          useResearch: true,
          depth: contentDepth,
          slideCount: isSlides ? slideCount : undefined,
        },
        onStatusCb,
        onStepCb,
        abortRef.current.signal,
      );

      const doc: DocsDoc = JSON.parse(result.docJson);

      let htmlPreview = "";
      try {
        const expRes = await fetch(`${DDS_BASE}/api/v1/generations/${result.id}/export?format=html`, { method: "POST" });
        if (expRes.ok) htmlPreview = await expRes.text();
      } catch {}

      let thumb: string | null = null;
      if (htmlPreview) {
        thumb = await captureThumb(htmlPreview, `file-${convId || result.id}`);
      }

      // Final summary report
      const summaryParts: string[] = [];
      if (doc?.title) summaryParts.push(`Created "${doc.title}"`);
      if (isSlides && Array.isArray((doc as any).slides)) summaryParts.push(`${(doc as any).slides.length} slides`);
      if (selectedTemplate?.name) summaryParts.push(`styled with ${selectedTemplate.name}`);
      const summary = summaryParts.join(" • ") || `Your ${selectedKind} is ready.`;

      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant") {
          last.status = undefined;
          last.content = summary;
          last.generationId = result.id;
          last.doc = doc;
          last.htmlPreview = htmlPreview;
          last.thumbnail = thumb;
        }
        return copy;
      });

      if (convId) {
        await supabase.from("messages").insert({
          conversation_id: convId, role: "assistant", content: summary,
        } as any);
        await supabase.from("conversations").update({
          title: doc?.title || undefined,
          ui_state: { kind: selectedKind, thumbnail: thumb, generation_id: result.id } as any,
        }).eq("id", convId);
        loadSavedFiles();
      }
    } catch (e: any) {
      const aborted = e?.name === "AbortError";
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant") {
          last.status = undefined;
          if (!last.content) last.content = aborted ? "Stopped." : "Sorry — generation didn't complete. Please try again.";
        }
        return copy;
      });
      if (!aborted) toast.error(e?.message || "Generation failed");
    } finally {
      abortRef.current = null;
      setIsGenerating(false);
    }
  }, [input, isGenerating, selectedKind, selectedTemplate, isSlides, slideCount, contentDepth, conversationId, navigate, loadSavedFiles]);

  const handleDownload = useCallback(async (msg: ChatMsg) => {
    if (!msg.generationId) return;
    try {
      let html = msg.htmlPreview || "";
      if (!html) {
        if (msg.doc?.kind === "slides") {
          const { data } = await supabase.from("generated_sites").select("html_compiled, jsx_code").eq("id", msg.generationId).maybeSingle();
          html = data?.html_compiled || (data?.jsx_code ? buildSiteHtml(data.jsx_code) : "");
        } else {
          const res = await fetch(`${DDS_BASE}/api/v1/generations/${msg.generationId}/export?format=html`, { method: "POST" });
          if (res.ok) html = await res.text();
        }
      }
      if (!html) throw new Error("Export failed");
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${msg.doc?.title || msg.doc?.kind || "document"}.html`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success("Downloaded");
    } catch (e: any) { toast.error(e?.message || "Download failed"); }
  }, []);

  const openPreview = (html: string, title?: string) => {
    setPreviewHtml(html); setPreviewTitle(title || "Preview"); setPreviewOpen(true);
  };

  const openSavedFile = async (file: SavedFile) => {
    setIsGenerating(true);
    try {
      // Load the saved conversation messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("role, content, created_at")
        .eq("conversation_id", file.conversation_id)
        .order("created_at", { ascending: true });

      let htmlPreview = "";
      if (file.generation_id) {
        if (file.kind === "slides") {
          try {
            const { data } = await supabase.from("generated_sites").select("html_compiled, jsx_code").eq("id", file.generation_id).maybeSingle();
            htmlPreview = data?.html_compiled || (data?.jsx_code ? buildSiteHtml(data.jsx_code) : "");
          } catch {}
        } else {
          try {
            const expRes = await fetch(`${DDS_BASE}/api/v1/generations/${file.generation_id}/export?format=html`, { method: "POST" });
            if (expRes.ok) htmlPreview = await expRes.text();
          } catch {}
        }
      }

      const restored: ChatMsg[] = [];
      const list = msgs || [];
      for (let i = 0; i < list.length; i++) {
        const m: any = list[i];
        if (m.role === "user") {
          restored.push({ role: "user", content: m.content });
        } else {
          // Attach the preview/thumbnail to the LAST assistant message
          const isLast = !list.slice(i + 1).some((x: any) => x.role === "assistant");
          restored.push({
            role: "assistant",
            content: m.content,
            ...(isLast ? {
              generationId: file.generation_id || undefined,
              doc: { kind: file.kind as Kind, title: file.title },
              htmlPreview,
              thumbnail: file.thumbnail,
            } : {}),
          });
        }
      }

      setConversationId(file.conversation_id);
      setSelectedKind((file.kind as Kind) || "document");
      setMessages(restored.length ? restored : [
        { role: "user", content: file.title },
        {
          role: "assistant",
          content: `Your ${file.kind} is ready.`,
          generationId: file.generation_id || undefined,
          doc: { kind: file.kind as Kind, title: file.title },
          htmlPreview,
          thumbnail: file.thumbnail,
        },
      ]);
    } catch { toast.error("Couldn't open file"); }
    finally { setIsGenerating(false); }
  };

  const handleNewFile = () => {
    setMessages([]); setConversationId(null); setInput("");
  };

  const showHero = messages.length === 0;

  const pickerTemplates: PickerTemplate[] = currentTemplates.map(t => ({
    id: t.id, name: t.name, preview: t.preview, description: t.description, fallbackLabel: t.name,
    category: t.category,
  }));

  return (
    <AppLayout>
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewFile}
        currentMode="files"
      />

      {/* Outer scroll container — REPLACES the fixed-height layout that broke scrolling */}
      <div className="relative h-full w-full overflow-y-auto bg-background text-foreground">
        {/* Floating sidebar button — iOS 26 liquid glass */}
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          className="fixed top-3 left-3 z-30 h-11 w-11 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{
            background: "hsl(var(--glass))",
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
            border: "1px solid hsl(var(--glass-border) / 0.5)",
            boxShadow: "0 8px 32px -8px rgba(0,0,0,0.2), inset 0 1px 0 hsl(0 0% 100% / 0.15)",
          }}
        >
          <Menu className="h-5 w-5" />
        </button>


        {showHero ? (
          <div className="flex flex-col min-h-full pt-20 pb-16">
            <section className="max-w-3xl w-full mx-auto px-5 sm:px-8 text-center">
              <h2 className="font-extrabold tracking-tight leading-[1.05] text-3xl sm:text-5xl">
                <span className="text-foreground">Drop in a topic, get</span>{" "}
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                  exquisite files.
                </span>
              </h2>
              <p className="mt-3 text-muted-foreground text-sm sm:text-base">
                Slides, documents, reports, resumes — designed and ready.
              </p>
            </section>

            <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 mt-8 sm:mt-10">
              <InputBox
                value={input}
                onChange={setInput}
                onSend={handleSend}
                onStop={handleStop}
                isGenerating={isGenerating}
                textareaRef={textareaRef}
                kindLabel={currentKindMeta?.label || "file"}
                isSlides={isSlides}
                slideCount={slideCount}
                setSlideCount={setSlideCount}
                contentDepth={contentDepth}
                setContentDepth={setContentDepth}
                showTemplates={showTemplates}
                selectedTemplate={selectedTemplate}
                onOpenPicker={() => setPickerOpen(true)}
                optionsOpen={optionsOpen}
                setOptionsOpen={setOptionsOpen}
              />
            </div>

            <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 mt-5">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1 scroll-smooth">
                {KINDS.map((k) => {
                  const Active = selectedKind === k.id;
                  return (
                    <button
                      key={k.id}
                      onClick={() => setSelectedKind(k.id)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium border transition-all ${
                        Active
                          ? "bg-foreground text-background border-foreground"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {k.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {savedFiles.length > 0 && (
              <section className="max-w-5xl w-full mx-auto px-4 sm:px-8 pt-10 pb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Your projects</h3>
                  <span className="text-xs text-muted-foreground">{savedFiles.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {savedFiles.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => openSavedFile(f)}
                      className="group flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden text-left hover:border-foreground/30 hover:shadow-lg transition-all"
                    >
                      <div className="w-full aspect-video bg-muted overflow-hidden">
                        {f.thumbnail ? (
                          <img src={f.thumbnail} alt={f.title} loading="lazy"
                            className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-widest">
                            {f.kind}
                          </div>
                        )}
                      </div>
                      <div className="px-3 py-2.5">
                        <p className="text-sm font-semibold truncate">{f.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{f.kind}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="flex flex-col min-h-full pt-16">
            <main className="flex-1 max-w-3xl w-full mx-auto px-3 sm:px-6 pb-40 space-y-4">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "user" ? (
                    <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-primary text-primary-foreground text-sm whitespace-pre-wrap">
                      {m.content}
                    </div>
                  ) : (
                    <div className="max-w-[92%] w-full">
                      <div className="flex items-start gap-2.5">
                        <div className="shrink-0 mt-0.5">
                          <MegsyStar size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {m.status ? (
                            <div className="space-y-1.5 py-1">
                              <p className="text-base font-extrabold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                                {stripEmoji(m.status)}…
                              </p>
                              {m.report && m.report.length > 1 && (
                                <ul className="pl-1 space-y-0.5 text-xs text-muted-foreground">
                                  {m.report.slice(0, -1).slice(-3).map((s, idx) => (
                                    <li key={idx} className="truncate font-semibold">{stripEmoji(s)}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ) : (
                            <>
                              <p className="text-sm whitespace-pre-wrap text-foreground">{m.content}</p>

                              {m.generationId && (
                                <div className="mt-3 rounded-2xl border border-border/60 bg-card overflow-hidden">
                                  <button
                                    onClick={() => m.htmlPreview && openPreview(m.htmlPreview, m.doc?.title)}
                                    className="block w-full aspect-video bg-muted overflow-hidden"
                                  >
                                    {m.thumbnail ? (
                                      <img src={m.thumbnail} alt={m.doc?.title || "preview"}
                                        className="w-full h-full object-cover object-top" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                                        Tap to preview
                                      </div>
                                    )}
                                  </button>
                                  <div className="flex items-center justify-between px-3 py-2 border-t border-border/60">
                                    <span className="text-xs font-medium truncate text-foreground">
                                      {m.doc?.title || "Untitled"}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => m.htmlPreview && openPreview(m.htmlPreview, m.doc?.title)}
                                        className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
                                        aria-label="Preview"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDownload(m)}
                                        className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
                                        aria-label="Download"
                                      >
                                        <Download className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </main>

            {/* Floating chat input */}
            <div
              className="fixed bottom-0 left-0 right-0 z-20"
              style={{
                background: "hsl(var(--background) / 0.6)",
                backdropFilter: "blur(28px) saturate(180%)",
                WebkitBackdropFilter: "blur(28px) saturate(180%)",
                borderTop: "1px solid hsl(var(--border) / 0.4)",
              }}
            >
              <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <ChatInputBox
                  value={input}
                  onChange={setInput}
                  onSend={handleSend}
                  onStop={handleStop}
                  isGenerating={isGenerating}
                  textareaRef={textareaRef}
                  kindLabel={currentKindMeta?.label || "file"}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <TemplatePickerSheet
        open={pickerOpen}
        templates={pickerTemplates}
        selectedId={selectedTemplate?.id}
        showCategoryTabs={isSlides}
        onSelect={(t) => {
          const full = currentTemplates.find(x => x.id === t.id);
          if (full) setSelectedTemplate(full);
        }}
        onClose={() => setPickerOpen(false)}
      />

      <AnimatePresence>
        {previewOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            <header className="shrink-0 h-14 px-3 sm:px-4 flex items-center justify-between border-b border-border/40 bg-background/90 backdrop-blur-xl">
              <button onClick={() => setPreviewOpen(false)} className="h-10 w-10 rounded-xl hover:bg-muted flex items-center justify-center" aria-label="Back">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <p className="text-sm font-semibold truncate flex-1 text-center px-2">{previewTitle}</p>
              <button
                onClick={() => {
                  const blob = new Blob([previewHtml], { type: "text/html" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `${previewTitle || "file"}.html`;
                  document.body.appendChild(a); a.click(); a.remove();
                  URL.revokeObjectURL(url);
                }}
                className="h-10 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </header>
            <ScaledHtmlPreview html={previewHtml} />
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

/* ─────────────── iOS 26 Liquid Glass styles (shared) ─────────────── */

const glassSurface: React.CSSProperties = {
  background: "hsl(var(--glass))",
  backdropFilter: "blur(32px) saturate(190%)",
  WebkitBackdropFilter: "blur(32px) saturate(190%)",
  border: "1px solid hsl(var(--glass-border) / 0.5)",
  boxShadow:
    "0 12px 40px -10px rgba(0,0,0,0.18), inset 0 1px 0 hsl(0 0% 100% / 0.18), inset 0 -1px 0 hsl(0 0% 100% / 0.06)",
};

const glassChip: React.CSSProperties = {
  background: "hsl(var(--glass))",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: "1px solid hsl(var(--glass-border) / 0.55)",
  boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.15)",
};

const handleAttach = () => {
  // Hook up media attachment in a future pass — keeps the + button visually present per iOS 26 spec.
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = "image/*,application/pdf,text/*";
  inp.click();
};

/* ─────────────── Main hero input (with templates + options popover) ─────────────── */

interface InputBoxProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  isGenerating: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  kindLabel: string;
  isSlides: boolean;
  slideCount: number;
  setSlideCount: (n: number) => void;
  contentDepth: number;
  setContentDepth: (n: number) => void;
  showTemplates: boolean;
  selectedTemplate: Template | null;
  onOpenPicker: () => void;
  optionsOpen: boolean;
  setOptionsOpen: (v: boolean) => void;
}

const InputBox = ({
  value, onChange, onSend, onStop, isGenerating, textareaRef, kindLabel,
  isSlides, slideCount, setSlideCount, contentDepth, setContentDepth,
  showTemplates, selectedTemplate, onOpenPicker, optionsOpen, setOptionsOpen,
}: InputBoxProps) => {
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!optionsOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setOptionsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [optionsOpen, setOptionsOpen]);

  return (
    <div
      className="rounded-[28px] focus-within:ring-2 focus-within:ring-primary/30 transition-all"
      style={glassSurface}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
        }}
        placeholder={isSlides ? "Create slides..." : `Describe your ${kindLabel.toLowerCase()}...`}
        rows={2}
        className="w-full resize-none bg-transparent px-5 pt-5 text-[15px] focus:outline-none max-h-48 placeholder:text-muted-foreground/70"
      />

      <div className="flex items-center gap-1.5 px-2.5 pb-2.5">
        {/* Attach button (+) — iOS 26 glass chip */}
        <button
          type="button"
          onClick={handleAttach}
          aria-label="Attach"
          className="h-10 w-10 rounded-full flex items-center justify-center text-foreground hover:scale-105 active:scale-95 transition"
          style={glassChip}
        >
          <Plus className="h-4 w-4" />
        </button>

        {showTemplates && (
          <button
            onClick={onOpenPicker}
            className="h-10 px-3.5 rounded-full flex items-center gap-1.5 text-xs font-medium text-foreground hover:scale-[1.02] active:scale-95 transition"
            style={glassChip}
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            <span className="truncate max-w-[120px]">{selectedTemplate?.name || "Templates"}</span>
          </button>
        )}

        {/* Slide settings removed — generator picks the optimal length and depth automatically. */}

        {isGenerating ? (
          <button
            onClick={onStop}
            className="ml-auto h-11 w-11 rounded-full flex items-center justify-center text-white hover:scale-105 active:scale-95 transition"
            style={{
              background: "linear-gradient(135deg, hsl(0 80% 60%), hsl(340 80% 55%))",
              boxShadow: "0 8px 24px -6px hsl(0 80% 60% / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.25)",
            }}
            aria-label="Stop"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!value.trim()}
            className="ml-auto h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:scale-105 active:scale-95 transition"
            style={{
              boxShadow: "0 8px 24px -6px hsl(var(--primary) / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.25)",
            }}
            aria-label="Send"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

/* ─────────────── Chat input (with attach + send/stop) ─────────────── */

interface ChatInputBoxProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  isGenerating: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  kindLabel: string;
}

const ChatInputBox = ({ value, onChange, onSend, onStop, isGenerating, textareaRef, kindLabel }: ChatInputBoxProps) => {
  return (
    <div
      className="rounded-[26px] flex items-end gap-2 px-2 py-1.5"
      style={glassSurface}
    >
      <button
        type="button"
        onClick={handleAttach}
        aria-label="Attach"
        className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-foreground hover:scale-105 active:scale-95 transition"
        style={glassChip}
      >
        <Plus className="h-4 w-4" />
      </button>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
        }}
        placeholder={`Describe your ${kindLabel.toLowerCase()}...`}
        rows={1}
        className="flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] focus:outline-none max-h-40 placeholder:text-muted-foreground/70"
      />
      {isGenerating ? (
        <button
          onClick={onStop}
          className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white hover:scale-105 active:scale-95 transition"
          style={{
            background: "linear-gradient(135deg, hsl(0 80% 60%), hsl(340 80% 55%))",
            boxShadow: "0 6px 20px -6px hsl(0 80% 60% / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.25)",
          }}
          aria-label="Stop"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
        </button>
      ) : (
        <button
          onClick={onSend}
          disabled={!value.trim()}
          className="shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:scale-105 active:scale-95 transition"
          aria-label="Send"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default FilesPage;
