import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, ArrowUp, Plus, MoreHorizontal, Image as ImageIcon, Paperclip, Camera,
  Loader2, Database, Github, Eye, Settings, Pencil, X, Check, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import AppLayout from "@/layouts/AppLayout";
import AppSidebar from "@/components/AppSidebar";
import CodeChatContainer from "@/components/code/CodeChatContainer";
import { CodeStep, StepType } from "@/components/code/CodeStepMessage";
import ConnectIntegrationsSheet from "@/components/code/ConnectIntegrationsSheet";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const WEBLY_BASE = "https://wxphtsgezburjqoqiqqo.supabase.co/functions/v1";
const BUILD_CREDIT_COST = 5;

interface ChatMsg {
  role: "user" | "assistant" | "system";
  content: string;
  type?: "plan" | "build" | "log" | "status" | "steps" | "timeline" | "api_key_request";
  meta?: { durationMs?: number; credits?: number };
  apiKeyName?: string;
  apiKeyDescription?: string;
  apiKeyResolved?: boolean;
}

interface Attachment { name: string; type: "image" | "file"; data: string; }

let stepCounter = 0;
const makeStep = (type: StepType, text: string, file?: string): CodeStep => ({
  id: `step-${++stepCounter}`, type, text, file, status: "active",
});

const CodeWorkspace = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPrompt = searchParams.get("prompt") || "";
  const paramConversationId = searchParams.get("conversation_id") || "";
  const paramProjectId = searchParams.get("project_id") || "";

  // --- State ---
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [steps, setSteps] = useState<CodeStep[]>([]);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [planMode, setPlanMode] = useState(false);

  const [conversationId, setConversationId] = useState<string | null>(paramConversationId || null);
  const [projectId, setProjectId] = useState<string | null>(paramProjectId || null);
  const [weblyProjectId, setWeblyProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("New Project");
  const [hasBuilt, setHasBuilt] = useState(false);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [githubBusy, setGithubBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const initRef = useRef(false);

  const { userId, credits, hasEnoughCredits, refreshCredits, loading: creditsLoading } = useCredits();

  // --- Load existing project ---
  useEffect(() => {
    if (!paramProjectId) return;
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, webly_project_id, conversation_id")
        .eq("id", paramProjectId)
        .maybeSingle();
      if (data) {
        setProjectName(data.name || "Project");
        setWeblyProjectId((data as any).webly_project_id || null);
        if (data.conversation_id) setConversationId(data.conversation_id);
        setHasBuilt(true);
      }
    })();
  }, [paramProjectId]);

  // --- Load conversation messages ---
  useEffect(() => {
    if (!paramConversationId) return;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("role, content, created_at")
        .eq("conversation_id", paramConversationId)
        .order("created_at", { ascending: true });
      if (data?.length) setMessages(data.map(m => ({ role: m.role as any, content: m.content })));
    })();
  }, [paramConversationId]);

  // --- Auto-fire initial prompt ---
  useEffect(() => {
    if (initRef.current || !initialPrompt || messages.length > 0 || creditsLoading) return;
    initRef.current = true;
    handleSend(initialPrompt);
  }, [initialPrompt, creditsLoading]);

  // --- Step helpers ---
  const addStep = async (type: StepType, text: string, file?: string): Promise<CodeStep> => {
    const step = makeStep(type, text, file);
    setSteps(prev => prev.map(s => s.status === "active" ? { ...s, status: "done" as const } : s).concat(step));
    setActiveStepId(step.id);
    await new Promise(r => setTimeout(r, 250));
    return step;
  };
  const completeAllSteps = () => {
    setSteps(prev => prev.map(s => ({ ...s, status: "done" as const })));
    setActiveStepId(null);
  };

  // --- Conversation helper ---
  const ensureConversation = async (firstMessage: string) => {
    if (conversationId) return conversationId;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const title = firstMessage.slice(0, 50) || "Code Project";
    const { data } = await supabase
      .from("conversations")
      .insert({ title, mode: "code", user_id: user.id } as any)
      .select("id").single();
    if (data) { setConversationId(data.id); return data.id; }
    return null;
  };

  // --- AI two-word project name ---
  const generateProjectName = async (prompt: string): Promise<string> => {
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/name-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ prompt }),
      });
      const data = await r.json().catch(() => ({} as any));
      const name = (data?.name || "").trim();
      if (name) return name;
    } catch {}
    return prompt.split(/\s+/).slice(0, 2).join(" ").slice(0, 30) || "New Project";
  };

  // --- Project helper ---
  const ensureProject = async (firstMessage: string, weblyId: string, convId: string | null) => {
    if (projectId) {
      await supabase.from("projects").update({
        webly_project_id: weblyId, status: "ready", updated_at: new Date().toISOString(),
      }).eq("id", projectId);
      return projectId;
    }
    if (!userId) return null;
    const name = await generateProjectName(firstMessage);
    const { data } = await supabase.from("projects").insert({
      user_id: userId,
      name,
      description: firstMessage.slice(0, 200),
      status: "ready",
      webly_project_id: weblyId,
      conversation_id: convId,
    } as any).select("id").single();
    if (data) {
      setProjectId(data.id);
      setProjectName(name);
      return data.id;
    }
    return null;
  };

  // Capture a thumbnail from the rendered HTML using ScreenshotOne edge function.
  const captureScreenshot = async (pid: string, files: Record<string, string>) => {
    try {
      const html = files["/index.html"] || files["index.html"] || Object.values(files).find(v => typeof v === "string" && v.includes("<html")) || "";
      if (!html) return;
      const r = await fetch(`${SUPABASE_URL}/functions/v1/screenshot-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ html, viewportWidth: 1280, viewportHeight: 800, fileName: `project-${pid}` }),
      });
      const data = await r.json().catch(() => ({} as any));
      if (data?.success && data.preview_url) {
        await supabase.from("projects").update({ thumbnail_url: data.preview_url } as any).eq("id", pid);
      }
    } catch {}
  };

  // --- Persist a single message to DB ---
  const persistMessage = async (convId: string | null, msg: ChatMsg) => {
    if (!convId) return;
    try {
      await supabase.from("messages").insert({
        conversation_id: convId,
        role: msg.role,
        content: msg.content,
      } as any);
    } catch {}
  };

  // --- Handle API key submission from inline card ---
  const handleApiKeySubmit = async (keyName: string, keyValue: string) => {
    if (!userId || !keyName) return;
    try {
      await supabase.from("code_integrations").upsert({
        user_id: userId,
        project_id: projectId,
        provider: keyName,
        config: { api_key: keyValue },
      } as any, { onConflict: "user_id,project_id,provider" });
      setMessages(prev => prev.map(m =>
        m.type === "api_key_request" && m.apiKeyName === keyName ? { ...m, apiKeyResolved: true } : m
      ));
      toast.success(`${keyName} saved`);
    } catch {
      toast.error("Failed to save key");
    }
  };

  // --- Send message / build ---
  const handleSend = async (textOverride?: string) => {
    const msgText = textOverride ?? input;
    if (!msgText.trim() || isLoading) return;
    if (creditsLoading) return;
    if (credits !== null && !hasEnoughCredits(BUILD_CREDIT_COST)) {
      toast.error("Not enough MC. You need 5 MC to build.");
      return;
    }

    if (!textOverride) setInput("");
    const userMsg: ChatMsg = { role: "user", content: msgText };
    setMessages(prev => [...prev, userMsg]);
    setAttachments([]);
    setIsLoading(true);
    setSteps([]);

    const startedAt = Date.now();
    const convId = await ensureConversation(msgText);
    persistMessage(convId, userMsg);

    // Deduct
    if (userId) {
      const { data: ded } = await supabase.functions.invoke("deduct-credits", {
        body: { amount: BUILD_CREDIT_COST, action_type: "code_build", description: "Webly build" },
      });
      if (!ded?.success) {
        toast.error(ded?.error || "Not enough credits");
        setIsLoading(false);
        return;
      }
      refreshCredits();
    }

    await addStep("thinking", "Thinking");

    // ALWAYS reuse the existing webly project id when present so follow-ups
    // become edits to the same site, not a brand new project.
    const wpid = weblyProjectId || `megsy-${userId?.slice(0, 8) || "u"}-${Date.now().toString(36)}`;
    if (!weblyProjectId) setWeblyProjectId(wpid);

    let buildError: string | null = null;
    let assistantBuffer = "";
    const flushAssistant = () => {
      if (!assistantBuffer.trim()) return;
      const finalText = assistantBuffer.trim();
      assistantBuffer = "";
      const m: ChatMsg = { role: "assistant", content: finalText, type: "build" };
      setMessages(prev => [...prev, m]);
      persistMessage(convId, m);
    };

    try {
      // Pure pass-through: only what Webly needs. No system prompt, no fake messages.
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/webly-proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({
          action: "generate",
          project_id: wpid,
          prompt: msgText,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errBody = await resp.json().catch(() => ({} as any));
        buildError = errBody?.error || "Build service is busy. Try again shortly.";
        throw new Error(buildError);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const seenFiles = new Set<string>();
      let generatedFiles: Record<string, string> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const ev = JSON.parse(data);
            // Stream text from the backend straight into the chat.
            if (ev.type === "text" && typeof ev.delta === "string") {
              assistantBuffer += ev.delta;
            } else if (ev.type === "status" && typeof ev.message === "string") {
              await addStep("thinking", ev.message);
            } else if (ev.type === "file_start" && ev.path && !seenFiles.has(ev.path)) {
              seenFiles.add(ev.path);
              await addStep("creating", "Creating", ev.path);
            } else if (ev.type === "file_done" && ev.path) {
              if (typeof ev.content === "string") generatedFiles[ev.path] = ev.content;
              setSteps(prev => prev.map(s => s.file === ev.path ? { ...s, status: "done" as const } : s));
            } else if (ev.type === "done" && ev.files && typeof ev.files === "object") {
              generatedFiles = { ...generatedFiles, ...(ev.files as Record<string, string>) };
            } else if (ev.type === "verify_start") {
              await addStep("searching", "Verifying");
            } else if (ev.type === "verify_done") {
              await addStep("done", ev.ok ? "Verified" : "Fixing");
            } else if (ev.type === "request_api_key" && ev.name) {
              flushAssistant();
              const keyMsg: ChatMsg = {
                role: "assistant",
                type: "api_key_request",
                content: `Need API key: ${ev.name}`,
                apiKeyName: ev.name,
                apiKeyDescription: ev.description || ev.message || "Required to continue.",
              };
              setMessages(prev => [...prev, keyMsg]);
              persistMessage(convId, keyMsg);
            }
          } catch {}
        }
      }

      completeAllSteps();
      setHasBuilt(true);
      flushAssistant();

      const pid = await ensureProject(msgText, wpid, convId);
      if (pid && Object.keys(generatedFiles).length > 0) {
        await supabase.from("projects").update({ files_snapshot: generatedFiles as any }).eq("id", pid);
        // Fire-and-forget thumbnail capture
        captureScreenshot(pid, generatedFiles);
      }
    } catch (e) {
      completeAllSteps();
      flushAssistant();
      const durationMs = Date.now() - startedAt;
      const errMsg: ChatMsg = {
        role: "assistant",
        content: buildError || (e instanceof Error ? e.message : "Build failed."),
        meta: { durationMs, credits: 0 },
      };
      setMessages(prev => [...prev, errMsg]);
      persistMessage(convId, errMsg);
      // Refund
      if (userId) {
        supabase.functions.invoke("deduct-credits", {
          body: { amount: -BUILD_CREDIT_COST, action_type: "code_build_refund", description: "Refund: build failed" },
        }).then(() => refreshCredits()).catch(() => {});
      }
    }

    setIsLoading(false);
  };

  // --- Attachment handlers ---
  const handleFilePick = (kind: "file" | "image" | "camera") => {
    setPlusMenuOpen(false);
    if (kind === "camera") cameraInputRef.current?.click();
    else fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => {
        setAttachments(prev => [...prev, {
          name: f.name,
          type: f.type.startsWith("image") ? "image" : "file",
          data: String(ev.target?.result || ""),
        }]);
      };
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };

  // --- Rename ---
  const handleRename = async () => {
    if (!projectId || !renameValue.trim()) { setRenameOpen(false); return; }
    const newName = renameValue.trim().slice(0, 80);
    await supabase.from("projects").update({ name: newName }).eq("id", projectId);
    setProjectName(newName);
    setRenameOpen(false);
    setProjectMenuOpen(false);
    toast.success("Project renamed");
  };

  // --- Supabase connect (fixed-text UX) ---
  const [supaUrl, setSupaUrl] = useState("");
  const [supaKey, setSupaKey] = useState("");
  const handleSupabaseConnect = async () => {
    if (!supaUrl.trim() || !supaKey.trim() || !userId) return;
    // Save to integrations (server-only readable from edge functions)
    await supabase.from("code_integrations").upsert({
      user_id: userId,
      project_id: projectId,
      provider: "supabase",
      config: { url: supaUrl.trim(), anon_key: supaKey.trim() },
    } as any, { onConflict: "user_id,project_id,provider" });

    setSupabaseModalOpen(false);
    setSupaUrl(""); setSupaKey("");
    toast.success("Backend connected");
  };

  // --- GitHub push ---
  const handleGithubPush = async () => {
    setMoreMenuOpen(false);
    if (!hasBuilt || !weblyProjectId) {
      toast.error("Build something first.");
      return;
    }
    setGithubBusy(true);
    try {
      // Prefer local snapshot from DB (works for both upstream + fallback builds)
      let files: Record<string, string> = {};
      if (projectId) {
        const { data } = await supabase.from("projects").select("files_snapshot").eq("id", projectId).maybeSingle();
        const snap = (data as any)?.files_snapshot;
        if (snap && typeof snap === "object") files = snap;
      }
      // Fallback: try webly upstream (silent on 404)
      if (Object.keys(files).length === 0) {
        try {
          const filesResp = await fetch(`${WEBLY_BASE}/webly-site/${weblyProjectId}/__files`);
          if (filesResp.ok) {
            const filesData = await filesResp.json().catch(() => ({}));
            files = filesData?.files || filesData || {};
          }
        } catch {}
      }

      if (!files || Object.keys(files).length === 0) {
        toast.error("No files to push yet. Build the project first.");
        setGithubBusy(false);
        return;
      }

      const r = await fetch(`${SUPABASE_URL}/functions/v1/github-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({
          user_id: userId,
          project_name: projectName,
          description: `Built with Megsy AI — ${projectName}`,
          files,
        }),
      });
      const data = await r.json();
      if (data.ok && data.repo_url) {
        await supabase.from("projects").update({ repo_url: data.repo_url }).eq("id", projectId!);
        toast.success("Pushed to GitHub");
        window.open(data.repo_url, "_blank", "noopener,noreferrer");
      } else if (data.needs_oauth) {
        toast.error("Connect your GitHub account first (coming soon).");
      } else {
        toast.error("GitHub push failed.");
      }
    } catch {
      toast.error("GitHub push failed.");
    }
    setGithubBusy(false);
  };

  const handleOpenPreview = () => {
    if (!weblyProjectId || !projectId) {
      toast.info("Build something first to preview.");
      return;
    }
    navigate(`/code/preview/${projectId}?webly=${weblyProjectId}${conversationId ? `&conversation_id=${conversationId}` : ""}`);
  };

  return (
    <AppLayout
      onSelectConversation={(id) => navigate(`/code/workspace?conversation_id=${id}`)}
      onNewChat={() => navigate("/code")}
      activeConversationId={conversationId}
    >
      <div className="relative h-[100dvh] w-full bg-background overflow-hidden flex flex-col">
        <AppSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onNewChat={() => navigate("/code")}
          onSelectConversation={(id) => navigate(`/code/workspace?conversation_id=${id}`)}
          activeConversationId={conversationId}
          currentMode="code"
        />

        {/* Floating header — no background, no border */}
        <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3 pointer-events-none">
          <button
            onClick={() => setSidebarOpen(true)}
            className="pointer-events-auto h-10 w-10 rounded-full flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-card/60 backdrop-blur-md transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setProjectMenuOpen(true)}
            className="pointer-events-auto px-4 py-2 rounded-full liquid-glass-button text-sm font-semibold text-foreground hover:scale-[1.02] transition-all max-w-[55vw] truncate flex items-center gap-1.5"
          >
            {projectName}
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {/* Preview button — top right */}
          <button
            onClick={handleOpenPreview}
            disabled={!hasBuilt}
            className="pointer-events-auto h-10 w-10 rounded-full liquid-glass-button flex items-center justify-center text-foreground/80 hover:text-foreground hover:scale-105 transition-all disabled:opacity-40"
            aria-label="Preview"
          >
            <Eye className="w-5 h-5" />
          </button>
        </div>

        {/* Project bottom sheet — full glassmorphism, click outside to close */}
        <AnimatePresence>
          {projectMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setProjectMenuOpen(false)}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed bottom-0 inset-x-0 z-50 rounded-t-[28px] liquid-glass-milk px-5 pt-3 pb-8 max-h-[80vh] overflow-y-auto"
              >
                <div className="w-10 h-1 rounded-full bg-foreground/20 mx-auto mb-4" />

                {/* Credits row with bar */}
                <div className="rounded-2xl liquid-glass-button px-4 py-3.5 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">Credits</span>
                    <span className="text-sm font-semibold text-foreground/80">{credits ?? "—"} left</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary via-fuchsia-500 to-amber-500 transition-all"
                      style={{ width: `${Math.min(100, ((credits ?? 0) / 100) * 100)}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => { setProjectMenuOpen(false); navigate("/settings"); }}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] text-foreground liquid-glass-hover transition-colors"
                >
                  <Settings className="w-5 h-5" /> Settings
                </button>
                <button
                  onClick={() => { setProjectMenuOpen(false); setRenameValue(projectName); setRenameOpen(true); }}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] text-foreground liquid-glass-hover transition-colors"
                >
                  <Pencil className="w-5 h-5" /> Rename project
                </button>
                <button
                  onClick={() => { setProjectMenuOpen(false); handleOpenPreview(); }}
                  disabled={!hasBuilt}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] text-foreground liquid-glass-hover transition-colors disabled:opacity-40"
                >
                  <Eye className="w-5 h-5" /> Open preview
                </button>
                <button
                  onClick={() => { setProjectMenuOpen(false); handleGithubPush(); }}
                  disabled={githubBusy || !hasBuilt}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] text-foreground liquid-glass-hover transition-colors disabled:opacity-40"
                >
                  {githubBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Github className="w-5 h-5" />}
                  {githubBusy ? "Pushing to GitHub..." : "Push to GitHub"}
                </button>
                <button
                  onClick={() => { setProjectMenuOpen(false); setIntegrationsOpen(true); }}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] text-foreground liquid-glass-hover transition-colors"
                >
                  <Database className="w-5 h-5 text-emerald-500" /> Supabase settings
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* + bottom sheet */}
        <AnimatePresence>
          {plusMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setPlusMenuOpen(false)}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed bottom-0 inset-x-0 z-50 rounded-t-[28px] liquid-glass-milk px-5 pt-3 pb-8"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-10 h-1 rounded-full bg-foreground/20 mx-auto mb-4" />
                <button onClick={() => { setPlusMenuOpen(false); setIntegrationsOpen(true); }} className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] text-foreground liquid-glass-hover transition-colors">
                  <Database className="w-5 h-5 text-emerald-500" /> Connect Supabase
                </button>
                <button onClick={() => handleFilePick("image")} className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] text-foreground liquid-glass-hover transition-colors">
                  <ImageIcon className="w-5 h-5" /> Attach image
                </button>
                <button onClick={() => handleFilePick("file")} className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] text-foreground liquid-glass-hover transition-colors">
                  <Paperclip className="w-5 h-5" /> Attach file
                </button>
                <button onClick={() => handleFilePick("camera")} className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] text-foreground liquid-glass-hover transition-colors">
                  <Camera className="w-5 h-5" /> Take photo
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ... bottom sheet — integrations */}
        <AnimatePresence>
          {moreMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setMoreMenuOpen(false)}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed bottom-0 inset-x-0 z-50 rounded-t-[28px] liquid-glass-milk px-5 pt-3 pb-8"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-10 h-1 rounded-full bg-foreground/20 mx-auto mb-4" />
                <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-3 py-1.5">Integrations</p>
                <button
                  onClick={() => { setMoreMenuOpen(false); setIntegrationsOpen(true); }}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] text-foreground liquid-glass-hover transition-colors"
                >
                  <Database className="w-5 h-5 text-emerald-500" /> Connect Supabase
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); setIntegrationsOpen(true); }}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] text-foreground liquid-glass-hover transition-colors"
                >
                  <Github className="w-5 h-5" /> Connect GitHub
                </button>
                <button
                  onClick={handleGithubPush}
                  disabled={githubBusy}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] text-foreground liquid-glass-hover transition-colors disabled:opacity-40"
                >
                  {githubBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Github className="w-5 h-5" />}
                  {githubBusy ? "Pushing..." : "Push current to GitHub"}
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-hidden pt-14 pb-44 min-h-0">
          <CodeChatContainer messages={messages} steps={steps} activeStepId={activeStepId} isThinking={isLoading && steps.length === 0} onSubmitApiKey={handleApiKeySubmit} />
        </div>

        {/* Preview moved to top-right header */}

        {/* Bottom sticky input */}
        <div className="absolute bottom-0 inset-x-0 z-20 px-3 pb-3 pt-6 bg-gradient-to-t from-background via-background/95 to-transparent">
          <div className="max-w-2xl mx-auto">
            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 px-2">
                {attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-card border border-border/60 text-xs">
                    {a.type === "image" ? <ImageIcon className="w-3 h-3" /> : <Paperclip className="w-3 h-3" />}
                    <span className="truncate max-w-[100px]">{a.name}</span>
                    <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-[28px] bg-card/95 backdrop-blur-2xl border border-border/60 shadow-2xl shadow-primary/5 p-3">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={hasBuilt ? "Describe your changes..." : "Describe your project..."}
                rows={1}
                className="w-full bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground/60 px-2 py-1.5 max-h-32"
              />

              {/* Bottom toolbar — order: +, ..., Plan, ..., Send */}
              <div className="flex items-center gap-1.5 mt-1">
                <button
                  onClick={() => { setPlusMenuOpen(true); setMoreMenuOpen(false); }}
                  className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                  aria-label="Add"
                >
                  <Plus className="w-5 h-5" />
                </button>

                <button
                  onClick={() => { setMoreMenuOpen(true); setPlusMenuOpen(false); }}
                  className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                  aria-label="More"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                {/* Plan mode — clean bordered button, no icon */}
                <button
                  onClick={() => setPlanMode(p => !p)}
                  className={`h-9 px-4 rounded-full text-xs font-semibold transition-all border ${
                    planMode
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-foreground border-border/70 hover:border-foreground/40 bg-transparent"
                  }`}
                >
                  Plan
                </button>

                <div className="flex-1" />

                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-25 flex items-center justify-center"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

        {/* Rename dialog */}
        <AnimatePresence>
          {renameOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setRenameOpen(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-sm rounded-3xl liquid-glass-milk p-5"
              >
                <h3 className="text-sm font-semibold text-foreground mb-3">Rename project</h3>
                <input
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleRename(); }}
                  placeholder="Project name"
                  autoFocus
                  className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground border border-border outline-none focus:border-primary transition-colors"
                />
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setRenameOpen(false)} className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-accent/60 transition-colors">Cancel</button>
                  <button onClick={handleRename} disabled={!renameValue.trim()} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 transition-colors">Save</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Supabase connect dialog */}
        <AnimatePresence>
          {supabaseModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSupabaseModalOpen(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md rounded-3xl liquid-glass-milk p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-base font-semibold text-foreground">Connect Backend</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Paste your Supabase project URL and anon key. They are stored securely and used only by the AI when building your backend.
                </p>
                <div className="space-y-2.5">
                  <input
                    type="url" value={supaUrl} onChange={e => setSupaUrl(e.target.value)}
                    placeholder="https://xxxx.supabase.co"
                    className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground border border-border outline-none focus:border-primary transition-colors"
                  />
                  <input
                    type="password" value={supaKey} onChange={e => setSupaKey(e.target.value)}
                    placeholder="Anon key (eyJhbGc...)"
                    className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground border border-border outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => setSupabaseModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium">Cancel</button>
                  <button
                    onClick={handleSupabaseConnect}
                    disabled={!supaUrl.trim() || !supaKey.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Connect
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
      <ConnectIntegrationsSheet
        open={integrationsOpen}
        onClose={() => setIntegrationsOpen(false)}
        userId={userId}
        projectId={projectId}
      />
    </AppLayout>
  );
};

export default CodeWorkspace;
