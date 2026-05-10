import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, GraduationCap, Briefcase, Smile, User2 } from "lucide-react";
import { toast } from "sonner";

const PERSONAS = [
  { id: "default", label: "افتراضي", icon: User2, desc: "أسلوب متوازن لكل أنواع المحادثات" },
  { id: "friend", label: "صديق", icon: Smile, desc: "ودود، عفوي، يستخدم لهجتك" },
  { id: "teacher", label: "معلم", icon: GraduationCap, desc: "يشرح خطوة بخطوة بصبر وأمثلة" },
  { id: "expert", label: "خبير", icon: Briefcase, desc: "تقني دقيق ومنظم، بدون حشو" },
  { id: "comedian", label: "مرح", icon: Sparkles, desc: "ظريف وذكي مع لمسة فكاهة" },
];

export default function ChatSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [persona, setPersona] = useState("default");
  const [enableFollowups, setEnableFollowups] = useState(true);
  const [enablePiiRedaction, setEnablePiiRedaction] = useState(true);
  const [enableCitations, setEnableCitations] = useState(true);
  const [customInstructions, setCustomInstructions] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data } = await supabase.from("user_chat_settings" as any).select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        const d = data as any;
        setPersona(d.persona || "default");
        setEnableFollowups(d.enable_followups ?? true);
        setEnablePiiRedaction(d.enable_pii_redaction ?? true);
        setEnableCitations(d.enable_citations ?? true);
        setCustomInstructions(d.custom_instructions || "");
      }
      setLoading(false);
    })();
  }, [navigate]);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("user_chat_settings" as any).upsert({
      user_id: user.id,
      persona,
      enable_followups: enableFollowups,
      enable_pii_redaction: enablePiiRedaction,
      enable_citations: enableCitations,
      custom_instructions: customInstructions || null,
      updated_at: new Date().toISOString(),
    } as any);
    setSaving(false);
    if (error) toast.error("فشل الحفظ"); else toast.success("تم الحفظ");
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 -mr-2 hover:bg-accent rounded-lg">
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">إعدادات الشات الذكي</h1>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">شخصية الذكاء الاصطناعي</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PERSONAS.map((p) => {
              const Icon = p.icon;
              const active = persona === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPersona(p.id)}
                  className={`text-right p-3 rounded-xl border transition-colors ${active ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-medium text-sm">{p.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">المميزات الذكية</h2>
          <Toggle label="اقتراحات أسئلة المتابعة" desc="بعد كل رد، اقتراح 3 أسئلة قد تطرحها" value={enableFollowups} onChange={setEnableFollowups} />
          <Toggle label="إخفاء البيانات الحساسة" desc="حذف الإيميل/التليفون/البطاقات قبل الإرسال للموديل" value={enablePiiRedaction} onChange={setEnablePiiRedaction} />
          <Toggle label="إظهار المصادر" desc="إرفاق روابط المصادر مع الردود الواقعية" value={enableCitations} onChange={setEnableCitations} />
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">تعليمات مخصصة</h2>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="مثال: ردّ دائمًا باللهجة المصرية. اشرح المصطلحات التقنية قبل استخدامها..."
            className="w-full min-h-[120px] p-3 rounded-xl border border-border bg-background text-sm resize-y"
          />
        </section>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
        >
          {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
      </div>
    </div>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${value ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${value ? "right-0.5" : "right-[18px]"}`} />
      </button>
    </div>
  );
}
