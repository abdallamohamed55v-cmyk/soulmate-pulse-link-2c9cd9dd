import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Pin, Wallet, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  mode: string;
  is_pinned?: boolean;
}

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelectConversation?: (id: string) => void;
  activeConversationId?: string | null;
  currentMode?: string;
}

const serviceItems = [
  { path: "/chat", label: "Chat" },
  { path: "/images", label: "Images" },
  { path: "/videos", label: "Videos" },
  { path: "/voice", label: "Voice" },
  { path: "/code", label: "Programming" },
  { path: "/files", label: "Files" },
];

const THEME_PALETTES = [
  { bg: "hsl(0, 0%, 4%)", surface: "hsl(0, 0%, 8%)" },
];

const cacheKey = (mode: string, uid: string) => `sidebar:convos:${mode}:${uid}`;

const AppSidebar = ({ open, onClose, onNewChat, onSelectConversation, activeConversationId, currentMode = "chat" }: AppSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const palette = useMemo(() => {
    if (!open) return THEME_PALETTES[0];
    return THEME_PALETTES[Math.floor(Math.random() * THEME_PALETTES.length)];
  }, [open]);

  // Files & Programming pages: history lives under the input, NOT in the sidebar.
  // On chat & research, show BOTH chat and research conversations together so the user
  // can always find their deep-research sessions even when they came back via /chat.
  const showRecent = ["chat", "learning", "shopping", "research"].includes(currentMode);
  const showsBothChatAndResearch = currentMode === "chat" || currentMode === "research";
  const hideStudioAndHistory = ["images", "videos", "code", "files"].includes(currentMode);

  // Hydrate from cache instantly so the list never disappears between page changes.
  useEffect(() => {
    if (!showRecent || !currentUserId) return;
    try {
      const raw = localStorage.getItem(cacheKey(currentMode, currentUserId));
      if (raw) {
        const cached = JSON.parse(raw) as Conversation[];
        if (Array.isArray(cached)) setConversations(cached);
      }
    } catch {}
  }, [currentUserId, currentMode, showRecent]);

  // Always load user info + conversations on mount and when mode changes.
  // Don't gate on `open` — the list should be ready the instant the user taps the menu.
  useEffect(() => {
    loadUserInfo();
  }, []);

  useEffect(() => {
    if (showRecent) loadConversations();
  }, [currentMode, currentUserId]);

  // Refresh on focus so newly created conversations show up.
  useEffect(() => {
    const onFocus = () => { if (showRecent) loadConversations(); };
    const onConversationsChanged = () => { if (showRecent) loadConversations(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("megsy:conversations-changed", onConversationsChanged);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("megsy:conversations-changed", onConversationsChanged);
    };
  }, [currentMode, showRecent, currentUserId]);

  const loadUserInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);
    const emailPrefix = user.email?.split("@")[0] || "User";
    setUserName(user.user_metadata?.full_name || emailPrefix);
    setUserEmail(user.email || "");
    const { data: profile } = await supabase.from("profiles").select("credits, avatar_url, display_name").eq("id", user.id).single();
    if (profile) {
      setCredits(Number(profile.credits) || 0);
      setAvatarUrl(profile.avatar_url || user.user_metadata?.avatar_url || null);
      if (profile.display_name) setUserName(profile.display_name);
    }
  };

  const loadConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const validModes = ["code", "images", "videos", "files", "learning", "shopping", "research"];
    const modeFilter = validModes.includes(currentMode) ? currentMode : "chat";
    const modesToFetch = showsBothChatAndResearch ? ["chat", "research"] : [modeFilter];

    // Conversations the user is a member of (joined via invite)
    const { data: memberRows } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);
    const memberConvIds = (memberRows || []).map((r: any) => r.conversation_id);

    let query = supabase
      .from("conversations")
      .select("id, title, updated_at, mode, is_pinned")
      .in("mode", modesToFetch);
    if (memberConvIds.length > 0) {
      query = query.or(`user_id.eq.${user.id},id.in.(${memberConvIds.join(",")})`);
    } else {
      query = query.eq("user_id", user.id);
    }
    const { data } = await query
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(30);
    if (data) {
      setConversations(data);
      try { localStorage.setItem(cacheKey(modeFilter, user.id), JSON.stringify(data)); } catch {}
    }
  };

  const initial = userName.charAt(0).toUpperCase() || "U";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-background/60 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
            onTouchStart={onClose}
          />

          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed left-0 top-0 bottom-0 z-[91] w-[280px] flex flex-col overflow-hidden rounded-r-2xl"
            style={{ background: palette.bg }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full">
              <div className="h-3" />

              {/* New Chat button */}
              <div className="px-3 mb-2">
                <button
                  onClick={() => { onNewChat(); onClose(); navigate(location.pathname); }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{ background: "linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(271, 81%, 56%) 50%, hsl(330, 81%, 60%) 100%)", color: "#fff" }}
                >
                  <Plus className="w-4 h-4" />
                  New chat
                </button>
              </div>

              {/* Services */}
              <div className="px-3">
                <div className="space-y-0.5">
                  {serviceItems.map((item, i) => {
                    const isActive = location.pathname === item.path;
                    const colors = ["text-blue-400", "text-emerald-400", "text-rose-400", "text-amber-400", "text-violet-400", "text-cyan-400"];
                    const activeColor = colors[i % colors.length];
                    return (
                      <button
                        key={item.path}
                        onClick={() => { navigate(item.path); onClose(); }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? `bg-white/8 ${activeColor}`
                            : "text-white/50 hover:bg-white/5 hover:text-white/70"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recent conversations */}
              {showRecent && (
                <div className="flex-1 overflow-y-auto px-3 pt-2">
                  {conversations.length === 0 ? (
                    <p className="text-xs text-white/25 px-3 py-4">No conversations yet</p>
                  ) : (
                    <div className="space-y-0.5">
                      {conversations.map((conv) => {
                        const isResearch = conv.mode === "research";
                        const targetPath = "/chat";
                        const onCurrentPage = location.pathname === targetPath;
                        return (
                          <button
                            key={conv.id}
                            onClick={() => {
                              onClose();
                              if (onCurrentPage) {
                                onSelectConversation?.(conv.id);
                              } else {
                                navigate(targetPath, { state: { loadConversationId: conv.id } });
                              }
                            }}
                            className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                              activeConversationId === conv.id
                                ? "bg-white/12 text-white"
                                : "text-white/50 hover:bg-white/5 hover:text-white/70"
                            }`}
                          >
                            {conv.is_pinned && <Pin className="w-3 h-3 shrink-0 text-white/40" />}
                            <span className="truncate flex-1">{conv.title}</span>
                            {isResearch && (
                              <span className="shrink-0 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-300">
                                {currentMode === "chat" ? "R" : "Research"}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {!showRecent && <div className="flex-1" />}

              {/* Bottom: credits + user */}
              <div className="p-3 space-y-2">
                <div className="px-2 py-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-white/70">MC Balance</span>
                    <span className="text-xs text-white/40">{credits.toFixed(0)}</span>
                  </div>
                  <div className="w-full h-2 bg-white/8 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((credits / 100) * 100, 100)}%`, background: "hsl(var(--primary))" }} />
                  </div>
                </div>

                {/* User + billing merged bar */}
                <div className="flex items-center rounded-xl overflow-hidden" style={{ background: palette.surface }}>
                  <button
                    onClick={() => { navigate("/settings"); onClose(); }}
                    className="flex-1 flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/12 flex items-center justify-center text-sm font-medium text-white">
                        {initial}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/85 truncate">{userName}</p>
                      <p className="text-[11px] text-white/35 truncate">{userEmail || "Free Plan"}</p>
                    </div>
                  </button>
                  <div className="w-px h-8 bg-white/10" />
                  <button
                    onClick={() => { navigate("/pricing"); onClose(); }}
                    className="w-12 h-full flex items-center justify-center hover:bg-white/5 transition-colors shrink-0"
                    title="Credits & Plans"
                  >
                    <Wallet className="w-4 h-4 text-white/60" />
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default AppSidebar;
