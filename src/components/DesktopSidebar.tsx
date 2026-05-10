import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown } from "lucide-react";
import FancyButton from "@/components/FancyButton";

interface DesktopSidebarProps {
  onSelectConversation?: (id: string) => void;
  onNewChat?: () => void;
  activeConversationId?: string | null;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  mode?: string;
}

/* ── Mega-menu structure ── */
interface SubItem { label: string; desc: string; action: string; }
interface MenuColumn { title: string; items: SubItem[]; }
interface DropdownNav { label: string; columns: MenuColumn[]; }
interface LinkNav { label: string; href: string; }
type NavItem = DropdownNav | LinkNav;
const isDropdown = (item: NavItem): item is DropdownNav => "columns" in item;

const DesktopSidebar = ({ onSelectConversation, onNewChat, activeConversationId }: DesktopSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [recentChats, setRecentChats] = useState<Conversation[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { loadUserInfo(); }, []);

  const loadUserInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const emailPrefix = user.email?.split("@")[0] || "User";
      setUserName(user.user_metadata?.full_name || emailPrefix);
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits, avatar_url, display_name")
        .eq("id", user.id)
        .single();
      if (profile) {
        setCredits(Number(profile.credits) || 0);
        setAvatarUrl(profile.avatar_url || user.user_metadata?.avatar_url || null);
        if (profile.display_name) setUserName(profile.display_name);
      }
      const { data: memberRows } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);
      const memberConvIds = (memberRows || []).map((r: any) => r.conversation_id);
      let cq = supabase
        .from("conversations")
        .select("id, title, updated_at, mode")
        .in("mode", ["chat", "research"]);
      if (memberConvIds.length > 0) {
        cq = cq.or(`user_id.eq.${user.id},id.in.(${memberConvIds.join(",")})`);
      } else {
        cq = cq.eq("user_id", user.id);
      }
      const { data: convos } = await cq
        .order("updated_at", { ascending: false })
        .limit(6);
      if (convos) setRecentChats(convos);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const initial = userName.charAt(0).toUpperCase() || "U";
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!pinned) setOpenDropdown(label);
  };

  const handleMouseLeave = () => {
    if (!pinned) {
      timeoutRef.current = setTimeout(() => setOpenDropdown(null), 200);
    }
  };

  const handleClick = (label: string) => {
    if (openDropdown === label && pinned) {
      setOpenDropdown(null);
      setPinned(false);
    } else {
      setOpenDropdown(label);
      setPinned(true);
    }
  };

  const closeMenu = () => {
    setOpenDropdown(null);
    setPinned(false);
  };

  /* ── Navigation items ── */
  const chatNav: DropdownNav = {
    label: "Chat",
    columns: [
      {
        title: "Chat",
        items: [
          { label: "New Chat", desc: "Start a fresh conversation", action: "new-chat" },
          ...recentChats.map((c) => ({
            label: c.title || "Untitled",
            desc: `${c.mode === "research" ? "Deep Research · " : ""}${new Date(c.updated_at).toLocaleDateString()}`,
            action: `chat:${c.id}`,
          })),
        ],
      },
    ],
  };

  const navItems: NavItem[] = [
    chatNav,
    { label: "Images", href: "/images" },
    { label: "Videos", href: "/videos" },
    { label: "Files", href: "/files" },
    { label: "Code", href: "/code" },
  ];

  // navItems already defined above

  const handleAction = (action: string) => {
    closeMenu();
    if (action === "new-chat") {
      onNewChat?.();
      navigate("/chat");
    } else if (action.startsWith("chat:")) {
      const id = action.replace("chat:", "");
      if (location.pathname === "/chat") {
        onSelectConversation?.(id);
      } else {
        navigate("/chat", { state: { loadConversationId: id } });
      }
    } else {
      navigate(action);
    }
  };

  const activeSectionFor = (label: string) => {
    switch (label) {
      case "Chat": return isActive("/chat");
      case "Images": return isActive("/images");
      case "Videos": return isActive("/videos");
      case "Files": return isActive("/files");
      case "Code": return isActive("/code");
      default: return false;
    }
  };

  return (
    <header className="hidden md:block w-full shrink-0 z-50">
      <div className="flex items-center justify-between h-16 px-6 bg-background/90 backdrop-blur-xl border-b border-border">

        {/* Logo */}
        <button
          onClick={() => { onNewChat?.(); navigate("/chat"); }}
          className="font-display text-2xl font-black uppercase tracking-tight text-foreground hover:opacity-80 transition-opacity shrink-0"
        >
          MEGSY
        </button>

        {/* Center nav */}
        <div className="flex items-center gap-1">
          {navItems.map((item) =>
            isDropdown(item) ? (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => handleMouseEnter(item.label)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => handleClick(item.label)}
                  className={`flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                    activeSectionFor(item.label)
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdown === item.label ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {openDropdown === item.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="fixed left-0 right-0 top-[64px] flex justify-center z-50 px-6 pointer-events-none"
                    >
                      <div
                        className="w-full max-w-[600px] rounded-2xl border border-white/10 bg-black/95 backdrop-blur-3xl p-6 shadow-2xl pointer-events-auto"
                        onMouseEnter={() => handleMouseEnter(item.label)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${item.columns.length}, minmax(0, 1fr))` }}>
                          {item.columns.map((col) => (
                            <div key={col.title}>
                              <h4 className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
                                {col.title}
                              </h4>
                              <div className="space-y-1">
                                {col.items.map((sub) => (
                                  <button
                                    key={sub.label + sub.action}
                                    onClick={() => handleAction(sub.action)}
                                    className="group flex flex-col w-full text-left rounded-xl px-3 py-2.5 hover:bg-white/[0.06] transition-colors"
                                  >
                                    <span className="text-[14px] font-semibold text-white/90 group-hover:text-primary transition-colors">
                                      {sub.label}
                                    </span>
                                    <span className="text-[12px] text-white/40 group-hover:text-white/60 transition-colors mt-0.5">
                                      {sub.desc}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                key={item.label}
                onClick={() => navigate(item.href)}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  activeSectionFor(item.label)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            )
          )}
        </div>

        {/* Right: Credits + Subscribe + Avatar */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Credits */}
          <button
            onClick={() => navigate("/pricing")}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors tabular-nums"
          >
            {credits.toFixed(0)} MC
          </button>

          {/* Subscribe */}
          <FancyButton onClick={() => navigate("/pricing")} className="text-sm">
            Subscribe
          </FancyButton>

          {/* User avatar dropdown */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter("__user")}
            onMouseLeave={handleMouseLeave}
          >
            <button
              onClick={() => handleClick("__user")}
              className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-border hover:ring-primary/50 transition-all"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground">
                  {initial}
                </div>
              )}
            </button>

            <AnimatePresence>
              {openDropdown === "__user" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-[48px] z-50"
                >
                  <div
                    className="w-48 rounded-2xl border border-white/10 bg-black/95 backdrop-blur-3xl p-2 shadow-2xl"
                    onMouseEnter={() => handleMouseEnter("__user")}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      onClick={() => { closeMenu(); navigate("/settings/profile"); }}
                      className="w-full text-left rounded-xl px-3 py-2.5 text-[14px] font-medium text-white/80 hover:bg-white/[0.06] hover:text-white transition-colors"
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => { closeMenu(); navigate("/settings"); }}
                      className="w-full text-left rounded-xl px-3 py-2.5 text-[14px] font-medium text-white/80 hover:bg-white/[0.06] hover:text-white transition-colors"
                    >
                      Settings
                    </button>
                    <div className="my-1 h-px bg-white/[0.08]" />
                    <button
                      onClick={() => { closeMenu(); handleLogout(); }}
                      className="w-full text-left rounded-xl px-3 py-2.5 text-[14px] font-medium text-red-400 hover:bg-white/[0.06] hover:text-red-300 transition-colors"
                    >
                      Log out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DesktopSidebar;
