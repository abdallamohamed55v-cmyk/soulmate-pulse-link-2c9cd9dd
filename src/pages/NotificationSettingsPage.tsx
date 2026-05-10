import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { goBackOr } from "@/lib/navigation";
import { Switch } from "@/components/ui/switch";
import AppLayout from "@/layouts/AppLayout";
import { toast } from "@/hooks/use-toast";

interface Preferences {
  app_credits: boolean;
  app_system: boolean;
  app_generation: boolean;
  app_referral: boolean;
}

const defaults: Preferences = {
  app_credits: true,
  app_system: true,
  app_generation: true,
  app_referral: true,
};

const NotificationSettingsPage = () => {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setPrefs({
        app_credits: data.app_credits,
        app_system: data.app_system,
        app_generation: data.app_generation,
        app_referral: data.app_referral,
      });
    }
    setLoading(false);
  };

  const updatePref = async (key: keyof Preferences, value: boolean) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notification_preferences")
      .upsert(
        { user_id: user.id, ...prefs, [key]: value, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: "Failed to save preferences", variant: "destructive" });
    }
  };

  const PrefRow = ({ label, desc, prefKey }: { label: string; desc: string; prefKey: keyof Preferences }) => (
    <div className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={prefs[prefKey]} onCheckedChange={(v) => updatePref(prefKey, v)} />
    </div>
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => goBackOr(navigate, "/notifications")} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-xl font-bold text-foreground">Notification Preferences</h1>
            {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">In-App Notifications</h3>
            </div>
            <div className="space-y-1">
              <PrefRow label="Credits" desc="Low balance alerts" prefKey="app_credits" />
              <PrefRow label="System" desc="Updates & maintenance" prefKey="app_system" />
              <PrefRow label="Generation" desc="Image/video generation complete" prefKey="app_generation" />
              <PrefRow label="Referrals" desc="New signups via your referral code" prefKey="app_referral" />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default NotificationSettingsPage;
