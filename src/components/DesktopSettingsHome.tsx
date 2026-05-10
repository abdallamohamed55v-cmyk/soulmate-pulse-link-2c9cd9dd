import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import { Check } from "lucide-react";
import FancyButton from "@/components/FancyButton";

export function DesktopSettingsHome() {
  const navigate = useNavigate();
  const { credits } = useCredits();
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [plan, setPlan] = useState("free");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || "");
      setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "User");
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, plan")
        .eq("id", user.id)
        .single();
      if (profile) {
        if (profile.display_name) setUserName(profile.display_name);
        setPlan(profile.plan || "free");
      }
    };
    load();
  }, []);

  const isPremium = plan !== "free";

  const freeFeatures = [
    "Generate AI content for free",
    "Access to all AI models",
    "Save and organize your creations",
  ];

  return (
    <div className="max-w-xl space-y-8">
      {/* Overview section */}
      <div>
        <h3 className="text-base font-bold text-foreground mb-4">Overview</h3>
        <div className="flex items-start gap-8">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Full name</p>
            <p className="text-sm font-medium text-foreground">{userName}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Email</p>
            <p className="text-sm font-medium text-foreground">{userEmail}</p>
          </div>
          <div className="border-l border-border/50 pl-8">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Password</p>
            <p className="text-sm text-muted-foreground">
              To change your password,{" "}
              <button onClick={() => navigate("/settings/profile")} className="text-primary hover:underline">
                request a reset email
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* MC Balance */}
      <div>
        <h3 className="text-base font-bold text-foreground mb-4">MC Balance</h3>
        <div className="rounded-xl border border-border/50 p-5 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {credits !== null ? credits.toFixed(2) : "..."} MC
            </p>
            <p className="text-xs text-muted-foreground mt-1">Available credits</p>
          </div>
          <button
            onClick={() => navigate("/pricing")}
            className="text-sm font-medium text-primary hover:underline"
          >
            Add Credits
          </button>
        </div>
      </div>

      {/* Subscription */}
      <div>
        <h3 className="text-base font-bold text-foreground mb-4">My subscription</h3>
        <div className="rounded-xl border border-border/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg font-bold text-foreground">
              {isPremium ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Free Trial"}
            </p>
            {!isPremium && (
              <FancyButton onClick={() => navigate("/pricing")} className="text-sm">
                Subscribe Now
              </FancyButton>
            )}
          </div>
          <div className="border-t border-border/30 pt-4 space-y-3">
            {freeFeatures.map((feature) => (
              <div key={feature} className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DesktopSettingsHome;
