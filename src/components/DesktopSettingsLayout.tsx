import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { goBackOr } from "@/lib/navigation";
import {
  User, CreditCard, Gift, Globe, Paintbrush, Activity, Info, LogOut, ExternalLink, X, Code2, Flag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/layouts/AppLayout";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  external?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "billing", label: "Billing", icon: CreditCard, path: "/settings/billing" },
  { id: "customization", label: "Customization", icon: Paintbrush, path: "/settings/customization" },
  { id: "ai-personalization", label: "AI Personalization", icon: User, path: "/settings/ai-personalization" },
  { id: "referrals", label: "Referrals", icon: Gift, path: "/settings/referrals" },
];

const EXTRA_NAV: NavItem[] = [
  { id: "apis", label: "APIs", icon: Code2, path: "/apis" },
  { id: "egypt", label: "Egypt 🇪🇬", icon: Flag, path: "/egypt" },
];

const EXTERNAL_LINKS: NavItem[] = [
  { id: "status", label: "Status Page", icon: Activity, path: "https://status.megsyai.com", external: true },
  { id: "about", label: "About", icon: Info, path: "https://about.megsyai.com", external: true },
];

interface DesktopSettingsLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function DesktopSettingsLayout({ children, title, subtitle }: DesktopSettingsLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <AppLayout>
      <div className="h-full flex items-center justify-center bg-background/50 backdrop-blur-sm p-6">
        {/* Modal container */}
        <div className="w-full max-w-4xl max-h-[85vh] rounded-2xl border border-white/[0.08] bg-card/95 backdrop-blur-3xl shadow-[0_16px_64px_rgba(0,0,0,0.4)] overflow-hidden flex">
          
          {/* Left sidebar */}
          <div className="w-[220px] shrink-0 border-r border-border/50 flex flex-col p-5">
            <h1 className="font-display text-lg font-bold text-foreground mb-6">My Account</h1>

            <div className="flex-1 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="h-px bg-border/30 my-3" />

              {EXTRA_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="h-px bg-border/30 my-3" />

              {EXTERNAL_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => window.open(item.path, "_blank", "noopener,noreferrer")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ExternalLink className="w-3 h-3 opacity-40" />
                  </button>
                );
              })}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors mt-4"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Right content */}
          <div className="flex-1 overflow-y-auto p-6 relative">
            {/* Close button */}
            <button
              onClick={() => goBackOr(navigate, "/settings")}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {title && (
              <div className="mb-6">
                <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
                {subtitle && (
                  <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
                )}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default DesktopSettingsLayout;
