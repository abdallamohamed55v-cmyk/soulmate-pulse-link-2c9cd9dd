import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Sparkles, User, Briefcase, MessageSquare, Wand2, Trash2, Plus, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const iosSpring = { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.7 };

const INTEREST_OPTIONS = [
  "تكنولوجيا", "تصميم", "أعمال", "تعلم", "برمجة", "كتابة",
  "تسويق", "تصوير", "سفر", "رياضة", "موسيقى", "طبخ",
  "صحة", "مال", "فن", "ألعاب",
];

const LANGUAGE_STYLES = [
  { id: "mixed", label: "تلقائي حسب لغتي" },
  { id: "egyptian", label: "عامية مصرية" },
  { id: "formal_arabic", label: "عربية فصحى" },
  { id: "english", label: "English" },
];

type Tier = "lite" | "pro" | "max";

export default function AIPersonalizationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");

  // Identity
  const [callName, setCallName] = useState("");
  const [profession, setProfession] = useState("");
  const [about, setAbout] = useState("");

  // Tone sliders
  const [toneFormality, setToneFormality] = useState(50);
  const [toneVerbosity, setToneVerbosity] = useState(50);
  const [toneCreativity, setToneCreativity] = useState(50);

  // Style + interests
  const [languageStyle, setLanguageStyle] = useState("mixed");
  const [interests, setInterests] = useState<string[]>([]);
  const [aiTraits, setAiTraits] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");

  // Tier
  const [preferredTier, setPreferredTier] = useState<Tier>("lite");

  // Memories
  const [memories, setMemories] = useState<Array<{ id: string; fact: string; importance: number }>>([]);
  const [newMemory, setNewMemory] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate({ to: "/login" } as any); return; }
      setUserId(user.id);

      const [profileRes, persRes, memRes] = await Promise.all([
        supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
        supabase.from("ai_personalization").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_memories").select("id, fact, importance").eq("user_id", user.id).order("importance", { ascending: false }).limit(20),
      ]);

      setUserPlan((profileRes.data as any)?.plan || "free");

      if (persRes.data) {
        const d: any = persRes.data;
        setCallName(d.call_name || "");
        setProfession(d.profession || "");
        setAbout(d.about || "");
        setAiTraits(d.ai_traits || "");
        setCustomInstructions(d.custom_instructions || "");
        setToneFormality(d.tone_formality ?? 50);
        setToneVerbosity(d.tone_verbosity ?? 50);
        setToneCreativity(d.tone_creativity ?? 50);
        setLanguageStyle(d.language_style || "mixed");
        setInterests(Array.isArray(d.interests) ? d.interests : []);
        setPreferredTier((d.preferred_tier as Tier) || "lite");
      }

      if (memRes.data) setMemories(memRes.data as any);
      setLoading(false);
    })();
  }, [navigate]);

  const isPaid = userPlan !== "free" && userPlan !== "trial";

  const save = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    const payload: any = {
      user_id: userId,
      call_name: callName.trim() || null,
      profession: profession.trim() || null,
      about: about.trim() || null,
      ai_traits: aiTraits.trim() || null,
      custom_instructions: customInstructions.trim() || null,
      tone_formality: toneFormality,
      tone_verbosity: toneVerbosity,
      tone_creativity: toneCreativity,
      language_style: languageStyle,
      interests,
      preferred_tier: preferredTier,
    };
    const { error } = await supabase.from("ai_personalization").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) { toast.error("فشل الحفظ"); return; }
    localStorage.setItem("megsy_tier", preferredTier);
    toast.success("تم حفظ التخصيص ✨");
  }, [userId, callName, profession, about, aiTraits, customInstructions, toneFormality, toneVerbosity, toneCreativity, languageStyle, interests, preferredTier]);

  const toggleInterest = (i: string) => {
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const addMemory = async () => {
    if (!newMemory.trim() || !userId) return;
    const { data, error } = await supabase.from("user_memories").insert({ user_id: userId, fact: newMemory.trim(), importance: 7, source: "manual" } as any).select("id, fact, importance").single();
    if (error) { toast.error("فشل إضافة الذكرى"); return; }
    setMemories(prev => [data as any, ...prev]);
    setNewMemory("");
    toast.success("تمت الإضافة");
  };

  const deleteMemory = async (id: string) => {
    const { error } = await supabase.from("user_memories").delete().eq("id", id);
    if (error) { toast.error("فشل الحذف"); return; }
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">جارٍ التحميل…</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-32" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-foreground/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <button onClick={() => navigate({ to: "/" } as any)} className="p-2 -mr-2 rounded-full hover:bg-foreground/5 transition-colors">
            <ArrowLeft className="w-5 h-5 rotate-180" />
          </button>
          <div className="flex-1">
            <h1 className="text-[17px] font-semibold">تخصيص Megsy</h1>
            <p className="text-[11.5px] text-muted-foreground">خلّي Megsy يفهمك أكتر ويتحدث بأسلوبك</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={iosSpring}
          className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold">Megsy v1</h2>
              <p className="text-[12px] text-muted-foreground">نموذج هجين متكيف من Megsy AI</p>
            </div>
          </div>
        </motion.div>

        {/* Tier picker */}
        <Section title="نموذج Megsy المفضل" icon={<Wand2 className="w-4 h-4" />}>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: "lite" as Tier, label: "Lite", desc: "سريع ومجاني", locked: false },
              { id: "pro" as Tier, label: "Pro", desc: "ذكي وأقوى", locked: !isPaid },
              { id: "max" as Tier, label: "Max", desc: "1T+ بارامترات", locked: !isPaid },
            ]).map(t => (
              <button
                key={t.id}
                onClick={() => {
                  if (t.locked) { toast.info(`Megsy ${t.label} للخطط المدفوعة`); return; }
                  setPreferredTier(t.id);
                }}
                className={`relative p-3 rounded-2xl text-center transition-all ${preferredTier === t.id ? "bg-primary text-primary-foreground shadow-lg" : "bg-foreground/[0.04] hover:bg-foreground/[0.08]"}`}
              >
                {t.locked && <Lock className="absolute top-2 right-2 w-3 h-3 opacity-60" />}
                <div className="text-[14px] font-semibold">{t.label}</div>
                <div className="text-[10.5px] opacity-75 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </Section>

        {/* Identity */}
        <Section title="هويتك" icon={<User className="w-4 h-4" />}>
          <Field label="ايه الاسم اللي تحب أناديك بيه؟">
            <input value={callName} onChange={e => setCallName(e.target.value)} placeholder="مثلاً: حمزة" className={fieldClass} />
          </Field>
          <Field label="مهنتك أو مجالك">
            <input value={profession} onChange={e => setProfession(e.target.value)} placeholder="مطور، مصمم، طالب…" className={fieldClass} />
          </Field>
          <Field label="نبذة عنك">
            <textarea value={about} onChange={e => setAbout(e.target.value)} rows={3} placeholder="اهتماماتك، أهدافك، أي حاجة تساعدني أفهمك…" className={`${fieldClass} resize-none`} />
          </Field>
        </Section>

        {/* Tone sliders */}
        <Section title="نبرة الردود" icon={<MessageSquare className="w-4 h-4" />}>
          <Slider label="رسمي ↔ ودود" leftLabel="رسمي" rightLabel="ودود" value={toneFormality} onChange={setToneFormality} invert />
          <Slider label="مختصر ↔ مفصّل" leftLabel="مختصر" rightLabel="مفصّل" value={toneVerbosity} onChange={setToneVerbosity} />
          <Slider label="محافظ ↔ مبدع" leftLabel="محافظ" rightLabel="مبدع" value={toneCreativity} onChange={setToneCreativity} />
        </Section>

        {/* Language style */}
        <Section title="أسلوب اللغة">
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGE_STYLES.map(s => (
              <button key={s.id} onClick={() => setLanguageStyle(s.id)}
                className={`px-3 py-2.5 rounded-2xl text-[13px] transition-colors ${languageStyle === s.id ? "bg-primary text-primary-foreground" : "bg-foreground/[0.04] hover:bg-foreground/[0.08]"}`}>
                {s.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Interests */}
        <Section title="اهتماماتك">
          <div className="flex flex-wrap gap-1.5">
            {INTEREST_OPTIONS.map(i => (
              <button key={i} onClick={() => toggleInterest(i)}
                className={`px-3 py-1.5 rounded-full text-[12px] transition-colors ${interests.includes(i) ? "bg-primary text-primary-foreground" : "bg-foreground/[0.05] hover:bg-foreground/[0.1] text-foreground/80"}`}>
                {i}
              </button>
            ))}
          </div>
        </Section>

        {/* Memories */}
        <Section title="ذكريات Megsy عنك" icon={<Sparkles className="w-4 h-4" />}>
          <div className="flex gap-2">
            <input value={newMemory} onChange={e => setNewMemory(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addMemory(); }}
              placeholder="أضف حقيقة عنك (مثلاً: بحب القهوة سادة)" className={fieldClass} />
            <button onClick={addMemory} className="shrink-0 px-3 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {memories.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {memories.map(m => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-foreground/[0.03] border border-foreground/5">
                  <span className="flex-1 text-[12.5px] text-foreground/85">{m.fact}</span>
                  <button onClick={() => deleteMemory(m.id)} className="p-1 rounded-full hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {memories.length === 0 && <p className="text-[11.5px] text-muted-foreground mt-2">مفيش ذكريات لسه. Megsy هيتعلم عنك تلقائي مع الوقت، أو أضف حاجة يدوي.</p>}
        </Section>

        {/* Custom instructions */}
        <Section title="تعليمات مخصصة" icon={<Briefcase className="w-4 h-4" />}>
          <Field label="سمات شخصية إضافية لـ Megsy">
            <input value={aiTraits} onChange={e => setAiTraits(e.target.value)} placeholder="مثلاً: مرح، مباشر، يستخدم أمثلة عملية" className={fieldClass} />
          </Field>
          <Field label="أي تعليمات مخصصة">
            <textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} rows={4} placeholder="مثلاً: دايماً اذكر مصادر، تجنب الإيموجي، استخدم أمثلة من سياق مصري…" className={`${fieldClass} resize-none`} />
          </Field>
        </Section>
      </div>

      {/* Sticky save */}
      <div className="fixed bottom-0 inset-x-0 z-40 backdrop-blur-xl bg-background/85 border-t border-foreground/5 p-4">
        <div className="max-w-2xl mx-auto">
          <button onClick={save} disabled={saving}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity">
            <Save className="w-4 h-4" />
            {saving ? "جارٍ الحفظ…" : "حفظ التخصيص"}
          </button>
        </div>
      </div>
    </div>
  );
}

const fieldClass = "w-full px-3.5 py-2.5 rounded-2xl bg-foreground/[0.04] border border-foreground/5 text-[13.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:bg-foreground/[0.06] focus:border-primary/30 transition-colors";

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={iosSpring}
      className="rounded-3xl p-4 bg-foreground/[0.02] border border-foreground/5">
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-foreground/60">{icon}</span>}
        <h3 className="text-[13px] font-semibold text-foreground/85">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </motion.section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function Slider({ label, leftLabel, rightLabel, value, onChange, invert }: { label: string; leftLabel: string; rightLabel: string; value: number; onChange: (v: number) => void; invert?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
        <span>{label}</span>
        <span className="text-foreground/60">{value}%</span>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-primary" style={{ direction: invert ? "rtl" : "ltr" }} />
      <div className="flex justify-between text-[10px] text-muted-foreground/70 mt-0.5 px-0.5">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}
