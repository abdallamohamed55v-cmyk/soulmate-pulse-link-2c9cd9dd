import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Highlighter } from "@/components/magicui/highlighter";
import UnlockProButton from "@/components/UnlockProButton";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Plus, Camera, Image, FileUp, X, GraduationCap, ShoppingCart, ArrowDown, ChevronDown, ChevronLeft, Star, Pencil, Trash2, FolderPlus, Globe, Lock, Share2, MoreVertical, Pin, UserPlus, Copy, Mail, Link2, Users, Loader2, NotebookPen, ClipboardList, CalendarDays, Timer, Wrench, Lightbulb, Mic2, Sparkles, BookOpen, Check, Cpu, Bot, Atom, Music2, Layers, ClipboardCheck, Volume2, Play } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppSidebar from "@/components/AppSidebar";
import AppLayout from "@/layouts/AppLayout";
import ChatMessage from "@/components/ChatMessage";
import AnimatedInput from "@/components/AnimatedInput";
import ThinkingLoader from "@/components/ThinkingLoader";
import FancyButton from "@/components/FancyButton";
import type { AgentDef, AgentModel } from "@/lib/agentRegistry";

import { streamChat } from "@/lib/streamChat";
import { useSkills } from "@/hooks/useSkills";


import DeepResearchToggle from "@/components/research/DeepResearchToggle";
import LearnModeToggle from "@/components/learn/LearnModeToggle";
import InChatTimerCard from "@/components/learn/InChatTimerCard";
import AnimatedHeadline from "@/components/research/AnimatedHeadline";
import ClarifyDialog, { type ClarifyQuestion } from "@/components/research/ClarifyDialog";
import ConnectorsDialog from "@/components/ConnectorsDialog";
import GlowButton from "@/components/GlowButton";
import { ChatFollowups } from "@/components/chat/ChatFollowups";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription } from
"@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Message {
  role: "user" | "assistant";
  content: string;
  clientId?: string;
  images?: string[];
  products?: ProductResult[];
  attachedImages?: string[];
  attachedFiles?: {name: string;type: string;}[];
  liked?: boolean | null;
  id?: string;
  user_id?: string | null;
  senderName?: string | null;
  senderAvatar?: string | null;
  mode?: "normal" | "learning" | "shopping" | "deep-research";
}

interface ProductResult {
  title: string;
  price: string;
  image?: string;
  link?: string;
  seller?: string;
  rating?: string | null;
  delivery?: string | null;
}


const EMPTY_READERS: { user_id: string; name?: string; avatar?: string }[] = [];
const EMPTY_REACTIONS: { id: string; emoji: string; user_id: string }[] = [];

type ChatMode = "normal" | "learning" | "shopping" | "deep-research";

const MODE_PROMPTS: Record<ChatMode, string> = {
  normal: "",
  learning: "You are in Learning Mode. Explain everything step by step with examples, analogies, and clear breakdowns. Make complex topics easy to understand. Use bullet points, numbered steps, and structured format.",
  shopping: "You are in Shopping Mode. Help the user find the best products, compare prices, suggest alternatives, and provide purchase recommendations. Include pros/cons when comparing items.",
  "deep-research": ""
};

const PegtopIcon = ({ className }: {className?: string;}) =>
<svg className={className} width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 5 L60 40 L95 50 L60 60 L50 95 L40 60 L5 50 L40 40 Z" fill="currentColor" />
  </svg>;


const MEGSY_MODEL = "google/gemini-2.5-flash-lite-preview-09-2025";

const stripLeakedToolText = (value: string) => String(value || "")
  .replace(/```(?:tool_code|tool_call|function_call|python)?[\s\S]*?(?:default_api|tool_code|tool_call|function_call)[\s\S]*?(?:```|$)/gi, "")
  .replace(/<tool_call[\s\S]*?(?:<\/tool_call>|$)/gi, "")
  .replace(/<function_call[\s\S]*?(?:<\/function_call>|$)/gi, "")
  .replace(/\$\{tool_code\}\s*/gi, "")
  .replace(/(?:^|\n)[^\n]*(?:print\s*\(\s*)?default_api\.[^\n]*(?:\n|$)/gi, "\n");

const sanitizeLeakedToolText = (value: string) => stripLeakedToolText(value).trim();

const makeLeakedToolStreamSanitizer = () => {
  let buffer = "";
  let droppingToolLine = false;
  const markers = ["${tool_code}", "print(default_api.", "default_api.", "<tool_call", "<function_call", "```tool_code", "```tool_call", "```function_call", "```python"];
  return (chunk: string, force = false) => {
    buffer += chunk;
    const lower = buffer.toLowerCase();
    if (droppingToolLine) {
      const nl = buffer.indexOf("\n");
      if (nl === -1) {
        buffer = "";
        return "";
      }
      buffer = buffer.slice(nl + 1);
      droppingToolLine = false;
    }
    const toolLineMatch = buffer.match(/(?:^|\n)[^\n]*(?:\$\{tool_code\}|default_api\.|print\s*\(\s*default_api\.)/i);
    if (toolLineMatch && toolLineMatch.index !== undefined) {
      const start = toolLineMatch.index + (toolLineMatch[0].startsWith("\n") ? 1 : 0);
      const safePrefix = stripLeakedToolText(buffer.slice(0, start));
      const nl = buffer.indexOf("\n", start);
      if (nl === -1) {
        buffer = "";
        droppingToolLine = !force;
        return safePrefix;
      }
      buffer = buffer.slice(nl + 1);
      return safePrefix + stripLeakedToolText(buffer);
    }
    if (force) {
      const safe = markers.some((marker) => marker.startsWith(lower.trim())) ? "" : buffer;
      buffer = "";
      return stripLeakedToolText(safe);
    }
    if (!force) {
      const max = Math.min(80, buffer.length);
      for (let len = max; len > 0; len--) {
        const suffix = lower.slice(-len);
        if (markers.some((marker) => marker.startsWith(suffix))) {
          const safe = buffer.slice(0, -len);
          buffer = buffer.slice(-len);
          return stripLeakedToolText(safe);
        }
      }
    }
    const safe = buffer;
    buffer = "";
    return stripLeakedToolText(safe);
  };
};

const normalizeStatusLabel = (status: string) => {
  if (!status.trim()) return "";
  const lower = status.toLowerCase();
  const blocklist = ["web_search", "browse_website", "shopping_search", "convert_currency", "generate_image", "generate_video", "generate_voice", "canva_create_slides", "running ", "tool_call", "function_call"];
  if (blocklist.some(b => lower.includes(b))) return "Working on your request...";
  if (/browser task failed|browser task timed out|working on it|navigating|loading page/i.test(lower)) return "Checking other sources...";
  if (/https?:\/\//i.test(status)) return "Searching the web...";
  if (/writing the report/i.test(lower)) return "Writing the final report...";
  if (/analyzing products/i.test(lower)) return "Comparing the best options...";
  if (/searching for products|searching stores/i.test(lower)) return "Searching stores...";
  if (/consulting/i.test(lower)) return "Checking trusted references...";
  if (/reading top sources|deep_read/i.test(lower)) return "Reading sources in depth...";
  if (/searching:|gathering/i.test(lower)) return "Searching the web...";
  if (/found\s+\d+\s+(results|products)/i.test(lower)) return "Reviewing the results...";
  if (/search completed/i.test(lower)) return "Search completed.";
  if (/browsing completed/i.test(lower)) return "Browsing completed.";
  if (/reviewing/i.test(lower)) return "Reviewing the sources...";
  if (/opening|starting|browser|megsy computer|navigat|clicking|scrolling|extracting|smart browser/i.test(lower)) return "Searching the web...";
  return "Working on your request...";
};

const DEEP_RESEARCH_STATUS_FALLBACKS = [
  "Mapping research angles...",
  "Searching trusted sources...",
  "Reading source material...",
  "Comparing evidence...",
  "Building the final report...",
];

const ChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState("");
  const [searchEnabled, setSearchEnabled] = useState(true);
  const { mySkills, librarySkills, enabledSkills, toggleEnabled } = useSkills();
  const [megsyTier, setMegsyTier] = useState<"lite" | "pro" | "max">(() => {
    if (typeof window === "undefined") return "lite";
    return (localStorage.getItem("megsy_tier") as any) || "lite";
  });
  const [userPlan, setUserPlan] = useState<string>("free");
  const [computerUseEnabled, setComputerUseEnabled] = useState(true);
  const [chatMode, setChatMode] = useState<ChatMode>("normal");
  const [attachedFiles, setAttachedFiles] = useState<{name: string;type: string;data: string;}[]>([]);
  const [searchStatus, setSearchStatus] = useState<string>("");
  const [narrations, setNarrations] = useState<string[]>([]);
  const [clarifyQs, setClarifyQs] = useState<ClarifyQuestion[] | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareMode, setShareMode] = useState<"private" | "public">("public");
  const [isShared, setIsShared] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [generatedShareUrl, setGeneratedShareUrl] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState<{title: string;options: string[];allowText?: boolean;}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [members, setMembers] = useState<{ id: string; email: string; role: string; name?: string; avatar?: string }[]>([]);
  const [conversationOwnerId, setConversationOwnerId] = useState<string | null>(null);
  const [chatUserId, setChatUserId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<{ id: string; name: string; avatar: string | null }[]>([]);
  const [remoteAiBusy, setRemoteAiBusy] = useState<{ name: string } | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [systemEvents, setSystemEvents] = useState<{ id: string; text: string; at: number }[]>([]);
  // Read receipts: messageId -> array of readers
  const [messageReads, setMessageReads] = useState<Record<string, { user_id: string; name?: string; avatar?: string }[]>>({});
  // Reactions: messageId -> array of {emoji, users}
  const [messageReactions, setMessageReactions] = useState<Record<string, { id: string; emoji: string; user_id: string }[]>>({});
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  // Mentions
  const [mentionQuery, setMentionQuery] = useState<{ q: string; start: number } | null>(null);
  // Unread tracking for sound + title
  const [unreadCount, setUnreadCount] = useState(0);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const originalTitleRef = useRef<string>("");
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const markedReadRef = useRef<Set<string>>(new Set());
  const [selectedModel, setSelectedModel] = useState<AgentModel | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentDef | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [plusView, setPlusView] = useState<"main" | "tools" | "models" | "skills" | "music" | "timer">("main");
  const [studyMusic, setStudyMusic] = useState<{ kind: string | null }>({ kind: null });
  const [readAloud, setReadAloud] = useState(false);
  const [studyTimers, setStudyTimers] = useState<Array<{ id: string; totalSec: number; startedAt: number; paused: boolean; pausedRemaining: number | null }>>([]);
  const [timerInputMin, setTimerInputMin] = useState<number>(25);
  const studyAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicFileInputRef = useRef<HTMLInputElement | null>(null);
  const [userTracks, setUserTracks] = useState<Array<{ id: string; name: string; storage_path: string }>>([]);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [userIntegrations, setUserIntegrations] = useState<string[]>([]);

  const pushNarration = useCallback((text: string) => {
    const t = String(text || "").trim();
    if (!t) return;
    setNarrations((prev) => (prev[prev.length - 1] === t ? prev : [...prev, t]));
  }, []);

  const buildInitialResearchNarration = useCallback((text: string) => {
    const topic = (text || "Deep Research").trim().replace(/\s+/g, " ").slice(0, 90);
    if (/[\u0600-\u06FF]/.test(topic)) {
      return `تمام، فهمت إنك عايز بحث عميق عن: «${topic}». هبدأ أجمع المصادر الحقيقية وأقولك كل خطوة بتحصل.`;
    }
    return `Got it — you want deep research about: “${topic}”. I’ll start gathering real sources and keep you updated step by step.`;
  }, []);

  const buildFinalResearchNarration = useCallback((text: string) => {
    return /[\u0600-\u06FF]/.test(text)
      ? "خلصت البحث وجمعت المصادر وركّبت التقرير النهائي بشكل منظم. تقدر تفتح المعاينة وتشوف النسخة المناسبة للقراءة."
      : "Research is complete — I gathered sources, cross-checked them, and assembled the final structured report for preview.";
  }, []);

  // Fetch user info for memory + welcome message
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setChatUserId(user.id);
      const { data: profile } = await supabase.from("profiles").select("display_name, plan").eq("id", user.id).maybeSingle();
      const name = (profile as any)?.display_name || (user.user_metadata?.full_name as string) || (user.email?.split("@")[0] ?? "");
      const firstName = (name || "").split(/\s+/)[0];
      setUserName(firstName);
      setUserPlan((profile as any)?.plan || "free");
      // Pull preferred tier from personalization
      const { data: pers } = await supabase.from("ai_personalization").select("preferred_tier").eq("user_id", user.id).maybeSingle();
      const prefTier = (pers as any)?.preferred_tier;
      if (prefTier && ["lite", "pro", "max"].includes(prefTier)) {
        setMegsyTier(prefTier as any);
        localStorage.setItem("megsy_tier", prefTier);
      }
    });
  }, []);

  // Reset plus menu sub-view whenever it closes
  useEffect(() => {
    if (!plusMenuOpen) setPlusView("main");
  }, [plusMenuOpen]);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
    if (distFromBottom < 100) setNewMessagesCount(0);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setNewMessagesCount(0);
  }, []);

  // Only auto-scroll on user's own new message, not during streaming
  const lastMsgCountRef = useRef(0);
  useEffect(() => {
    const prevCount = lastMsgCountRef.current;
    lastMsgCountRef.current = messages.length;
    // Scroll only when user sends a new message (count increased and last is user)
    if (messages.length > prevCount && messages.length > 0 && messages[messages.length - 1].role === "user") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const createOrUpdateConversation = async (firstMessage: string) => {
    if (conversationId) return conversationId;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const title = firstMessage.slice(0, 50) || "New Chat";
    const mode = chatMode === "deep-research" ? "research" : (chatMode === "learning" ? "learning" : (chatMode === "shopping" ? "shopping" : "chat"));
    const { data } = await supabase.from("conversations").insert({ title, mode, model: MEGSY_MODEL, user_id: user.id } as any).select("id").single();
    if (data) {setConversationId(data.id);setConversationTitle(title);return data.id;}
    return null;
  };

  const saveMessage = async (convId: string, role: string, content: string, images?: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("messages").insert({ conversation_id: convId, role, content, images: images || null, user_id: user?.id || null } as any).select("id").single();
    return (data as any)?.id as string | undefined;
  };

  // Stable color palette for member bubbles
  const MEMBER_COLORS = [
    { bg: "#2563eb", text: "#ffffff" }, // blue
    { bg: "#10b981", text: "#ffffff" }, // emerald
    { bg: "#f59e0b", text: "#1a1a1a" }, // amber
    { bg: "#ef4444", text: "#ffffff" }, // red
    { bg: "#8b5cf6", text: "#ffffff" }, // violet
    { bg: "#ec4899", text: "#ffffff" }, // pink
    { bg: "#06b6d4", text: "#ffffff" }, // cyan
    { bg: "#84cc16", text: "#1a1a1a" }, // lime
  ];
  const colorForUser = useCallback((userId?: string | null) => {
    if (!userId) return null;
    let h = 0;
    for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
    return MEMBER_COLORS[h % MEMBER_COLORS.length];
  }, []);

  const handleLikeMessage = useCallback((index: number, liked: boolean | null) => {
    setMessages((prev) => prev.map((m, i) => i === index ? { ...m, liked } : m));
  }, []);

  const loadConversation = async (id: string) => {
    setConversationId(id);
    setSearchStatus("");
    setPendingQuestions([]);
    setNarrations([]);
    setClarifyQs(null);
    setLoadingMessages(true);
    setMessages([]);
    setSystemEvents([]);
    const { data: conv } = await supabase.from("conversations").select("title, is_shared, share_id, is_pinned, mode, user_id").eq("id", id).single();
    if (conv) {
      setConversationTitle(conv.title || "Untitled");
      setIsShared(conv.is_shared || false);
      setShareId(conv.share_id || null);
      setShareMode(conv.is_shared ? "public" : "private");
      setIsPinned(!!conv.is_pinned);
      setConversationOwnerId((conv as any).user_id || null);
      const m = (conv as any).mode as string | undefined;
      if (m === "research") setChatMode("deep-research");
      else if (m === "learning") setChatMode("learning");
      else if (m === "shopping") setChatMode("shopping");
      else setChatMode("normal");
    }
    // Bump conversation to top of recent list (works for owner and members via RPC)
    supabase.rpc("bump_conversation" as any, { p_conversation_id: id }).then(() => {});
    const { data: msgs } = await supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true });
    if (msgs) {
      const senderIds = Array.from(new Set(msgs.map((m: any) => m.user_id).filter(Boolean)));
      const senderMap: Record<string, { name: string | null; avatar: string | null }> = {};
      if (senderIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", senderIds as string[]);
        (profs || []).forEach((p: any) => { senderMap[p.id] = { name: p.display_name, avatar: p.avatar_url }; });
      }
      setMessages(msgs.map((m: any) => {
        const role = m.role as "user" | "assistant";
        const content = role === "assistant" ? sanitizeLeakedToolText(m.content) : m.content;
        if (role === "assistant" && !content && !m.images?.length) return null;
        return {
          role,
          content,
          images: m.images || undefined,
          liked: m.liked,
          id: m.id,
          user_id: m.user_id,
          senderName: m.user_id ? senderMap[m.user_id]?.name : null,
          senderAvatar: m.user_id ? senderMap[m.user_id]?.avatar : null,
          mode: role === "assistant" && (conv as any)?.mode === "research" ? "deep-research" : undefined,
        };
      }).filter(Boolean) as Message[]);
      setTimeout(() => scrollToBottom(), 150);
    }
    // Load members for this conversation so names/avatars render correctly
    const { data: memberRows } = await supabase.from("conversation_members").select("user_id, role").eq("conversation_id", id);
    if (memberRows && memberRows.length > 0) {
      const ids = memberRows.map((m: any) => m.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
      const profMap: Record<string, any> = {};
      (profs || []).forEach((p: any) => { profMap[p.id] = p; });
      setMembers(memberRows.map((m: any) => ({
        id: m.user_id, email: "", role: m.role,
        name: profMap[m.user_id]?.display_name, avatar: profMap[m.user_id]?.avatar_url,
      })));
    } else {
      setMembers([]);
    }
    setLoadingMessages(false);
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {abortControllerRef.current.abort();abortControllerRef.current = null;}
    setIsLoading(false);setIsThinking(false);setSearchStatus("");
    setMessages((prev) => prev[prev.length - 1]?.role === "assistant" && !prev[prev.length - 1]?.content ? prev.slice(0, -1) : prev);
  };

  const handleModeChange = (mode: ChatMode) => {
    const nextMode = chatMode === mode ? "normal" : mode;
    setChatMode(nextMode);
    if (nextMode !== "learning") {
      setStudyTimers([]);
      setStudyMusic({ kind: null });
    }
    if (mode === "deep-research") {
      setSearchEnabled(true);
    } else if (mode !== "normal") {
      setSearchEnabled(false);
    }
    setPlusMenuOpen(false);
  };

  const handleSearchToggle = () => {
    setSearchEnabled(!searchEnabled);
    if (!searchEnabled) setChatMode("normal");
    setPlusMenuOpen(false);
  };

  const handleStructuredAction = useCallback((text: string) => {
    if (text.startsWith("Connect:")) {
      setConnectorsOpen(true);
      return;
    }
    setInput(text);
    setTimeout(() => {
      setInput(text);
      void sendWithTextRef.current?.(text);
    }, 50);
  }, []);

  // Fix: detect smart questions from the LATEST assistant message when streaming completes
  useEffect(() => {
    if (isLoading) return; // Wait until streaming is done
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return;
    
    const jsonBlockRegex = /```json\s*\n?([\s\S]*?)\n?```/g;
    let match;
    const questions: {title: string;options: string[];allowText?: boolean;}[] = [];
    while ((match = jsonBlockRegex.exec(lastMsg.content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.type === "questions" && parsed.questions) {
          questions.push(...parsed.questions);
        }
      } catch {}
    }
    if (questions.length > 0) setPendingQuestions(questions);
  }, [messages, isLoading]);

  const handleQuestionAnswer = (answer: string) => {
    setPendingQuestions([]);
    handleSendWithText(answer);
  };

  const handleQuestionSkip = () => {
    setPendingQuestions([]);
  };

  const isSubmittingRef = useRef(false);
  const sendWithTextRef = useRef<(overrideText?: string) => Promise<void>>();

  const ownInsertedIdsRef = useRef<Set<string>>(new Set());

  const handleSendWithText = async (overrideText?: string) => {
    const text = overrideText || input;
    if (!text.trim() && attachedFiles.length === 0) return;
    if (isLoading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const imageAttachments = attachedFiles.filter((f) => f.type === "image");
    const fileAttachments = attachedFiles.filter((f) => f.type === "file");
    const localTurnId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const assistantMessageIndex = editingIndex !== null ? editingIndex + 1 : messages.length + 1;

    const userMsg: Message = {
      role: "user",
      clientId: `user-${localTurnId}`,
      content: text || (attachedFiles.length > 0 ? `[${attachedFiles.length} file(s) attached]` : ""),
      attachedImages: imageAttachments.map((f) => f.data),
      attachedFiles: fileAttachments.map((f) => ({ name: f.name, type: f.type })),
      mode: chatMode,
    };
    setMessages((prev) => {
      let base = prev;
      if (editingIndex !== null && prev[editingIndex]?.role === "user") {
        base = [...prev];
        base.splice(editingIndex, base[editingIndex + 1]?.role === "assistant" ? 2 : 1);
      }
      return [...base, userMsg, { role: "assistant", content: "", clientId: `assistant-${localTurnId}`, mode: chatMode }];
    });
    if (editingIndex !== null) { setEditingIndex(null); setEditingOriginal(""); }
    const userInput = text;
    setInput("");
    const currentFiles = [...attachedFiles];
    setAttachedFiles([]);
    setIsLoading(true);setIsThinking(true);
    setPendingQuestions([]);
    setNarrations([]);
    setClarifyQs(null);
    if (chatMode === "deep-research") {
      setNarrations([]);
    }

    const conversationPromise = createOrUpdateConversation(userInput || "File analysis").catch(() => null);
    void conversationPromise.then(async (resolvedConversationId) => {
      if (!resolvedConversationId) return;
      const insertedId = await saveMessage(resolvedConversationId, "user", userInput || `[${currentFiles.length} file(s) attached]`);
      if (insertedId) {
        ownInsertedIdsRef.current.add(insertedId);
        window.dispatchEvent(new CustomEvent("megsy:conversations-changed"));
        // Attach id to last user message locally so dedup by id works for echo
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.clientId === `user-${localTurnId}`);
          if (idx < 0) return prev;
          const next = [...prev]; next[idx] = { ...next[idx], id: insertedId, user_id: chatUserId || undefined }; return next;
        });
      }
      // Notify mentioned members
      if (members.length > 0 && userInput) {
        const mentions = Array.from(new Set((userInput.match(/@([A-Za-z0-9_]+)/g) || []).map((m) => m.slice(1).toLowerCase())));
        if (mentions.length > 0) {
          for (const mb of members) {
            if (!mb.name || mb.id === chatUserId) continue;
            const safe = mb.name.replace(/\s+/g, "_").toLowerCase();
            if (mentions.includes(safe)) {
              await supabase.rpc("create_notification" as any, {
                p_user_id: mb.id,
                p_type: "mention",
                p_title: `${userName || "Someone"} mentioned you`,
                p_message: userInput.slice(0, 140),
                p_metadata: { conversation_id: resolvedConversationId },
              });
            }
          }
        }
      }
    });

    // Broadcast that AI is now busy in this conversation
    if (presenceChannelRef.current && chatUserId) {
      presenceChannelRef.current.send({ type: "broadcast", event: "ai_busy", payload: { user_id: chatUserId, name: userName, busy: true } });
    }

    let assistantContent = "";
    let assistantRenderTimer: ReturnType<typeof setTimeout> | null = null;
    let hasStartedResponse = false;
    let hadStreamError = false;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let searchImages: string[] = [];
    let streamedProducts: ProductResult[] = [];
    const sanitizeStreamChunk = makeLeakedToolStreamSanitizer();

    const isToolMarkerChunk = (chunk: string) => {
      const trimmed = chunk.trim();
      return [
        "BROWSE_WEBSITE",
        "WEB_SEARCH",
        "SHOPPING_SEARCH",
        "CONVERT_CURRENCY",
        "GENERATE_IMAGE",
        "GENERATE_VIDEO",
        "GENERATE_VOICE",
        "CANVA_CREATE_SLIDES",
      ].includes(trimmed);
    };

    const flushAssistantUpdate = () => {
      assistantRenderTimer = null;
      const nextContent = assistantContent;
      setMessages((prev) => {
        const assistantIndex = prev.findIndex((m) => m.clientId === `assistant-${localTurnId}`);
        const targetIndex = assistantIndex >= 0 ? assistantIndex : prev.length - 1;
        const last = prev[targetIndex];
        if (last?.role === "assistant") {
          if (last.content === nextContent && (last.products || streamedProducts) === (last.products ? last.products : streamedProducts)) return prev;
          const next = prev.slice();
          next[targetIndex] = { ...last, content: nextContent, products: last.products ?? streamedProducts };
          return next;
        }
        return [...prev, { role: "assistant", content: nextContent, products: streamedProducts, clientId: `assistant-${localTurnId}` }];
      });
    };

    const scheduleAssistantUpdate = (immediate = false) => {
      if (immediate) {
        if (assistantRenderTimer) clearTimeout(assistantRenderTimer);
        flushAssistantUpdate();
        return;
      }
      if (assistantRenderTimer) return;
      assistantRenderTimer = setTimeout(flushAssistantUpdate, 90);
    };

    const updateAssistant = (chunk: string) => {
      if (isToolMarkerChunk(chunk)) return;
      const safeChunk = sanitizeStreamChunk(chunk);
      if (!safeChunk.trim()) return;
      if (!hasStartedResponse) {
        hasStartedResponse = true;
        setIsThinking(false);
        setSearchStatus("");
      }
      const wasEmpty = assistantContent.length === 0;
      assistantContent += safeChunk;
      scheduleAssistantUpdate(wasEmpty);
    };

    const allMessages = [...messages, userMsg].map((m) => {
      const imgs = m.attachedImages || [];
      if (imgs.length > 0) {
        // IMPORTANT: Put text FIRST so the model sees the user's question, then images
        const content: any[] = [];
        if (m.content && m.content.trim()) {
          content.push({ type: "text" as const, text: m.content });
        }
        imgs.forEach((imgData) => {
          content.push({ type: "image_url" as const, image_url: { url: imgData } });
        });
        // Ensure there's always at least text content
        if (content.length === 0) {
          content.push({ type: "text" as const, text: "Please analyze this image." });
        }
        return { role: m.role, content };
      }
      return { role: m.role, content: m.role === "assistant" ? sanitizeLeakedToolText(m.content) : m.content };
    });

    if (currentFiles.some((f) => f.type === "file")) {
      const fileTexts = currentFiles.filter((f) => f.type === "file").map((f) => `--- File: ${f.name} ---\n${f.data}`).join("\n\n");
      const lastMsg = allMessages[allMessages.length - 1];
      if (typeof lastMsg.content === "string") {
        lastMsg.content = `${lastMsg.content}\n\n${fileTexts}`;
      }
    }

    // Mode prompts are now handled server-side via chatMode parameter
    const isDeepResearch = chatMode === "deep-research";
    if (isDeepResearch) {
      setSearchStatus("Preparing deep research...");
    }

    await streamChat({
      messages: allMessages, model: MEGSY_MODEL, tier: megsyTier, searchEnabled: searchEnabled || isDeepResearch,
      deepResearch: isDeepResearch,
      chatMode: chatMode,
      user_id: chatUserId || undefined,
      conversation_id: conversationId || undefined,
      computerUseEnabled,
      activeAgent: chatMode !== "normal" ? chatMode : (selectedAgent?.id || undefined),
      selectedModel: selectedModel ? { id: selectedModel.id, cost: selectedModel.cost } : undefined,
      activeSkill: undefined,
      availableSkills: [
        ...enabledSkills,
        ...librarySkills.filter((l) => !enabledSkills.some((e) => e.name === l.name)),
      ]
        .slice(0, 16)
        .map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          triggers: s.triggers || [],
          source: s.source,
        })),
      onDelta: updateAssistant,
      onImages: (imgs) => {searchImages = imgs;},
      onProducts: (products) => {
        streamedProducts = products;
        setMessages((prev) => {
          const assistantIndex = prev.findIndex((m) => m.clientId === `assistant-${localTurnId}`);
          const targetIndex = assistantIndex >= 0 ? assistantIndex : prev.length - 1;
          const last = prev[targetIndex];
          if (last?.role !== "assistant") return prev;
          const next = prev.slice();
          next[targetIndex] = { ...last, products };
          return next;
        });
      },
      onStatus: (status) => {
        const normalizedStatus = normalizeStatusLabel(status);
        if (normalizedStatus) {
          setSearchStatus(normalizedStatus);
          setIsThinking(true);
        }
      },
      onBrowser: () => {
        // Browser state no longer tracked in UI
      },
      onEvent: (payload: any) => {
        const ev = payload?.event;
        if (ev === "narration") {
          pushNarration(String(payload.text || ""));
        } else if (ev === "narration_start") {
          // begin a new empty narration item that will be filled by chunks
          setNarrations((prev) => [...prev, ""]);
        } else if (ev === "narration_chunk") {
          const delta = String(payload.delta || "");
          if (!delta) return;
          setNarrations((prev) => {
            if (prev.length === 0) return [delta];
            const next = prev.slice();
            next[next.length - 1] = (next[next.length - 1] || "") + delta;
            return next;
          });
        } else if (ev === "narration_end") {
          setNarrations((prev) => {
            if (prev.length === 0) return prev;
            const last = (prev[prev.length - 1] || "").trim();
            if (last) return prev;
            // discard empty narration
            return prev.slice(0, -1);
          });
        } else if (ev === "clarify_questions") {
          if (Array.isArray(payload.questions)) setClarifyQs(payload.questions);
        }
      },
      onDone: async () => {
        if (hadStreamError) return;
        const tail = sanitizeStreamChunk("", true);
        if (tail.trim()) {
          assistantContent += tail;
        }
        if (assistantRenderTimer) {
          clearTimeout(assistantRenderTimer);
          flushAssistantUpdate();
        }
        setIsLoading(false);setIsThinking(false);setSearchStatus("");
        isSubmittingRef.current = false;
        if (presenceChannelRef.current && chatUserId) {
          presenceChannelRef.current.send({ type: "broadcast", event: "ai_busy", payload: { user_id: chatUserId, busy: false } });
        }
        if (!assistantContent && searchImages.length === 0 && streamedProducts.length === 0) {
          assistantContent = "حصل تأخير في توليد الرد، لكن طلبك وصل. جرّب إرساله مرة أخرى أو اختصره قليلًا.";
          setMessages((prev) => {
            const assistantIndex = prev.findIndex((m) => m.clientId === `assistant-${localTurnId}`);
            const targetIndex = assistantIndex >= 0 ? assistantIndex : prev.length - 1;
            const last = prev[targetIndex];
            if (last?.role !== "assistant") return [...prev, { role: "assistant", content: assistantContent, clientId: `assistant-${localTurnId}` }];
            const next = prev.slice();
            next[targetIndex] = { ...last, content: assistantContent };
            return next;
          });
        }
        const resolvedConversationId = await conversationPromise;
        if (resolvedConversationId && assistantContent) {
          const aId = await saveMessage(resolvedConversationId, "assistant", assistantContent, searchImages.length > 0 ? searchImages : undefined);
          if (aId) ownInsertedIdsRef.current.add(aId);
          if (isDeepResearch) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from("research_reports").upsert({
                user_id: user.id,
                session_key: `conv_${resolvedConversationId}_${assistantMessageIndex}`,
                query: userInput || "Deep Research",
                report: assistantContent,
                images: (searchImages.length > 0 ? searchImages : []) as any,
                steps: [] as any,
              } as any, { onConflict: "user_id,session_key" });
            }
          }
          setMessages((prev) => {
            const assistantIndex = prev.findIndex((m) => m.clientId === `assistant-${localTurnId}`);
            const targetIndex = assistantIndex >= 0 ? assistantIndex : prev.length - 1;
            const last = prev[targetIndex];
            if (last?.role !== "assistant") return prev;
            const next = prev.slice();
            next[targetIndex] = {
              ...last,
              id: aId || last.id,
              images: searchImages.length > 0 ? searchImages : last.images,
              products: streamedProducts.length > 0 ? streamedProducts : last.products,
            };
            return next;
          });
          const dbMode = chatMode === "deep-research" ? "research" : (chatMode === "learning" ? "learning" : (chatMode === "shopping" ? "shopping" : "chat"));
          await supabase.from("conversations").update({ updated_at: new Date().toISOString(), mode: dbMode } as any).eq("id", resolvedConversationId);
          window.dispatchEvent(new CustomEvent("megsy:conversations-changed"));
          // Phase 2: passive memory + KG extraction (fire-and-forget)
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token && assistantContent && userInput) {
              fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-extract-memory`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${session.access_token}`,
                  "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                },
                body: JSON.stringify({
                  user_message: userInput,
                  assistant_reply: assistantContent.slice(0, 4000),
                  conversation_id: resolvedConversationId,
                  message_id: aId,
                }),
              }).catch(() => {});
            }
          } catch { /* ignore */ }
        }
      },
      onError: (err) => {
        hadStreamError = true;
        if (assistantRenderTimer) clearTimeout(assistantRenderTimer);
        toast.error(err);setIsThinking(false);setIsLoading(false);setSearchStatus("");
        if (presenceChannelRef.current && chatUserId) {
          presenceChannelRef.current.send({ type: "broadcast", event: "ai_busy", payload: { user_id: chatUserId, busy: false } });
        }
        const fallbackContent = isDeepResearch && !assistantContent.trim()
          ? "Deep Research stopped before the final report was generated. The request was saved — please try again in a moment."
          : "";
        if (fallbackContent) {
          assistantContent = fallbackContent;
          setMessages((prev) => prev.map((m) => m.clientId === `assistant-${localTurnId}` ? { ...m, content: fallbackContent } : m));
        } else {
          setMessages((prev) => prev[prev.length - 1]?.role === "assistant" && !prev[prev.length - 1]?.content ? prev.slice(0, -1) : prev);
        }
        void (async () => {
          const contentToSave = assistantContent.trim();
          const resolvedConversationId = await conversationPromise;
          if (!resolvedConversationId || !contentToSave) return;
          const aId = await saveMessage(resolvedConversationId, "assistant", contentToSave, searchImages.length > 0 ? searchImages : undefined);
          if (aId) ownInsertedIdsRef.current.add(aId);
          if (isDeepResearch && chatUserId) {
            await supabase.from("research_reports").upsert({
              user_id: chatUserId,
              session_key: `conv_${resolvedConversationId}_${assistantMessageIndex}`,
              query: userInput || "Deep Research",
              report: contentToSave,
              images: (searchImages.length > 0 ? searchImages : []) as any,
              steps: [] as any,
            } as any, { onConflict: "user_id,session_key" });
          }
          // Passive memory extraction (mem0-style) — runs in background
          try {
            void supabase.functions.invoke("chat-extract-memory", {
              body: {
                user_message: userInput || "",
                assistant_reply: contentToSave,
                conversation_id: resolvedConversationId,
                message_id: aId || null,
              },
            });
          } catch {}
        })();
        isSubmittingRef.current = false;
      },
      signal: controller.signal
    });
  };

  useEffect(() => {
    sendWithTextRef.current = handleSendWithText;
  });

  const handleSend = () => handleSendWithText();

  const handleNewChat = () => {
    if (studyAudioRef.current) { studyAudioRef.current.pause(); studyAudioRef.current.src = ""; }
    setStudyTimers([]);setStudyMusic({ kind: null });setMessages([]);setConversationId(null);setConversationTitle("");setIsLoading(false);setIsThinking(false);setAttachedFiles([]);setSearchStatus("");setChatMode("normal");setSearchEnabled(true);setComputerUseEnabled(true);setIsShared(false);setShareId(null);setShareMode("private");setIsPinned(false);setPendingQuestions([]);setSelectedModel(null);setSelectedAgent(null);isSubmittingRef.current = false;
  };

  const loadUserTracks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("user_music_tracks")
      .select("id, name, storage_path")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setUserTracks(data as any);
  }, []);

  useEffect(() => { loadUserTracks(); }, [loadUserTracks]);

  useEffect(() => {
    if (chatMode === "learning") return;
    if (studyAudioRef.current) { studyAudioRef.current.pause(); studyAudioRef.current.src = ""; }
    setStudyMusic({ kind: null });
    setStudyTimers([]);
  }, [chatMode]);

  const playUserTrack = useCallback(async (track: { id: string; name: string; storage_path: string }) => {
    const { data, error } = await supabase.storage.from("user-music").createSignedUrl(track.storage_path, 3600);
    if (error || !data?.signedUrl) { toast.error("Failed to load track"); return; }
    if (!studyAudioRef.current) studyAudioRef.current = new Audio();
    studyAudioRef.current.loop = true;
    studyAudioRef.current.src = data.signedUrl;
    studyAudioRef.current.volume = 0.5;
    studyAudioRef.current.play().catch(() => toast.info(`Selected ${track.name} (audio blocked by browser)`));
    setStudyMusic({ kind: track.name });
  }, []);

  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("audio/")) { toast.error("Please choose an audio file"); return; }
    if (file.size > 25 * 1024 * 1024) { toast.error("Max file size is 25MB"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Sign in required"); return; }
    setUploadingMusic(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from("user-music").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const displayName = file.name.replace(/\.[^.]+$/, "");
      const { data: row, error: insErr } = await supabase
        .from("user_music_tracks")
        .insert({ user_id: user.id, name: displayName, storage_path: path, size_bytes: file.size })
        .select("id, name, storage_path")
        .single();
      if (insErr) throw insErr;
      setUserTracks((prev) => [row as any, ...prev]);
      toast.success("Track saved");
      await playUserTrack(row as any);
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploadingMusic(false);
    }
  };

  const deleteUserTrack = async (track: { id: string; storage_path: string; name: string }) => {
    await supabase.storage.from("user-music").remove([track.storage_path]);
    await supabase.from("user_music_tracks").delete().eq("id", track.id);
    setUserTracks((prev) => prev.filter((t) => t.id !== track.id));
    if (studyMusic.kind === track.name) {
      if (studyAudioRef.current) { studyAudioRef.current.pause(); studyAudioRef.current.src = ""; }
      setStudyMusic({ kind: null });
    }
  };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileList = Array.from(files);
    if (attachedFiles.length + fileList.length > 5) {
      toast.error("Maximum 5 files allowed");
      e.target.value = "";
      return;
    }
    fileList.forEach(async (file) => {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 20MB)`);
        return;
      }
      if (file.size === 0) {
        toast.error(`${file.name} is empty`);
        return;
      }
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => setAttachedFiles((prev) => [...prev, { name: file.name, type: "image", data: reader.result as string }]);
        reader.readAsDataURL(file);
      } else {
        const text = await file.text();
        setAttachedFiles((prev) => [...prev, { name: file.name, type: "file", data: text.slice(0, 8000) }]);
      }
    });
    e.target.value = "";
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileList = Array.from(files);
    if (attachedFiles.length + fileList.length > 5) {
      toast.error("Maximum 5 files allowed");
      e.target.value = "";
      return;
    }
    fileList.forEach((file) => {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 20MB)`);
        return;
      }
      if (file.size === 0) {
        toast.error(`${file.name} is empty`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setAttachedFiles((prev) => [...prev, { name: file.name, type: "image", data: reader.result as string }]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (attachedFiles.length >= 5) {
      toast.error("Maximum 5 files allowed");
      e.target.value = "";
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error(`${file.name} is too large (max 20MB)`);
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachedFiles((prev) => [...prev, { name: file.name, type: "image", data: reader.result as string }]);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleShare = async () => {
    setShareDialogOpen(true);
  };

  const handleCreateShareLink = async (modeOverride?: "private" | "public") => {
    if (!conversationId) return;
    const mode = modeOverride ?? shareMode;
    if (mode === "public") {
      const newShareId = shareId || Math.random().toString(36).substring(2, 10);
      const { error } = await supabase.from("conversations").update({ is_shared: true, share_id: newShareId } as any).eq("id", conversationId);
      if (error) {toast.error("Failed to share");return;}
      setIsShared(true);
      setShareId(newShareId);
      const url = `${window.location.origin}/share/${newShareId}`;
      setGeneratedShareUrl(url);
    } else {
      await supabase.from("conversations").update({ is_shared: false } as any).eq("id", conversationId);
      setIsShared(false);
      setGeneratedShareUrl(null);
      toast.success("Chat set to private");
      setShareDialogOpen(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (generatedShareUrl) {
      await navigator.clipboard.writeText(generatedShareUrl);
      toast.success("Link copied!");
    }
  };

  const handleRename = async () => {
    if (!conversationId || !renameValue.trim()) return;
    await supabase.from("conversations").update({ title: renameValue.trim() }).eq("id", conversationId);
    setConversationTitle(renameValue.trim());
    setIsRenaming(false);
    toast.success("Renamed");
  };

  const [confirmPinOpen, setConfirmPinOpen] = useState(false);
  const handleTogglePin = () => {
    if (!conversationId) return;
    setConfirmPinOpen(true);
  };
  const performTogglePin = async () => {
    if (!conversationId) return;
    const nextPinned = !isPinned;
    const payload = nextPinned
      ? { is_pinned: true, pinned_at: new Date().toISOString() }
      : { is_pinned: false, pinned_at: null };
    const { error } = await supabase.from("conversations").update(payload as any).eq("id", conversationId);
    if (error) { toast.error("Failed to update pin"); return; }
    setIsPinned(nextPinned);
    setConfirmPinOpen(false);
    toast.success(nextPinned ? "Pinned" : "Unpinned");
  };

  const handleInvite = async () => {
    if (!conversationId) { toast.error("Start a conversation first"); return; }
    setInviteDialogOpen(true);
    setInviteLink(null);
    setInviteEmail("");
    const { data: memberRows } = await supabase.from("conversation_members").select("user_id, role").eq("conversation_id", conversationId);
    if (memberRows && memberRows.length > 0) {
      const ids = memberRows.map((m: any) => m.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
      const profMap: Record<string, any> = {};
      (profs || []).forEach((p: any) => { profMap[p.id] = p; });
      setMembers(memberRows.map((m: any) => ({
        id: m.user_id, email: "", role: m.role,
        name: profMap[m.user_id]?.display_name, avatar: profMap[m.user_id]?.avatar_url,
      })));
    } else {
      setMembers([]);
    }
    // Auto-generate invite link immediately
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("conversation_invites").insert({ conversation_id: conversationId, invited_by: user.id } as any).select("invite_token").single();
    if (!error && data) {
      setInviteLink(`${window.location.origin}/invite/${(data as any).invite_token}`);
    }
  };

  const handleSendInviteEmail = async () => {
    if (!conversationId || !inviteEmail.trim()) return;
    setInviteLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setInviteLoading(false); return; }
    let link = inviteLink;
    if (!link) {
      const { data, error } = await supabase.from("conversation_invites").insert({ conversation_id: conversationId, invited_by: user.id, invite_email: inviteEmail.trim().toLowerCase() } as any).select("invite_token").single();
      if (error) { toast.error("Failed to create invite"); setInviteLoading(false); return; }
      link = `${window.location.origin}/invite/${(data as any).invite_token}`;
      setInviteLink(link);
    }

    // Send actual invite email
    try {
      const { error: emailError } = await supabase.functions.invoke("send-email", {
        body: {
          to: inviteEmail.trim().toLowerCase(),
          template: "invite",
          user_id: user.id,
          type: "system",
          variables: {
            name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Someone",
            invite_link: link,
            app_url: window.location.origin,
          },
        },
      });
      if (emailError) throw emailError;
      toast.success(`Invite sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
    } catch {
      toast.error("Couldn't send the email — link is ready to share");
    }

    setInviteLoading(false);
  };

  const handleGenerateInviteLink = async () => {
    if (!conversationId) return;
    setInviteLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setInviteLoading(false); return; }
    const { data, error } = await supabase.from("conversation_invites").insert({ conversation_id: conversationId, invited_by: user.id } as any).select("invite_token").single();
    if (error) { toast.error("Failed to create invite link"); setInviteLoading(false); return; }
    const link = `${window.location.origin}/invite/${(data as any).invite_token}`;
    setInviteLink(link);
    setInviteLoading(false);
  };

  const handleCopyInviteLink = async () => {
    if (inviteLink) { await navigator.clipboard.writeText(inviteLink); toast.success("Invite link copied!"); }
  };

  // Accept invite / deep link / demo conversation on page load
  useEffect(() => {
    // Sidebar navigation: arrived via navigate('/chat', { state: { loadConversationId } })
    const stateCid = (location.state as any)?.loadConversationId as string | undefined;
    if (stateCid && stateCid !== conversationId) {
      loadConversation(stateCid);
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
    const params = new URLSearchParams(window.location.search);
    
    // Deep link: /chat?conv=xxx
    const convParam = params.get("conv");
    if (convParam && !conversationId) {
      loadConversation(convParam);
      window.history.replaceState({}, "", "/chat");
      return;
    }

    const inviteToken = params.get("invite");
    if (inviteToken) {
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { toast.error("Please sign in to accept invite"); return; }
        const { data: invite } = await supabase.from("conversation_invites").select("*").eq("invite_token", inviteToken).eq("status", "pending").single();
        if (!invite) { toast.error("Invalid or expired invite"); return; }
        await supabase.from("conversation_members").insert({ conversation_id: (invite as any).conversation_id, user_id: user.id, role: "member" } as any);
        await supabase.from("conversation_invites").update({ status: "accepted", accepted_by: user.id } as any).eq("id", (invite as any).id);
        loadConversation((invite as any).conversation_id);
        window.history.replaceState({}, "", "/chat");
        toast.success("You joined the conversation!");
      })();
      return;
    }

    // Demo conversation on first visit
    const demoKey = "megsy_demo_shown";
    if (localStorage.getItem(demoKey)) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Check if user has any conversations already
      const { count } = await supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      if (count && count > 0) { localStorage.setItem(demoKey, "1"); return; }
      localStorage.setItem(demoKey, "1");

      const demoUserMsg = "What is Megsy AI? Tell me everything about what you can do.";
      const demoAssistantMsg = `# Welcome to Megsy AI

Megsy is your all-in-one AI platform. Here's everything I can help you with:

## Chat
- **Smart conversations** powered by Google Gemini, with web search, deep research, learning mode, and shopping mode
- **Smart Questions** — I ask you clarifying questions to give better answers
- **File analysis** — upload images, PDFs, documents and I'll analyze them
- **Integrations** — connect Telegram, Discord, Slack, Notion, Zoom, TikTok, Twitter, Shopify, Meta, and more

## Images
- **AI Image Generation** — create stunning images using multiple models (Flux, DALL-E, Midjourney-style, and more)
- **15+ Image Tools** — Face Swap, Background Remover, Clothes Changer, Hair Changer, Inpainting, Retouch, Colorize, Sketch to Image, and more
- **Studio** — your personal gallery of all generated images

## Videos
- **AI Video Generation** — create videos from text or images
- **Video Tools** — Swap Characters, Upscale, Talking Photo, Video Extender, Auto Caption, Lip Sync, Video to Text
- **Community** — browse and reuse prompts from other creators

## Voice
- **Text-to-Speech** — generate natural voices with multiple AI models
- **Voice Cloning** — clone your own voice

## Programming
- **Megsy Workspace** — describe an app and I build it with live preview
- **Full-stack generation** — React, HTML, CSS, JavaScript projects
- **Download** your generated code

## Files
- **Document creation** — generate PDFs, spreadsheets, presentations
- **Smart file analysis** — upload any document for AI analysis

## Settings
- **AI Personalization** — tell me your name, profession, and how you want me to behave
- **Theme customization** — multiple themes and accent colors
- **Language** — auto-translate the entire UI

---

**MC Credits** power everything. You start with free credits and can earn more through referrals (20% commission).

Ask me anything to get started!`;

      // Create conversation
      const { data: conv } = await supabase.from("conversations").insert({ title: "Welcome to Megsy AI", mode: "chat", model: MEGSY_MODEL, user_id: user.id } as any).select("id").single();
      if (!conv) return;
      await supabase.from("messages").insert([
        { conversation_id: conv.id, role: "user", content: demoUserMsg },
        { conversation_id: conv.id, role: "assistant", content: demoAssistantMsg },
      ]);
      setConversationId(conv.id);
      setConversationTitle("Welcome to Megsy AI");
      setMessages([
        { role: "user", content: demoUserMsg },
        { role: "assistant", content: demoAssistantMsg },
      ]);
    })();
  }, []);

  // Realtime for member join/leave + enrich with profile
  useEffect(() => {
    if (!conversationId) return;
    const enrichMember = async (userId: string, role: string) => {
      const { data: prof } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", userId).maybeSingle();
      return { id: userId, email: "", role, name: (prof as any)?.display_name || undefined, avatar: (prof as any)?.avatar_url || undefined };
    };
    const channel = supabase.channel(`members-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_members", filter: `conversation_id=eq.${conversationId}` }, async (payload) => {
        const m = payload.new as any;
        const enriched = await enrichMember(m.user_id, m.role);
        setMembers((prev) => prev.some((x) => x.id === m.user_id) ? prev : [...prev, enriched]);
        if (m.user_id !== chatUserId) {
          setSystemEvents((prev) => [...prev, { id: `j-${m.user_id}-${Date.now()}`, text: `${enriched.name || "Someone"} joined the conversation`, at: Date.now() }]);
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "conversation_members", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const old = payload.old as any;
        let leftName = "Someone";
        setMembers((prev) => {
          const found = prev.find((m) => m.id === old.user_id);
          if (found?.name) leftName = found.name;
          return prev.filter((m) => m.id !== old.user_id);
        });
        if (old.user_id === chatUserId) {
          toast.error("You were removed from this chat");
          handleNewChat();
        } else {
          setSystemEvents((prev) => [...prev, { id: `l-${old.user_id}-${Date.now()}`, text: `${leftName} left the conversation`, at: Date.now() }]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, chatUserId]);

  // Realtime: new messages + presence (typing + AI-busy lock)
  useEffect(() => {
    if (!conversationId || !chatUserId) return;
    const msgChannel = supabase
      .channel(`messages-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, async (payload) => {
        const newMsg = payload.new as any;
        // Skip echoes of messages we just inserted ourselves
        if (newMsg.id && ownInsertedIdsRef.current.has(newMsg.id)) return;
        let senderName: string | null = null;
        let senderAvatar: string | null = null;
        if (newMsg.user_id) {
          const { data: prof } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", newMsg.user_id).maybeSingle();
          senderName = (prof as any)?.display_name || null;
          senderAvatar = (prof as any)?.avatar_url || null;
        }
        setMessages((prev) => {
          if (newMsg.id && prev.some((m) => m.id === newMsg.id)) return prev;
          const localPendingIndex = newMsg.user_id === chatUserId
            ? prev.findIndex((m) => !m.id && m.role === newMsg.role && m.content === newMsg.content)
            : -1;
          if (localPendingIndex >= 0) {
            const next = prev.slice();
            next[localPendingIndex] = {
              ...next[localPendingIndex],
              images: newMsg.images || next[localPendingIndex].images,
              id: newMsg.id,
              user_id: newMsg.user_id,
              senderName,
              senderAvatar,
            };
            return next;
          }
          return [...prev, {
            role: newMsg.role,
            content: newMsg.content,
            images: newMsg.images || undefined,
            id: newMsg.id,
            user_id: newMsg.user_id,
            senderName,
            senderAvatar,
          }];
        });
        // Smart auto-scroll: only scroll if user is near bottom; else show "new messages" badge
        const el = messagesContainerRef.current;
        const nearBottom = el ? (el.scrollHeight - el.scrollTop - el.clientHeight) < 200 : true;
        if (nearBottom) {
          setTimeout(() => scrollToBottom(), 100);
        } else if (newMsg.user_id !== chatUserId) {
          setNewMessagesCount((c) => c + 1);
        }
        // Sound + title badge if from another user
        if (newMsg.user_id && newMsg.user_id !== chatUserId) {
          if (typeof document !== "undefined" && document.hidden) {
            setUnreadCount((c) => c + 1);
            playNotificationSound();
          } else if (!nearBottom) {
            playNotificationSound();
          }
        }
      })
      .subscribe();

    const presence = supabase.channel(`presence-${conversationId}`, {
      config: { broadcast: { self: false }, presence: { key: chatUserId } },
    });
    presence
      .on("broadcast", { event: "typing" }, ({ payload }: any) => {
        if (!payload?.user_id || payload.user_id === chatUserId) return;
        setTypingUsers((prev) => {
          const next = prev.filter((u) => u.id !== payload.user_id);
          return [...next, { id: payload.user_id, name: payload.name || "Someone", avatar: payload.avatar || null }];
        });
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.id !== payload.user_id));
        }, 3500);
      })
      .on("broadcast", { event: "stop_typing" }, ({ payload }: any) => {
        setTypingUsers((prev) => prev.filter((u) => u.id !== payload?.user_id));
      })
      .on("broadcast", { event: "ai_busy" }, ({ payload }: any) => {
        if (!payload || payload.user_id === chatUserId) return;
        setRemoteAiBusy(payload.busy ? { name: payload.name || "Someone" } : null);
      })
      .on("presence", { event: "sync" }, () => {
        const state = presence.presenceState() as Record<string, any>;
        setOnlineUsers(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presence.track({ user_id: chatUserId, online_at: new Date().toISOString() });
        }
      });
    presenceChannelRef.current = presence;

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(presence);
      presenceChannelRef.current = null;
      setOnlineUsers(new Set());
    };
  }, [conversationId, chatUserId]);

  // Throttled typing broadcast
  useEffect(() => {
    if (!presenceChannelRef.current || !chatUserId || !input.trim()) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    presenceChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: chatUserId, name: userName, avatar: null },
    });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      presenceChannelRef.current?.send({ type: "broadcast", event: "stop_typing", payload: { user_id: chatUserId } });
    }, 2000);
  }, [input, chatUserId, userName]);

  const handleKickMember = async (memberId: string) => {
    if (!conversationId) return;
    if (!window.confirm("Remove this member?")) return;
    const { error } = await supabase.from("conversation_members").delete().eq("conversation_id", conversationId).eq("user_id", memberId);
    if (error) { toast.error("Failed to remove member"); return; }
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    toast.success("Member removed");
  };

  // Track avatar map for quick lookup
  const memberMap = useMemo(() => {
    const m: Record<string, { name?: string; avatar?: string }> = {};
    members.forEach((mb) => { m[mb.id] = { name: mb.name, avatar: mb.avatar }; });
    if (chatUserId) m[chatUserId] = { name: userName || "You", avatar: undefined };
    return m;
  }, [members, chatUserId, userName]);

  const readersByMessageId = useMemo(() => {
    const result: Record<string, { user_id: string; name?: string; avatar?: string }[]> = {};
    Object.entries(messageReads).forEach(([messageId, readers]) => {
      const visibleReaders = readers
        .filter((r) => r.user_id !== chatUserId)
        .map((r) => ({ user_id: r.user_id, name: memberMap[r.user_id]?.name, avatar: memberMap[r.user_id]?.avatar }));
      if (visibleReaders.length > 0) result[messageId] = visibleReaders;
    });
    return result;
  }, [messageReads, chatUserId, memberMap]);

  // Load reactions + reads for current conversation, subscribe to realtime
  useEffect(() => {
    if (!conversationId || !chatUserId) return;
    let cancelled = false;
    (async () => {
      const [{ data: reads }, { data: reactions }] = await Promise.all([
        supabase.from("message_reads" as any).select("message_id, user_id").eq("conversation_id", conversationId),
        supabase.from("message_reactions" as any).select("id, message_id, user_id, emoji").eq("conversation_id", conversationId),
      ]);
      if (cancelled) return;
      const readsMap: Record<string, { user_id: string; name?: string; avatar?: string }[]> = {};
      (reads || []).forEach((r: any) => { (readsMap[r.message_id] ||= []).push({ user_id: r.user_id }); });
      setMessageReads(readsMap);
      const reactMap: Record<string, { id: string; emoji: string; user_id: string }[]> = {};
      (reactions || []).forEach((r: any) => { (reactMap[r.message_id] ||= []).push({ id: r.id, emoji: r.emoji, user_id: r.user_id }); });
      setMessageReactions(reactMap);
    })();

    const ch = supabase.channel(`reads-reactions-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reads", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const r = payload.new as any;
        setMessageReads((prev) => {
          const list = prev[r.message_id] || [];
          if (list.some((x) => x.user_id === r.user_id)) return prev;
          return { ...prev, [r.message_id]: [...list, { user_id: r.user_id }] };
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reactions", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const r = payload.new as any;
        setMessageReactions((prev) => {
          const list = prev[r.message_id] || [];
          if (list.some((x) => x.id === r.id)) return prev;
          return { ...prev, [r.message_id]: [...list, { id: r.id, emoji: r.emoji, user_id: r.user_id }] };
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const old = payload.old as any;
        setMessageReactions((prev) => {
          const list = prev[old.message_id] || [];
          return { ...prev, [old.message_id]: list.filter((x) => x.id !== old.id) };
        });
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); markedReadRef.current.clear(); };
  }, [conversationId, chatUserId]);

  // Mark visible messages as read
  useEffect(() => {
    if (!conversationId || !chatUserId || messages.length === 0) return;
    if (typeof document !== "undefined" && document.hidden) return;
    const toMark = messages
      .filter((m) => m.id && m.user_id !== chatUserId && !markedReadRef.current.has(m.id))
      .map((m) => m.id!);
    if (toMark.length === 0) return;
    toMark.forEach((id) => markedReadRef.current.add(id));
    const t = setTimeout(() => {
      supabase.from("message_reads" as any).insert(
        toMark.map((mid) => ({ message_id: mid, user_id: chatUserId, conversation_id: conversationId }))
      ).then(({ error }: any) => { if (error) toMark.forEach((id) => markedReadRef.current.delete(id)); });
    }, 500);
    return () => clearTimeout(t);
  }, [messages, conversationId, chatUserId]);

  // Sound + document title for unread when tab hidden
  useEffect(() => {
    if (!originalTitleRef.current) originalTitleRef.current = document.title;
    const onVis = () => { if (!document.hidden) { setUnreadCount(0); document.title = originalTitleRef.current; } };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  useEffect(() => {
    if (unreadCount > 0) document.title = `(${unreadCount}) ${originalTitleRef.current || "Chat"}`;
    else if (originalTitleRef.current) document.title = originalTitleRef.current;
  }, [unreadCount]);

  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; o.type = "sine";
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      o.start(); o.stop(ctx.currentTime + 0.26);
      setTimeout(() => ctx.close(), 400);
    } catch {}
  }, []);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!conversationId || !chatUserId) return;
    const existing = (messageReactions[messageId] || []).find((r) => r.user_id === chatUserId && r.emoji === emoji);
    if (existing) {
      setMessageReactions((prev) => ({ ...prev, [messageId]: (prev[messageId] || []).filter((r) => r.id !== existing.id) }));
      await supabase.from("message_reactions" as any).delete().eq("id", existing.id);
    } else {
      const tempId = `tmp-${Date.now()}`;
      setMessageReactions((prev) => ({ ...prev, [messageId]: [...(prev[messageId] || []), { id: tempId, emoji, user_id: chatUserId }] }));
      const { data, error } = await supabase.from("message_reactions" as any).insert({ message_id: messageId, user_id: chatUserId, conversation_id: conversationId, emoji }).select("id").single();
      if (error) {
        setMessageReactions((prev) => ({ ...prev, [messageId]: (prev[messageId] || []).filter((r) => r.id !== tempId) }));
      } else if (data) {
        setMessageReactions((prev) => ({ ...prev, [messageId]: (prev[messageId] || []).map((r) => r.id === tempId ? { ...r, id: (data as any).id } : r) }));
      }
    }
    setReactionPickerFor(null);
  }, [conversationId, chatUserId, messageReactions]);

  // Mention detection from input
  useEffect(() => {
    if (members.length === 0) { setMentionQuery(null); return; }
    const m = input.match(/(?:^|\s)@(\w{0,30})$/);
    if (m) setMentionQuery({ q: m[1] || "", start: input.length - m[1].length - 1 });
    else setMentionQuery(null);
  }, [input, members.length]);

  const insertMention = useCallback((name: string) => {
    if (!mentionQuery) return;
    const before = input.slice(0, mentionQuery.start);
    const safeName = name.replace(/\s+/g, "_");
    setInput(`${before}@${safeName} `);
    setMentionQuery(null);
  }, [input, mentionQuery]);

  const handleDelete = () => {
    if (!conversationId) return;
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!conversationId) return;
    setIsDeleting(true);
    const { error: msgErr } = await supabase.from("messages").delete().eq("conversation_id", conversationId);
    const { error: convErr } = await supabase.from("conversations").delete().eq("id", conversationId);
    setIsDeleting(false);
    setConfirmDeleteOpen(false);
    if (msgErr || convErr) { toast.error("Failed to delete"); return; }
    toast.success("Chat deleted");
    handleNewChat();
  };

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingOriginal, setEditingOriginal] = useState<string>("");
  const handleEditUserMessageAt = useCallback((index: number, messageText: string) => {
    setEditingIndex(index);
    setEditingOriginal(messageText);
    setInput(messageText);
    // Focus textarea on next tick
    setTimeout(() => {
      const ta = document.querySelector<HTMLTextAreaElement>('textarea');
      if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    }, 50);
  }, []);
  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditingOriginal("");
    setInput("");
  }, []);

  const hasConversation = messages.length > 0;

  const iosSpring = { type: "spring" as const, damping: 22, stiffness: 350 };

  const renderPlusMenu = () => (
    <>
      <div className="fixed inset-0 z-[45]" onClick={() => setPlusMenuOpen(false)} />
      <motion.div
        layout
        initial={{ opacity: 0, y: 12, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.94 }}
        transition={iosSpring}
        className={`absolute bottom-full mb-2 left-2 z-[46] rounded-3xl liquid-glass-input p-3 overflow-hidden ${plusView === "skills" ? "w-[22rem] max-w-[calc(100vw-1rem)]" : "w-[19rem]"}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {plusView === "main" ? (
            <motion.div
              key="main"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-2"
            >
              {/* Top row: 3 quick actions side-by-side */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Camera, label: "Camera", onClick: () => { cameraInputRef.current?.click(); setPlusMenuOpen(false); } },
                  { icon: Image, label: "Photos", onClick: () => { imageInputRef.current?.click(); setPlusMenuOpen(false); } },
                  { icon: FileUp, label: "Files", onClick: () => { fileInputRef.current?.click(); setPlusMenuOpen(false); } },
                ].map(({ icon: Icon, label, onClick }) => (
                  <motion.button
                    key={label}
                    whileTap={{ scale: 0.95 }}
                    transition={iosSpring}
                    onClick={onClick}
                    className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl liquid-glass-hover transition-colors"
                  >
                    <Icon className="w-5 h-5 text-foreground/85" strokeWidth={1.75} />
                    <span className="text-[11.5px] font-medium text-foreground/85">{label}</span>
                  </motion.button>
                ))}
              </div>

              {chatMode === "learning" ? (
                <>
                  {/* Play music */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    transition={iosSpring}
                    onClick={() => setPlusView("music")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl liquid-glass-hover transition-colors text-left"
                  >
                    <Music2 className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                    <span className="flex-1 text-[13.5px] text-foreground/85">Play music</span>
                    <span className="text-[12px] font-medium text-foreground/70 truncate max-w-[8rem]">
                      {studyMusic.kind || "Off"}
                    </span>
                    <ChevronDown className="w-4 h-4 -rotate-90 text-muted-foreground" />
                  </motion.button>

                  {/* Focus timer */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    transition={iosSpring}
                    onClick={() => setPlusView("timer")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl liquid-glass-hover transition-colors text-left"
                  >
                    <Timer className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                    <span className="flex-1 text-[13.5px] text-foreground/85">Focus timer</span>
                    <ChevronDown className="w-4 h-4 -rotate-90 text-muted-foreground" />
                  </motion.button>

                </>
              ) : (
                <>
              {/* Web search row */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={iosSpring}
                onClick={handleSearchToggle}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl liquid-glass-hover transition-colors text-left"
              >
                <Globe className="w-[18px] h-[18px] text-foreground/85" strokeWidth={1.75} />
                <span className="flex-1 text-[13.5px] text-foreground/85">Web search</span>
                <div
                  className="relative shrink-0 rounded-full transition-colors duration-200 ease-out"
                  style={{
                    width: 40,
                    height: 24,
                    backgroundColor: searchEnabled ? "#34C759" : "#e9e9eb",
                  }}
                >
                  <motion.div
                    layout
                    transition={iosSpring}
                    className="absolute top-1/2 rounded-full bg-white"
                    style={{
                      width: 20,
                      height: 20,
                      marginTop: -10,
                      left: searchEnabled ? 18 : 2,
                      boxShadow:
                        "0px 3px 8px rgba(0,0,0,0.15), 0px 3px 1px rgba(0,0,0,0.06)",
                    }}
                  />
                </div>
              </motion.button>

              {/* Megsy model picker — opens dedicated view */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={iosSpring}
                onClick={() => setPlusView("models")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl liquid-glass-hover transition-colors text-left"
              >
                <Atom className="w-[18px] h-[18px] text-foreground/85" strokeWidth={1.75} />
                <span className="flex-1 text-[13.5px] text-foreground/85">Model</span>
                <span className="text-[12px] font-semibold text-foreground/70 capitalize flex items-center gap-1">
                  {megsyTier}
                  {(megsyTier === "pro" || megsyTier === "max") && (
                    <span className="text-[8px] font-bold px-1 py-px rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">PRO</span>
                  )}
                </span>
                <ChevronDown className="w-4 h-4 -rotate-90 text-muted-foreground" />
              </motion.button>

              {/* Tools row */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={iosSpring}
                onClick={() => setPlusView("tools")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl liquid-glass-hover transition-colors text-left"
              >
                <Wrench className="w-[18px] h-[18px] text-foreground/85" strokeWidth={1.75} />
                <span className="flex-1 text-[13.5px] text-foreground/85">Use tools</span>
                <ChevronDown className="w-4 h-4 -rotate-90 text-muted-foreground" />
              </motion.button>

              {/* Skills row */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={iosSpring}
                onClick={() => setPlusView("skills")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl liquid-glass-hover transition-colors text-left"
              >
                <Lightbulb className="w-[18px] h-[18px] text-foreground/85" strokeWidth={1.75} />
                <span className="flex-1 text-[13.5px] text-foreground/85">Skills</span>
                <span className="text-[12px] font-medium text-foreground/70 truncate max-w-[8rem]">
                  {enabledSkills.length > 0 ? `${enabledSkills.length} enabled` : "Auto"}
                </span>
                <ChevronDown className="w-4 h-4 -rotate-90 text-muted-foreground" />
              </motion.button>
                </>
              )}
            </motion.div>
          ) : plusView === "models" ? (
            <motion.div
              key="models"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col"
            >
              <div className="flex items-center gap-1 px-1.5 pt-1 pb-2">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setPlusView("main")}
                  className="w-7 h-7 flex items-center justify-center rounded-full liquid-glass-hover"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-4 h-4 text-foreground/80" />
                </motion.button>
                <span className="text-[13px] font-semibold text-foreground/85">Choose Model</span>
              </div>

              <div className="flex flex-col gap-1">
                {([
                  { id: "lite" as const, label: "Lite", desc: "Fast everyday answers", pro: false },
                  { id: "pro" as const, label: "Pro", desc: "Smarter reasoning", pro: true },
                  { id: "max" as const, label: "Max", desc: "1T+ flagship intelligence", pro: true },
                ]).map(t => {
                  const locked = t.pro && (userPlan === "free" || userPlan === "trial");
                  const active = megsyTier === t.id;
                  return (
                    <motion.button
                      key={t.id}
                      whileTap={{ scale: 0.98 }}
                      transition={iosSpring}
                      onClick={() => {
                        if (locked) {
                          toast.info("Megsy " + t.label + " is available on premium plans only");
                          return;
                        }
                        setMegsyTier(t.id);
                        localStorage.setItem("megsy_tier", t.id);
                        if (chatUserId) {
                          supabase.from("ai_personalization").upsert({ user_id: chatUserId, preferred_tier: t.id } as any, { onConflict: "user_id" }).then(() => {});
                        }
                        setPlusView("main");
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors ${active ? "bg-primary/10 border border-primary/30" : "liquid-glass-hover border border-transparent"}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13.5px] font-semibold text-foreground/90">{t.label}</span>
                          {t.pro && (
                            <span className="text-[8px] font-bold px-1 py-px rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">PRO</span>
                          )}
                          {locked && <span className="text-[10px] opacity-70">🔒</span>}
                        </div>
                        <div className="text-[11px] text-muted-foreground leading-tight">{t.desc}</div>
                      </div>
                      {active && <Check className="w-4 h-4 text-primary shrink-0" strokeWidth={2.5} />}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : plusView === "skills" ? (
            <motion.div
              key="skills"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col"
            >
              <div className="flex items-center gap-1 px-1.5 pt-1 pb-2">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setPlusView("main")}
                  className="w-7 h-7 flex items-center justify-center rounded-full liquid-glass-hover"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-4 h-4 text-foreground/80" />
                </motion.button>
                <span className="flex-1 text-[13px] font-semibold text-foreground/85">Skills</span>
                <button
                  onClick={() => { setPlusMenuOpen(false); navigate("/settings/skills"); }}
                  className="text-[11.5px] text-primary font-medium hover:opacity-80 px-2"
                >
                  Manage
                </button>
              </div>

              <div className="flex flex-col gap-1 max-h-[55vh] overflow-y-auto pr-0.5">
                <div className="px-3 pb-2 text-[11px] text-muted-foreground leading-snug">
                  Toggle the skills you want available. The AI decides which to use for each message — like Claude.
                </div>

                {mySkills.length === 0 && (
                  <button
                    onClick={() => { setPlusMenuOpen(false); navigate("/settings/skills"); }}
                    className="w-full flex items-center justify-center gap-2 py-5 mt-1 text-[12.5px] text-primary border border-dashed border-primary/30 rounded-xl"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add your first skill
                  </button>
                )}

                {mySkills.map((skill) => {
                  const enabled = skill.is_enabled !== false;
                  return (
                    <div
                      key={`mine-${skill.id}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleEnabled(skill, !enabled)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleEnabled(skill, !enabled); } }}
                      className={`w-full text-left px-3 py-2.5 rounded-2xl transition-colors cursor-pointer ${enabled ? "bg-primary/10" : "hover:bg-muted/40"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`flex-1 text-[13.5px] font-semibold truncate ${enabled ? "text-foreground/95" : "text-foreground/60"}`}>{skill.name}</span>
                        <span
                          className={`relative inline-flex h-[18px] w-[30px] items-center rounded-full transition-colors shrink-0 ${enabled ? "bg-primary" : "bg-muted"}`}
                          aria-hidden="true"
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow transition-transform ${enabled ? "translate-x-[14px]" : "translate-x-[2px]"}`}
                          />
                        </span>
                      </div>
                      {skill.description && (
                        <div className={`text-[11px] leading-tight truncate ${enabled ? "text-muted-foreground" : "text-muted-foreground/60"}`}>{skill.description}</div>
                      )}
                    </div>
                  );
                })}

                {librarySkills.length > 0 && (
                  <div className="mt-2 px-3 text-[10px] uppercase tracking-wide text-muted-foreground/70">Library</div>
                )}
                {librarySkills.filter((l) => !mySkills.some((m) => m.name === l.name)).map((skill) => (
                  <div key={`sys-${skill.id}`} className="px-3 py-2 rounded-2xl opacity-80 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-[13px] font-medium text-foreground/85 truncate">{skill.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Built-in</span>
                    </div>
                    {skill.description && <div className="text-[11px] text-muted-foreground leading-tight truncate">{skill.description}</div>}
                  </div>
                ))}
              </div>
            </motion.div>
          ) : plusView === "music" ? (
            <motion.div
              key="music"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col"
            >
              <div className="flex items-center gap-1 px-1.5 pt-1 pb-2">
                <motion.button whileTap={{ scale: 0.92 }} onClick={() => setPlusView("main")} className="w-7 h-7 flex items-center justify-center rounded-full liquid-glass-hover" aria-label="Back">
                  <ChevronLeft className="w-4 h-4 text-foreground/80" />
                </motion.button>
                <span className="text-[13px] font-semibold text-foreground/85">Study music</span>
              </div>
              <div className="flex flex-col gap-1">
                {[
                  { id: "Lo-fi", url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3" },
                  { id: "Classical", url: "https://cdn.pixabay.com/audio/2022/10/25/audio_92215f17a4.mp3" },
                  { id: "Nature sounds", url: "https://cdn.pixabay.com/audio/2022/03/15/audio_e1ada46b94.mp3" },
                  { id: "Focus beats", url: "https://cdn.pixabay.com/audio/2023/06/02/audio_5d4cb33a1d.mp3" },
                  { id: "White noise", url: "https://cdn.pixabay.com/audio/2022/03/24/audio_e87a37a40b.mp3" },
                  { id: "Off", url: "" },
                ].map((opt) => {
                  const active = (studyMusic.kind || "Off") === opt.id;
                  return (
                    <motion.button
                      key={opt.id}
                      whileTap={{ scale: 0.98 }}
                      transition={iosSpring}
                      onClick={() => {
                        if (opt.id === "Off") {
                          setStudyMusic({ kind: null });
                          if (studyAudioRef.current) { studyAudioRef.current.pause(); studyAudioRef.current.src = ""; }
                        } else {
                          setStudyMusic({ kind: opt.id });
                          if (!studyAudioRef.current) studyAudioRef.current = new Audio();
                          studyAudioRef.current.loop = true;
                          studyAudioRef.current.src = opt.url;
                          studyAudioRef.current.volume = 0.5;
                          studyAudioRef.current.play().catch(() => toast.info(`Selected ${opt.id} (audio blocked by browser)`));
                        }
                        setPlusView("main");
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors ${active ? "bg-emerald-500/10 border border-emerald-500/30" : "liquid-glass-hover border border-transparent"}`}
                    >
                      <Music2 className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                      <span className="flex-1 text-[13.5px] text-foreground/90">{opt.id}</span>
                      {active && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />}
                    </motion.button>
                  );
                })}

                {/* Upload your own track */}
                <button
                  type="button"
                  disabled={uploadingMusic}
                  onClick={() => musicFileInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-dashed border-emerald-500/40 hover:bg-emerald-500/5 transition-colors text-left disabled:opacity-60"
                >
                  {uploadingMusic
                    ? <Loader2 className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400 animate-spin" />
                    : <Plus className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" strokeWidth={2} />}
                  <span className="flex-1 text-[13.5px] text-foreground/90">{uploadingMusic ? "Uploading…" : "Upload your music"}</span>
                </button>

                {userTracks.length > 0 && (
                  <>
                    <div className="mt-2 px-3 text-[10px] uppercase tracking-wide text-muted-foreground/70">My tracks</div>
                    {userTracks.map((track) => {
                      const active = studyMusic.kind === track.name;
                      return (
                        <div
                          key={track.id}
                          className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors ${active ? "bg-emerald-500/10 border border-emerald-500/30" : "liquid-glass-hover border border-transparent"}`}
                        >
                          <button
                            onClick={() => { playUserTrack(track); setPlusView("main"); }}
                            className="flex-1 flex items-center gap-3 text-left min-w-0"
                          >
                            <Music2 className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                            <span className="flex-1 text-[13.5px] text-foreground/90 truncate">{track.name}</span>
                            {active && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={2.5} />}
                          </button>
                          <button
                            onClick={() => deleteUserTrack(track)}
                            className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                            aria-label={`Delete ${track.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
              <input
                ref={musicFileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleMusicUpload}
              />
            </motion.div>
          ) : plusView === "timer" ? (
            <motion.div
              key="timer"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col"
            >
              <div className="flex items-center gap-1 px-1.5 pt-1 pb-2">
                <motion.button whileTap={{ scale: 0.92 }} onClick={() => setPlusView("main")} className="w-7 h-7 flex items-center justify-center rounded-full liquid-glass-hover" aria-label="Back">
                  <ChevronLeft className="w-4 h-4 text-foreground/80" />
                </motion.button>
                <span className="text-[13px] font-semibold text-foreground/85">Focus timer</span>
              </div>
              <div className="px-2 pb-1">
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[15, 25, 45, 60].map((m) => (
                    <button
                      key={m}
                      onClick={() => setTimerInputMin(m)}
                      className={`py-2 rounded-xl text-[12.5px] font-semibold transition-colors ${timerInputMin === m ? "bg-emerald-600 text-white" : "liquid-glass-hover text-foreground/85"}`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={timerInputMin}
                    onChange={(e) => setTimerInputMin(Math.max(1, Math.min(180, parseInt(e.target.value || "0") || 1)))}
                    className="flex-1 bg-transparent border border-border/40 rounded-xl px-3 py-2 text-[13px] text-foreground outline-none focus:border-emerald-500/60"
                  />
                  <span className="text-[12px] text-muted-foreground">minutes</span>
                </div>
                <button
                  onClick={() => {
                    const id = `timer-${Date.now()}`;
                    setStudyTimers((prev) => [...prev, { id, totalSec: timerInputMin * 60, startedAt: Date.now(), paused: false, pausedRemaining: null }]);
                    setPlusMenuOpen(false);
                    setTimeout(() => scrollToBottom(), 100);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-500 transition-colors"
                >
                  <Play className="w-4 h-4" fill="currentColor" /> Start session
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="tools"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col"
            >
              <div className="flex items-center gap-1 px-1.5 pt-1 pb-1.5">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setPlusView("main")}
                  className="w-7 h-7 flex items-center justify-center rounded-full liquid-glass-hover"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-4 h-4 text-foreground/80" />
                </motion.button>
                <span className="text-[13px] font-semibold text-foreground/85">Tools</span>
              </div>

              {userIntegrations.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-[13px] text-foreground/80 mb-1">You're not connected to any apps yet</p>
                  <p className="text-[11px] text-muted-foreground mb-3">Connect tools to extend Megsy with your data.</p>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    transition={iosSpring}
                    onClick={() => { setPlusMenuOpen(false); setConnectorsOpen(true); }}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold hover:bg-primary/90 transition-opacity"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Connect now
                  </motion.button>
                </div>
              ) : (
                <div className="flex flex-col">
                  {userIntegrations.map((name) => (
                    <div key={name} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl">
                      <div className="w-7 h-7 rounded-lg bg-secondary/70 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="flex-1 text-[13.5px] text-foreground/85">{name}</span>
                    </div>
                  ))}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    transition={iosSpring}
                    onClick={() => { setPlusMenuOpen(false); setConnectorsOpen(true); }}
                    className="mt-1 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl liquid-glass-hover text-[12.5px] text-primary font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Manage connections
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );


  const renderAttachments = () => {
    if (attachedFiles.length === 0) return null;
    return (
      <div className="flex gap-2 px-2 overflow-x-auto pb-1 mb-1">
        {attachedFiles.map((f, i) =>
        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg liquid-glass-button text-xs text-foreground shrink-0">
            {f.type === "image" ? <img src={f.data} alt="" className="w-8 h-8 rounded object-cover" /> : <FileUp className="w-3 h-3" />}
            <span className="truncate max-w-[100px]">{f.name}</span>
            <button onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>);
  };

  // Glass dialog class
  const glassDialogClass = "max-w-[calc(100vw-2rem)] sm:max-w-[400px] p-0 gap-0 overflow-hidden rounded-2xl liquid-glass";

  return (
    <AppLayout
      onSelectConversation={loadConversation}
      onNewChat={handleNewChat}
      activeConversationId={conversationId}>
      
      <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
        <AppSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onNewChat={handleNewChat}
          onSelectConversation={loadConversation}
          activeConversationId={conversationId}
          currentMode={chatMode === "learning" ? "learning" : chatMode === "deep-research" ? "research" : chatMode === "shopping" ? "shopping" : "chat"} />

        {/* Header */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center gap-2 px-4 py-2.5 min-h-[56px] pointer-events-none [&>*]:pointer-events-auto">
          <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-full text-foreground/85 hover:bg-accent/40 transition-colors" aria-label="Open menu">
            <Menu className="w-[20px] h-[20px]" />
          </button>

          {/* Center: Unlock Pro (only when no conversation) */}
          <div className="flex-1 flex items-center justify-center">
            {!hasConversation && (
              <UnlockProButton
                onClick={() => navigate("/pricing")}
                aria-label="Unlock Pro"
                text="Unlock Pro"
              />
            )}
          </div>

          <div className="flex items-center gap-1">
            {hasConversation && conversationId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 flex items-center justify-center rounded-full text-foreground/85 hover:bg-accent/40 transition-colors" aria-label="More options">
                  <MoreVertical className="w-[20px] h-[20px]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-[15rem] rounded-2xl liquid-glass border border-border/30 p-1.5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)]"
              >
                {[
                  { icon: Plus, label: "New chat", onClick: handleNewChat, featured: true },
                  { icon: Share2, label: "Share chat", onClick: handleShare },
                  { icon: UserPlus, label: "Invite people", onClick: handleInvite },
                  { icon: Pencil, label: "Rename", onClick: () => { setRenameValue(conversationTitle); setIsRenaming(true); } },
                  { icon: Pin, label: isPinned ? "Unpin chat" : "Pin chat", onClick: handleTogglePin },
                ].map(({ icon: Icon, label, onClick, featured }) => (
                  <DropdownMenuItem
                    key={label}
                    onClick={onClick}
                    className="rounded-xl px-2.5 py-2.5 text-[14px] gap-3 cursor-pointer text-foreground/90 focus:bg-accent/40 data-[highlighted]:bg-accent/40"
                  >
                    <span className="w-8 h-8 rounded-xl bg-accent/30 flex items-center justify-center shrink-0">
                      <Icon className={`w-[15px] h-[15px] ${featured ? "text-purple-400" : "text-foreground/85"}`} strokeWidth={1.9} />
                    </span>
                    <span className={`flex-1 truncate ${featured ? "font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent" : ""}`}>{label}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="my-1.5 bg-border/40" />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="rounded-xl px-2.5 py-2.5 text-[14px] gap-3 cursor-pointer text-destructive focus:text-destructive data-[highlighted]:bg-destructive/10"
                >
                  <span className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                    <Trash2 className="w-[15px] h-[15px]" strokeWidth={1.9} />
                  </span>
                  <span className="flex-1 truncate">Delete chat</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto min-h-0 relative" ref={messagesContainerRef} onScroll={handleScroll}>
          {loadingMessages && messages.length === 0 ? (
            <div className="max-w-3xl mx-auto pt-20 pb-44 md:pb-52 px-4 md:px-6 space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`h-12 rounded-2xl bg-muted/60 animate-pulse ${i % 2 === 0 ? "w-2/3" : "w-3/4"}`}
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center px-6 pb-32">
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
                className="relative inline-flex items-center gap-3"
              >
                <div className={`absolute inset-0 -m-8 rounded-full blur-2xl animate-pulse ${chatMode === "deep-research" ? "bg-violet-500/20" : chatMode === "learning" ? "bg-emerald-500/20" : "bg-blue-500/15"}`} />
                <PegtopIcon className={`relative w-9 h-9 md:w-10 md:h-10 ${chatMode === "deep-research" ? "text-violet-500 drop-shadow-[0_0_18px_rgba(139,92,246,0.7)]" : chatMode === "learning" ? "text-emerald-500 drop-shadow-[0_0_18px_rgba(16,185,129,0.7)]" : "text-blue-500 drop-shadow-[0_0_18px_rgba(59,130,246,0.7)]"}`} />
                <AnimatedHeadline
                  text={chatMode === "deep-research" ? "Research" : chatMode === "learning" ? "Learn" : "Create"}
                  highlight={chatMode === "deep-research" ? "deeply" : chatMode === "learning" ? "anything" : "something"}
                  highlightColor={chatMode === "deep-research" ? "#8B5CF6" : chatMode === "learning" ? "#10B981" : "#3B82F6"}
                />
              </motion.div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto pt-20 pb-44 md:pb-52 px-4 md:px-6 space-y-2">
              {messages.map((msg, i) => {
                const isOther = msg.role === "user" && !!msg.user_id && !!chatUserId && msg.user_id !== chatUserId;
                const isStreamingThis = isLoading && i === messages.length - 1 && msg.role === "assistant";
                return (
                <motion.div
                  key={msg.clientId || msg.id || `idx-${i}`}
                  initial={isStreamingThis ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <ChatMessage
                    messageIndex={i}
                    role={msg.role}
                    content={msg.content}
                    images={msg.images}
                    products={msg.products}
                    attachedImages={msg.attachedImages}
                    attachedFiles={msg.attachedFiles}
                    isStreaming={isLoading && i === messages.length - 1 && msg.role === "assistant"}
                    isThinking={isThinking && i === messages.length - 1 && msg.role === "assistant" && !msg.content}
                    searchStatus={i === messages.length - 1 && msg.role === "assistant" ? searchStatus : undefined}
                    liked={msg.liked}
                    onLikeMessage={handleLikeMessage}
                    onShare={undefined}
                    onStructuredAction={handleStructuredAction}
                    onEditUserMessageAt={msg.role === "user" ? handleEditUserMessageAt : undefined}
                    isDeepResearch={msg.mode === "deep-research" && msg.role === "assistant"}
                    researchQuery={msg.role === "assistant" && i > 0 && messages[i - 1]?.role === "user" ? messages[i - 1].content : undefined}
                    researchSessionKey={msg.role === "assistant" && conversationId ? `conv_${conversationId}_${i}` : undefined}
                    narrations={msg.role === "assistant" && i === messages.length - 1 ? narrations : undefined}
                    senderName={members.length > 0 ? msg.senderName || undefined : undefined}
                    senderAvatar={members.length > 0 ? msg.senderAvatar || undefined : undefined}
                    isOtherMember={isOther}
                    bubbleColor={isOther ? colorForUser(msg.user_id!) : null}
                    messageId={msg.id}
                    currentUserId={chatUserId || undefined}
                    reactions={msg.id ? (messageReactions[msg.id] || EMPTY_REACTIONS) : EMPTY_REACTIONS}
                    onToggleReaction={msg.id ? toggleReaction : undefined}
                    readers={msg.id ? (readersByMessageId[msg.id] || EMPTY_READERS) : EMPTY_READERS}
                    showReaders={members.length > 0 && msg.role === "user" && msg.user_id === chatUserId && i === messages.length - 1 - (messages[messages.length - 1]?.role === "assistant" ? 1 : 0)}
                   />
                   {/* Phase 5: Suggested follow-ups under final assistant reply */}
                   {msg.role === "assistant" && !isStreamingThis && i === messages.length - 1 && msg.content && i > 0 && messages[i - 1]?.role === "user" && (
                     <ChatFollowups
                       userMessage={messages[i - 1].content || ""}
                       assistantReply={msg.content || ""}
                       conversationId={conversationId}
                       messageId={msg.id || null}
                       onPick={(q) => setInput(q)}
                     />
                   )}
                 </motion.div>
                 );
               })}
              {/* Sticky in-chat focus timers — float above messages while scrolling */}
              {chatMode === "learning" && studyTimers.length > 0 && (
                <div className="sticky top-16 z-30 flex flex-col gap-2 pointer-events-none">
                  <AnimatePresence>
                    {studyTimers.map((t) => (
                      <div key={t.id} className="pointer-events-auto">
                        <InChatTimerCard
                          id={t.id}
                          totalSec={t.totalSec}
                          startedAt={t.startedAt}
                          paused={t.paused}
                          pausedRemaining={t.pausedRemaining}
                          onPauseToggle={(id) => setStudyTimers((prev) => prev.map((x) => {
                            if (x.id !== id) return x;
                            if (x.paused) {
                              const remaining = x.pausedRemaining ?? x.totalSec;
                              return { ...x, paused: false, startedAt: Date.now() - (x.totalSec - remaining) * 1000, pausedRemaining: null };
                            }
                            const remaining = Math.max(0, x.totalSec - Math.floor((Date.now() - x.startedAt) / 1000));
                            return { ...x, paused: true, pausedRemaining: remaining };
                          }))}
                          onCancel={(id) => setStudyTimers((prev) => prev.filter((x) => x.id !== id))}
                        />
                      </div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* System events (join/leave) */}
              <AnimatePresence>
                {systemEvents.slice(-3).map((ev) => (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex justify-center my-2"
                  >
                    <span className="px-3 py-1 rounded-full bg-muted/60 text-[11px] text-muted-foreground">
                      {ev.text}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground"
                >
                  <div className="flex -space-x-1.5">
                    {typingUsers.slice(0, 3).map((u) => {
                      const c = colorForUser(u.id);
                      return u.avatar ? (
                        <img key={u.id} src={u.avatar} alt="" className="w-5 h-5 rounded-full ring-2 ring-background object-cover" />
                      ) : (
                        <div key={u.id} className="w-5 h-5 rounded-full ring-2 ring-background flex items-center justify-center text-[9px] font-bold text-white" style={{ background: c?.bg || "hsl(var(--accent))" }}>
                          {(u.name || "?")[0]?.toUpperCase()}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span>{typingUsers.map((u) => u.name).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing…</span>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          <AnimatePresence>
            {(showScrollBtn || newMessagesCount > 0) && messages.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                onClick={scrollToBottom}
                className={`fixed bottom-40 left-1/2 -translate-x-1/2 z-20 ${newMessagesCount > 0 ? "px-3 h-8 gap-1.5 bg-primary text-primary-foreground" : "w-8 h-8 liquid-glass text-foreground/70 hover:text-foreground"} rounded-full flex items-center justify-center transition-colors shadow-lg`}
                aria-label="Scroll to bottom"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                {newMessagesCount > 0 && (
                  <span className="text-xs font-semibold">{newMessagesCount} new</span>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom input - floating with blur */}
        <div className="fixed inset-x-0 bottom-0 z-30 px-3 md:px-6 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 pointer-events-none">
            <div className="max-w-3xl mx-auto space-y-2 pointer-events-auto">
              {/* Quick mode toggles - hidden when their mode is active */}
              <AnimatePresence initial={false}>
                {(chatMode !== "deep-research" && chatMode !== "learning") && (
                  <motion.div
                    key="mode-toggles"
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-2 overflow-hidden"
                  >
                    <DeepResearchToggle
                      active={false}
                      onToggle={() => {
                        setChatMode("deep-research");
                        setSearchEnabled(true);
                        setPlusMenuOpen(false);
                      }}
                    />
                    <LearnModeToggle
                      active={false}
                      onToggle={() => {
                        setChatMode("learning");
                        setPlusMenuOpen(false);
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Mode badge above input */}
              <AnimatePresence>
                {chatMode !== "normal" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex items-center"
                  >
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium liquid-glass-subtle ${
                      chatMode === "learning" ? "text-emerald-400" :
                      chatMode === "shopping" ? "text-amber-400" :
                      chatMode === "deep-research" ? "text-violet-400" : "text-foreground"
                    }`}>
                      {chatMode === "learning" && <GraduationCap className="w-3.5 h-3.5" />}
                      {chatMode === "shopping" && <ShoppingCart className="w-3.5 h-3.5" />}
                      {chatMode === "deep-research" && <Globe className="w-3.5 h-3.5" />}
                      <span>{chatMode === "learning" ? "Learning" : chatMode === "shopping" ? "Shopping" : "Deep Research"}</span>
                      <button
                        onClick={() => { setChatMode("normal"); setSelectedAgent(null); setSelectedModel(null); }}
                        className="ml-0.5 p-0.5 rounded-full hover:bg-accent/50 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  </motion.div>
                )}
                {selectedAgent && chatMode === "normal" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex items-center"
                  >
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm border border-border/30 ${selectedAgent.bg} ${selectedAgent.color}`}>
                      {(() => { const Icon = selectedAgent.icon; return <Icon className="w-3.5 h-3.5" />; })()}
                      <span>{selectedAgent.label}</span>
                      <button
                        onClick={() => { setSelectedAgent(null); setSelectedModel(null); }}
                        className="ml-0.5 p-0.5 rounded-full hover:bg-accent/50 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Learning quick-tools row removed — everything happens inside chat */}

              {/* Mode chips removed per request */}

              {renderAttachments()}

              <AnimatePresence>
                {remoteAiBusy && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 320, damping: 24 }}
                    className="relative mx-auto overflow-hidden px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/30 text-amber-600 text-xs flex items-center justify-center gap-2"
                  >
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1 h-1 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1 h-1 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                    <span className="font-medium">Megsy is replying to {remoteAiBusy.name}…</span>
                    <motion.span
                      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-400/20 to-transparent"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>



              <div className="relative mx-auto w-full max-w-3xl">
                <AnimatePresence>
                  {plusMenuOpen && renderPlusMenu()}
                </AnimatePresence>
                {mentionQuery && members.filter((m) => (m.name || "").toLowerCase().includes(mentionQuery.q.toLowerCase())).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="absolute bottom-full left-0 right-0 mb-2 mx-3 rounded-xl border border-border bg-popover shadow-lg overflow-hidden z-30"
                  >
                    {members
                      .filter((m) => (m.name || "").toLowerCase().includes(mentionQuery.q.toLowerCase()))
                      .slice(0, 5)
                      .map((m) => {
                        const c = colorForUser(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => insertMention(m.name || "Member")}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left transition-colors"
                          >
                            {m.avatar ? (
                              <img src={m.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: c?.bg || "hsl(var(--accent))" }}>
                                {(m.name || "?")[0]?.toUpperCase()}
                              </div>
                            )}
                            <span className="text-sm flex-1 truncate">{m.name || "Member"}</span>
                            {onlineUsers.has(m.id) && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                          </button>
                        );
                      })}
                  </motion.div>
                )}
                {editingIndex !== null && (
                  <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-2xl liquid-glass border border-border/30">
                    <Pencil className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-[12px] text-foreground/80 flex-1 truncate">Editing message</span>
                    <button
                      onClick={cancelEdit}
                      className="text-[11px] font-medium text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md hover:bg-accent/40 transition-colors"
                    >Cancel</button>
                  </div>
                )}
                <AnimatedInput
                  value={input}
                  onChange={setInput}
                  onSend={handleSend}
                  onCancel={handleCancel}
                  onPlusClick={() => { if (!plusMenuOpen) setPlusView("main"); setPlusMenuOpen(!plusMenuOpen); }}
                  disabled={isLoading || !!remoteAiBusy}
                  isLoading={isLoading}
                  pendingQuestions={pendingQuestions}
                  onQuestionAnswer={handleQuestionAnswer}
                  onQuestionSkip={handleQuestionSkip}
                  activeAgent={chatMode !== "normal" ? chatMode : (selectedAgent?.id || null)}
                  onAgentSelect={(agent: AgentDef) => {
                    const modeMap: Record<string, ChatMode> = { learning: "learning", shopping: "shopping", "deep-research": "deep-research" };
                    if (modeMap[agent.id]) {
                      setSelectedAgent(null);
                      setSelectedModel(null);
                      handleModeChange(modeMap[agent.id]);
                      return;
                    }
                    setChatMode("normal");
                    setSelectedAgent(agent);
                    setSelectedModel(null);
                  }}
                  onAgentRemove={() => { setChatMode("normal"); setSelectedAgent(null); setSelectedModel(null); if (chatMode === "deep-research") setSearchEnabled(false); }}
                  selectedModel={selectedModel}
                  onModelSelect={(model: AgentModel) => setSelectedModel(model)}
                  onModelRemove={() => setSelectedModel(null)}
                  accentMode={chatMode === "learning" ? "learn" : null}
                />
              </div>
            </div>
          </div>

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.txt,.md,.csv,.json,.js,.ts,.py,.html,.css,.xml,.doc,.docx" multiple />
        <input ref={cameraInputRef} type="file" className="hidden" onChange={handleCameraCapture} accept="image/*" capture="environment" />
        <input ref={imageInputRef} type="file" className="hidden" onChange={handleImageUpload} accept="image/*" multiple />

        <ConnectorsDialog open={connectorsOpen} onOpenChange={setConnectorsOpen} onNavigateIntegrations={() => navigate("/settings/integrations")} />


        {/* Share Dialog - Glass */}
        <Dialog open={shareDialogOpen} onOpenChange={(open) => {setShareDialogOpen(open);if (!open) setGeneratedShareUrl(null);}}>
          <DialogContent className={glassDialogClass}>
            <div className="px-5 pt-5 pb-3">
              <DialogHeader className="mb-0">
                <DialogTitle className="text-base font-semibold text-left text-black">Share chat</DialogTitle>
                <DialogDescription className="text-xs text-left text-black/70">Future messages aren't included</DialogDescription>
              </DialogHeader>
            </div>
            <div className="border-t border-border/30">
              <button
                onClick={() => {setShareMode("private");setGeneratedShareUrl(null);}}
                className={`w-full flex items-center gap-3 px-5 py-3.5 transition-colors ${shareMode === "private" ? "bg-accent/50" : "hover:bg-accent/30"}`}>
                <Lock className="w-4 h-4 text-black shrink-0" />
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-semibold text-black">Keep private</p>
                  <p className="text-[11px] text-black/70">Only you have access</p>
                </div>
              </button>
              <div className="h-px bg-border/30 mx-5" />
              <button
                onClick={() => { setShareMode("public"); if (!generatedShareUrl) handleCreateShareLink("public"); }}
                className={`w-full flex items-center gap-3 px-5 py-3.5 transition-colors ${shareMode === "public" ? "bg-accent/50" : "hover:bg-accent/30"}`}>
                <Globe className="w-4 h-4 text-black shrink-0" />
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-semibold text-black">Create public link</p>
                  <p className="text-[11px] text-black/70">Anyone with the link can view</p>
                </div>
              </button>
            </div>
            <div className="px-5 py-4 border-t border-border/30">
              {shareMode === "public" ? (
                generatedShareUrl ? (
                  <div className="mx-auto flex items-center justify-center gap-2 max-w-full w-fit rounded-xl liquid-glass-button px-3 py-2.5 overflow-hidden">
                    <span className="text-[12px] font-medium text-black tracking-tight truncate min-w-0 max-w-[60vw]" dir="ltr">
                      {(() => {
                        try {
                          const u = new URL(generatedShareUrl);
                          const tail = u.pathname.split("/").pop() || "";
                          return `${u.host}/…/${tail.slice(0, 6)}`;
                        } catch { return generatedShareUrl.slice(0, 24) + "…"; }
                      })()}
                    </span>
                    <button onClick={handleCopyShareLink} className="shrink-0 p-1.5 rounded-lg liquid-glass-hover transition-colors" aria-label="Copy">
                      <Copy className="w-3.5 h-3.5 text-black" />
                    </button>
                  </div>
                ) : (
                  <p className="text-center text-[12px] text-black/60">Generating link…</p>
                )
              ) : (
                <p className="text-center text-[12px] font-medium text-black">Everything stays private to you</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Rename Dialog - Glass (matches Share dialog style) */}
        <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
          <DialogContent className={glassDialogClass}>
            <div className="px-5 pt-5 pb-3">
              <DialogHeader className="mb-0">
                <DialogTitle className="text-base font-semibold text-left text-black">Rename chat</DialogTitle>
                <DialogDescription className="text-xs text-left text-black/70">Give this conversation a new name</DialogDescription>
              </DialogHeader>
            </div>
            <div className="border-t border-border/30 px-5 py-4">
              <div className="flex items-center gap-3 rounded-xl liquid-glass-button px-3 py-2.5">
                <Pencil className="w-4 h-4 text-black shrink-0" />
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename()}
                  placeholder="Chat name"
                  autoFocus
                  className="flex-1 bg-transparent border-0 outline-none text-sm font-medium text-black placeholder:text-black/40"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-5 border-t border-border/30 pt-4">
              <button onClick={() => setIsRenaming(false)} className="px-4 py-2 rounded-xl text-sm text-black/70 hover:text-black liquid-glass-hover transition-colors">Cancel</button>
              <button onClick={handleRename} className="px-4 py-2 rounded-xl text-sm font-semibold bg-black text-white hover:opacity-90 transition-opacity">Save</button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirm Pin/Unpin Dialog - Glass (matches Share dialog style) */}
        <Dialog open={confirmPinOpen} onOpenChange={setConfirmPinOpen}>
          <DialogContent className={glassDialogClass}>
            <div className="px-5 pt-5 pb-3">
              <DialogHeader className="mb-0">
                <DialogTitle className="text-base font-semibold text-left text-black">{isPinned ? "Unpin this chat?" : "Pin this chat?"}</DialogTitle>
                <DialogDescription className="text-xs text-left text-black/70">{isPinned ? "Remove from the top of your list" : "Keep it at the top of your conversations"}</DialogDescription>
              </DialogHeader>
            </div>
            <div className="border-t border-border/30 px-5 py-4">
              <div className="flex items-center gap-3 rounded-xl liquid-glass-button px-3 py-2.5">
                <Pin className="w-4 h-4 text-black shrink-0" />
                <p className="text-[12px] font-medium text-black">{isPinned ? "This chat won't be pinned anymore." : "Pinned chats stay easy to find."}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-5 border-t border-border/30 pt-4">
              <button onClick={() => setConfirmPinOpen(false)} className="px-4 py-2 rounded-xl text-sm text-black/70 hover:text-black liquid-glass-hover transition-colors">Cancel</button>
              <button onClick={performTogglePin} className="px-4 py-2 rounded-xl text-sm font-semibold bg-black text-white hover:opacity-90 transition-opacity">{isPinned ? "Unpin" : "Pin"}</button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirm Delete Dialog - Glass (matches Share dialog style) */}
        <Dialog open={confirmDeleteOpen} onOpenChange={(o) => !isDeleting && setConfirmDeleteOpen(o)}>
          <DialogContent className={glassDialogClass}>
            <div className="px-5 pt-5 pb-3">
              <DialogHeader className="mb-0">
                <DialogTitle className="text-base font-semibold text-left text-black">Delete this chat?</DialogTitle>
                <DialogDescription className="text-xs text-left text-black/70">This action can't be undone</DialogDescription>
              </DialogHeader>
            </div>
            <div className="border-t border-border/30 px-5 py-4">
              <div className="flex items-center gap-3 rounded-xl liquid-glass-button px-3 py-2.5">
                <Trash2 className="w-4 h-4 text-black shrink-0" />
                <p className="text-[12px] font-medium text-black">The conversation and all its messages will be permanently removed.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-5 border-t border-border/30 pt-4">
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-sm text-black/70 hover:text-black liquid-glass-hover transition-colors disabled:opacity-50"
              >Cancel</button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={inviteDialogOpen} onOpenChange={(open) => { setInviteDialogOpen(open); if (!open) { setInviteLink(null); setInviteEmail(""); } }}>
          <DialogContent className={`${glassDialogClass} sm:max-w-[420px]`}>
            <div className="px-5 pt-5 pb-4">
              <DialogHeader className="mb-0">
                <DialogTitle className="text-base font-semibold text-left text-black">Invite people</DialogTitle>
                <DialogDescription className="text-xs text-left text-black/70 mt-0.5">Add someone to chat together in this conversation</DialogDescription>
              </DialogHeader>
            </div>

            {/* Email invite — primary action */}
            <div className="px-5 pb-4 border-t border-border/30 pt-4">
              <div className="flex items-center gap-2">
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="flex-1 h-11 rounded-xl border-border/30 bg-accent/30 text-sm text-black placeholder:text-black/40"
                  onKeyDown={(e) => e.key === "Enter" && handleSendInviteEmail()}
                />
                <button
                  onClick={handleSendInviteEmail}
                  disabled={inviteLoading || !inviteEmail.trim()}
                  className="px-4 h-11 rounded-xl text-sm font-semibold bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Invite"}
                </button>
              </div>
            </div>

            {/* Or divider */}
            <div className="px-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-border/40" />
              <span className="text-[10px] font-semibold text-black/50 uppercase tracking-wider">or share link</span>
              <div className="flex-1 h-px bg-border/40" />
            </div>

            {/* Truncated link */}
            <div className="px-5 pt-4 pb-5">
              {inviteLink ? (
                <div className="mx-auto flex items-center justify-center gap-2 max-w-full w-fit rounded-xl liquid-glass-button px-3 py-2.5 overflow-hidden">
                  <span className="text-[12px] font-medium text-black tracking-tight truncate min-w-0 max-w-[60vw]" dir="ltr">
                    {(() => {
                      try {
                        const u = new URL(inviteLink);
                        const tok = new URLSearchParams(u.search).get("invite") || "";
                        return `${u.host}/…/${tok.slice(0, 6)}`;
                      } catch { return inviteLink.slice(0, 24) + "…"; }
                    })()}
                  </span>
                  <button onClick={handleCopyInviteLink} className="shrink-0 p-1.5 rounded-lg liquid-glass-hover transition-colors" aria-label="Copy">
                    <Copy className="w-3.5 h-3.5 text-black" />
                  </button>
                </div>
              ) : (
                <p className="text-center text-[12px] text-black/60">Generating link…</p>
              )}
            </div>

            {members.length > 0 && (
              <div className="px-5 py-4 border-t border-border/30">
                <p className="text-[11px] font-semibold text-black/70 uppercase tracking-wide mb-2">People with access ({members.length + 1})</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 py-1">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-semibold text-primary">You</div>
                    <span className="text-xs text-black">Owner</span>
                  </div>
                  {members.map((m) => {
                    const c = colorForUser(m.id);
                    const isOwner = chatUserId && conversationOwnerId === chatUserId;
                    const isOnline = onlineUsers.has(m.id);
                    return (
                      <div key={m.id} className="flex items-center gap-2 py-1">
                        <div className="relative">
                          {m.avatar ? (
                            <img src={m.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white" style={{ background: c?.bg || "hsl(var(--accent))" }}>
                              {(m.name || "?")[0]?.toUpperCase()}
                            </div>
                          )}
                          {isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" title="Online" />
                          )}
                        </div>
                        <span className="text-xs text-black flex-1 truncate">{m.name || "Member"}</span>
                        <span className="text-[10px] text-black/50 capitalize">{isOnline ? "online" : m.role}</span>
                        {isOwner && (
                          <button
                            onClick={() => handleKickMember(m.id)}
                            className="ml-1 px-2 py-1 rounded-md text-[11px] font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>);
};

export default ChatPage;
