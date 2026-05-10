import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import FancyButton from "@/components/FancyButton";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* ── Mega-menu data ── */
interface SubItem { label: string; desc: string; href: string; }
interface MenuColumn { title: string; items: SubItem[]; }
interface NavDropdown {
  label: string;
  columns: MenuColumn[];
  featured?: { title: string; desc?: string; cta: string; href: string };
}
interface NavLink { label: string; href: string; external?: boolean; }
type NavItem = NavDropdown | NavLink;
const isDropdown = (item: NavItem): item is NavDropdown => "columns" in item;

const navItems: NavItem[] = [
  {
    label: "Create",
    columns: [
      {
        title: "AI Creation",
        items: [
          { label: "AI Image Generator", desc: "Create stunning visuals with Megsy Pro", href: "/services/images" },
          { label: "AI Video Generator", desc: "Generate cinematic videos instantly", href: "/services/videos" },
          { label: "AI Chat", desc: "Chat with 80+ models including Megsy Pro", href: "/services/chat" },
        ],
      },
      {
        title: "Productivity",
        items: [
          { label: "File Analysis", desc: "Upload & analyze documents with AI", href: "/services/files" },
          { label: "Code Builder", desc: "Build & deploy full-stack apps", href: "/services/code" },
        ],
      },
    ],
    featured: { title: "Powered by\nMegsy Pro", desc: "Experience our most advanced AI model today.", cta: "Try it free", href: "/auth" },
  },
  {
    label: "Products",
    columns: [
      {
        title: "Image",
        items: [
          { label: "AI Generator", desc: "Create stunning visuals", href: "/services/images" },
          { label: "Image Editor", desc: "Modify with precision", href: "/services/images" },
          { label: "Style Transfer", desc: "Apply unique styles", href: "/services/images" },
        ],
      },
      {
        title: "Video",
        items: [
          { label: "Text to Video", desc: "Generate from scratch", href: "/services/videos" },
          { label: "Image to Video", desc: "Animate your photos", href: "/services/videos" },
          { label: "Video Editor", desc: "AI-powered editing", href: "/services/videos" },
        ],
      },
      {
        title: "Editing",
        items: [
          { label: "Magic Erase", desc: "Remove unwanted objects", href: "/services/images" },
          { label: "Background", desc: "Remove or replace bg", href: "/services/images" },
          { label: "Inpainting", desc: "Fill missing areas", href: "/services/images" },
        ],
      },
      {
        title: "Upscaling",
        items: [
          { label: "Image Upscale", desc: "Enhance resolution", href: "/services/images" },
          { label: "Video Enhance", desc: "4K video upscaling", href: "/services/videos" },
          { label: "Face Restore", desc: "Fix and enhance faces", href: "/services/images" },
        ],
      },
    ],
    featured: { title: "Reach out to our team", desc: "Got a question about Megsy Pro? We're here to help.", cta: "Submit Request", href: "/contact" },
  },
  {
    label: "Learn",
    columns: [
      {
        title: "Resources",
        items: [
          { label: "Blog", desc: "Tips, tutorials and updates", href: "/blog" },
          { label: "Support", desc: "Get help from our AI assistant", href: "/support" },
          { label: "Changelog", desc: "What's new in Megsy", href: "/changelog" },
          { label: "Models", desc: "Explore Megsy AI models", href: "/models" },
        ],
      },
    ],
  },
  { label: "Pricing", href: "/#pricing" },
  { label: "Contact", href: "/contact" },
];

const LandingNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [user, setUser] = useState<{ avatarUrl: string | null; displayName: string; email: string } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const u = session.user;
        const { data: profile } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", u.id).single();
        setUser({
          avatarUrl: profile?.avatar_url || u.user_metadata?.avatar_url || null,
          displayName: profile?.display_name || u.user_metadata?.full_name || u.email?.split("@")[0] || "U",
          email: u.email || "",
        });
      } else {
        setUser(null);
      }
    });

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        supabase.from("profiles").select("display_name, avatar_url").eq("id", u.id).single().then(({ data: profile }) => {
          setUser({
            avatarUrl: profile?.avatar_url || u.user_metadata?.avatar_url || null,
            displayName: profile?.display_name || u.user_metadata?.full_name || u.email?.split("@")[0] || "U",
            email: u.email || "",
          });
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNav = (href: string) => {
    setMobileOpen(false);
    setOpenDropdown(null);
    setPinned(false);
    if (href.startsWith("http")) {
      window.open(href, "_blank");
    } else if (href.startsWith("/#")) {
      const hash = href.replace("/", "");
      if (location.pathname === "/") {
        document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate("/");
        setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" }), 300);
      }
    } else {
      navigate(href);
    }
  };

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

  const initial = user?.displayName?.charAt(0)?.toUpperCase() || "U";

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-border bg-background/90 backdrop-blur-xl" : "bg-background/55 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); navigate("/"); }}
          className="font-display text-3xl font-black uppercase tracking-tight text-foreground"
        >
          MEGSY
        </a>

        {/* ── Desktop Nav ── */}
        <div className="hidden items-center gap-1 md:flex">
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
                  className="flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
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
                      <div className="w-full max-w-[1000px] rounded-2xl border border-white/10 bg-black backdrop-blur-3xl p-8 shadow-2xl pointer-events-auto">
                        <div className="flex gap-10">
                          {item.featured && (
                            <div className="group w-[280px] shrink-0 rounded-2xl border border-white/10 flex flex-col items-start relative overflow-hidden">
                               <img 
                                 src={item.label === "Products" ? "/showcase/img-2.jpg" : "/showcase/img-1.jpg"}
                                 alt=""
                                 className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-80 transition-all duration-500"
                               />
                               <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                               <div className="relative z-10 p-6 flex flex-col h-full w-full mt-auto">
                                 <h3 className="text-xl font-bold text-white mb-2 whitespace-pre-line">{item.featured.title}</h3>
                                 {item.featured.desc && <p className="text-sm text-white/70 mb-6">{item.featured.desc}</p>}
                                 <button onClick={() => handleNav(item.featured!.href)} className="mt-auto rounded-xl bg-white/10 backdrop-blur-md text-white px-5 py-3 text-sm font-semibold hover:bg-white/20 transition-all w-full border border-white/20">
                                   {item.featured.cta}
                                 </button>
                               </div>
                            </div>
                          )}

                          <div className="flex-1 grid gap-8" style={{ gridTemplateColumns: `repeat(${item.columns.length}, minmax(0, 1fr))` }}>
                            {item.columns.map((col) => (
                              <div key={col.title}>
                                <h4 className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
                                  {col.title}
                                </h4>
                                <div className="space-y-5">
                                  {col.items.map((sub) => (
                                    <button
                                      key={sub.label}
                                      onClick={() => handleNav(sub.href)}
                                      className="group flex flex-col w-full text-left"
                                    >
                                      <span className="text-[15px] font-semibold text-white/90 group-hover:text-primary transition-colors">
                                        {sub.label}
                                      </span>
                                      <span className="text-[13px] text-white/50 group-hover:text-white/70 transition-colors mt-1">
                                        {sub.desc}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(item.href);
                }}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            )
          )}
        </div>

        {/* Auth buttons / Avatar */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <button
              onClick={() => navigate("/chat")}
              className="flex items-center gap-2.5 rounded-full border border-border px-2 py-1.5 transition-all hover:border-foreground/35"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {initial}
                </div>
              )}
              <span className="pr-2 text-sm font-medium text-foreground">{user.displayName}</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate("/auth")}
                className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-all hover:border-foreground/35"
              >
                Log in
              </button>
              <FancyButton onClick={() => navigate("/auth")} className="text-sm">
                Start Creating
              </FancyButton>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-sm font-bold uppercase tracking-wider text-foreground md:hidden">
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </div>

      {/* ── Mobile Menu ── */}
      {mobileOpen && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="max-h-[80vh] overflow-y-auto border-t border-border bg-background px-6 py-5 md:hidden">
          {navItems.map((item) =>
            isDropdown(item) ? (
              <div key={item.label}>
                <button
                  onClick={() => setMobileExpanded(mobileExpanded === item.label ? null : item.label)}
                  className="flex w-full items-center justify-between py-3 text-base font-medium text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                  <ChevronDown className={`h-4 w-4 transition-transform ${mobileExpanded === item.label ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {mobileExpanded === item.label && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-4 pb-3 pl-2">
                        {item.columns.map((col) => (
                          <div key={col.title}>
                            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/30">{col.title}</h4>
                            {col.items.map((sub) => (
                              <button
                                key={sub.label}
                                onClick={() => handleNav(sub.href)}
                                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/[0.06]"
                              >
                                <div>
                                  <span className="text-sm text-white/80">{sub.label}</span>
                                  <span className="block text-xs text-white/30">{sub.desc}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(item.href);
                }}
                className="block py-3 text-base font-medium text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </a>
            )
          )}
          <div className="mt-5 flex flex-col gap-3">
            {user ? (
              <button
                onClick={() => { setMobileOpen(false); navigate("/chat"); }}
                className="flex items-center justify-center gap-2.5 rounded-lg border border-border py-2.5"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {initial}
                  </div>
                )}
                <span className="text-sm font-medium text-foreground">Go to Dashboard</span>
              </button>
            ) : (
              <>
                <button onClick={() => navigate("/auth")} className="rounded-lg border border-border py-2.5 text-sm font-medium text-foreground">
                  Log in
                </button>
                <FancyButton onClick={() => navigate("/auth")}>Start Creating</FancyButton>
              </>
            )}
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default LandingNavbar;
