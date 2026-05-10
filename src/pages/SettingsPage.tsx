import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, ChevronRight, Globe2, Brush, Cable, UserRound, CreditCard,
  Gift, SquareCode, Radio, CircleHelp, LogOut, Crown, Bell, Brain, Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { DesktopSettingsLayout } from "@/components/DesktopSettingsLayout";
import { DesktopSettingsHome } from "@/components/DesktopSettingsHome";
import FancyButton from "@/components/FancyButton";

const SettingsPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("user@email.com");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [plan, setPlan] = useState("free");
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "User");
      setUserEmail(user.email || "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, plan, credits")
        .eq("id", user.id)
        .single();
      if (profile && !cancelled) {
        if (profile.display_name) setUserName(profile.display_name);
        setAvatarUrl(profile.avatar_url || user.user_metadata?.avatar_url || null);
        setPlan(profile.plan || "free");
        setCredits(Number(profile.credits) || 0);
      }
    };
    loadUser();
    return () => { cancelled = true; };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!isMobile) {
    // Redirect to billing on desktop (no more overview)
    navigate("/settings/billing", { replace: true });
    return null;
  }

  const initial = userName.charAt(0).toUpperCase();
  const isPremium = plan !== "free";

  const quickActions = [
    { icon: Brush, label: "Theme", desc: "Colors & style", path: "/settings/customization" },
    { icon: CreditCard, label: "Billing", desc: "MC & payments", path: "/settings/billing" },
    { icon: Cable, label: "Connect", desc: "Integrations", path: "/settings/integrations" },
  ];

  const aiPersonalizationItem = { icon: Brush, label: "AI Personalization", desc: "Customize AI behavior", path: "/settings/ai-personalization" };

  const menuItems = [
    { icon: UserRound, label: "Account", desc: "Profile & security", path: "/settings/profile" },
    { icon: CreditCard, label: "Billing", desc: "MC & payments", path: "/settings/billing" },
    { icon: Brush, label: "AI Personalization", desc: "Customize AI behavior", path: "/settings/ai-personalization" },
    { icon: Brain, label: "Memory", desc: "AI memory & data", path: "/settings/memory" },
    { icon: Sparkles, label: "Skills", desc: "Custom & library skills", path: "/settings/skills" },
    { icon: Globe2, label: "Language", desc: "Auto-translate UI", path: "/settings/language" },
    { icon: Bell, label: "Notifications", desc: "Alerts & email prefs", path: "/settings/notifications" },
    { icon: SquareCode, label: "APIs", desc: "Developer access", path: "https://api.megsyai.com", external: true },
  ];

  const supportItems = [
    { icon: Radio, label: "System Status", path: "https://status.megsyai.com", external: true },
    { icon: CircleHelp, label: "About Megsy", path: "/about" },
  ];

  return (
    <div className="h-[100dvh] bg-background overflow-y-auto">
      <div className="max-w-lg mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate("/")} className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-base font-bold text-foreground">Settings</h1>
          <div className="w-9" />
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="px-4">
          {/* Profile Card */}
          <button
            onClick={() => navigate("/settings/profile")}
            className="w-full rounded-2xl p-4 mb-6 text-left transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))" }}
          >
            <div className="flex items-center gap-3.5">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-14 h-14 rounded-2xl object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                  {initial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-base font-semibold text-foreground truncate">{userName}</p>
                  {isPremium && <Crown className="w-3.5 h-3.5 text-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {Math.floor(credits)} MC
                  </span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider capitalize">
                    {plan} plan
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            </div>
          </button>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-3 gap-2.5 mb-8">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => navigate(action.path)}
                  className="flex flex-col items-center gap-2 py-4 rounded-2xl hover:bg-muted/40 transition-all active:scale-95"
                >
                  <Icon className="w-6 h-6 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-xs font-medium text-foreground">{action.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{action.desc}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Referral Fancy Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="mb-3 flex justify-center"
          >
            <button onClick={() => navigate("/settings/referrals")} className="fancy-btn fancy-btn-green w-full">
              <span className="fold" />
              <div className="points_wrapper">
                {Array.from({ length: 8 }).map((_, j) => <span key={j} className="point" />)}
              </div>
              <span className="inner">
                <Gift className="w-4 h-4" />
                Referrals — Earn 20%
              </span>
            </button>
          </motion.div>

          {/* Upgrade Banner — uses FancyButton */}
          {!isPremium && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-8 flex justify-center"
            >
              <FancyButton onClick={() => navigate("/pricing")} className="w-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
                Upgrade to Premium
              </FancyButton>
            </motion.div>
          )}

          {/* Menu Items */}
          <div className="mb-6">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2 px-1">Account & Billing</p>
            {menuItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.04 }}
                  onClick={() => (item as any).external ? window.open(item.path, "_blank") : navigate(item.path)}
                  className="w-full flex items-center gap-3 py-3.5 px-1 text-left hover:bg-muted/30 transition-colors"
                >
                  <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                </motion.button>
              );
            })}
          </div>

          {/* Support */}
          <div className="mb-6">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2 px-1">Support</p>
            {supportItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => (item as any).external ? window.open(item.path, "_blank") : navigate(item.path)}
                  className="w-full flex items-center gap-3 py-3 px-1 text-left hover:bg-muted/30 transition-colors"
                >
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <span className="flex-1 text-sm text-foreground">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                </button>
              );
            })}
          </div>

          {/* Sign Out */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors mb-4"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          <p className="text-center text-[10px] text-muted-foreground/50 mb-4">Megsy AI v1.0</p>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
