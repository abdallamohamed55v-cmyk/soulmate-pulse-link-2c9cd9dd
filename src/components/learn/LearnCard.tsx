import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Sparkles, ChevronRight, Send } from "lucide-react";
import mermaid from "mermaid";
import type { LearnCardData } from "@/lib/learnCardParser";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "inherit",
});

interface BaseProps {
  card: LearnCardData;
  onAnswer?: (text: string) => void;
}

/* ───────────────────── shared bits ───────────────────── */

const CardShell = ({
  children,
  tone = "emerald",
  label,
}: {
  children: React.ReactNode;
  tone?: "emerald" | "blue" | "amber" | "rose" | "violet";
  label?: string;
}) => {
  const tones: Record<string, string> = {
    emerald: "border-emerald-400/30 bg-emerald-500/[0.04]",
    blue: "border-blue-400/30 bg-blue-500/[0.04]",
    amber: "border-amber-400/30 bg-amber-500/[0.04]",
    rose: "border-rose-400/30 bg-rose-500/[0.04]",
    violet: "border-violet-400/30 bg-violet-500/[0.04]",
  };
  const labelTones: Record<string, string> = {
    emerald: "text-emerald-300",
    blue: "text-blue-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
    violet: "text-violet-300",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${tones[tone]} backdrop-blur-sm p-4 space-y-3`}
    >
      {label && (
        <div className={`text-[10px] font-semibold uppercase tracking-wider ${labelTones[tone]}`}>
          {label}
        </div>
      )}
      {children}
    </motion.div>
  );
};

const TeacherNoteInput = ({ onSend }: { onSend: (text: string) => void }) => {
  const [val, setVal] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        💬 عايز تقول للمعلم حاجة؟
      </button>
    );
  }
  return (
    <div className="flex gap-1.5">
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && val.trim()) {
            onSend(val.trim());
            setVal("");
            setOpen(false);
          }
        }}
        placeholder="اكتب ملاحظتك للمعلم..."
        className="flex-1 px-3 py-1.5 rounded-lg border border-border/50 bg-background/60 text-xs text-foreground outline-none focus:border-emerald-400/50"
      />
      <button
        onClick={() => {
          if (val.trim()) {
            onSend(val.trim());
            setVal("");
            setOpen(false);
          }
        }}
        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
      >
        <Send className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/* ───────────────────── MCQ ───────────────────── */

const MCQCard = ({ card, onAnswer }: BaseProps) => {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = card.correct as number;
  const isRight = picked === correct;

  return (
    <CardShell tone="emerald" label="سؤال — اختر الإجابة">
      <p className="text-sm font-medium text-foreground">{card.question}</p>
      <div className="space-y-1.5">
        {(card.options || []).map((opt: string, i: number) => {
          const isPicked = picked === i;
          const isAnswerRevealed = picked !== null;
          const isCorrectOpt = i === correct;
          let cls = "border-border/50 bg-background/60 hover:border-emerald-400/40";
          if (isAnswerRevealed) {
            if (isCorrectOpt) cls = "border-emerald-400/70 bg-emerald-500/15 text-emerald-100";
            else if (isPicked) cls = "border-rose-400/60 bg-rose-500/15 text-rose-100";
            else cls = "border-border/30 bg-background/40 opacity-60";
          }
          return (
            <button
              key={i}
              disabled={picked !== null}
              onClick={() => setPicked(i)}
              className={`w-full text-right px-4 py-2.5 rounded-xl border text-sm transition-all flex items-center justify-between ${cls}`}
            >
              <span className="flex-1">{opt}</span>
              {isAnswerRevealed && isCorrectOpt && <Check className="w-4 h-4 text-emerald-400" />}
              {isAnswerRevealed && isPicked && !isCorrectOpt && <X className="w-4 h-4 text-rose-400" />}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          <div className={`text-xs ${isRight ? "text-emerald-300" : "text-rose-300"}`}>
            {isRight ? "✅ إجابة صحيحة!" : "❌ غلط — جرب تاني"}
          </div>
          {card.explain && (
            <div className="text-xs text-muted-foreground leading-relaxed border-r-2 border-emerald-400/40 pr-3">
              {card.explain}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              onClick={() => onAnswer?.(isRight ? "جاوبت صح، كمل وادي سؤال أصعب" : "جاوبت غلط، فهمني تاني وبسّط أكتر")}
              className="text-[11px] px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
            >
              {isRight ? "كمل أصعب →" : "فهمني تاني"}
            </button>
            <TeacherNoteInput onSend={(t) => onAnswer?.(t)} />
          </div>
        </motion.div>
      )}
    </CardShell>
  );
};

/* ───────────────────── Multi-select ───────────────────── */

const MultiCard = ({ card, onAnswer }: BaseProps) => {
  const [picks, setPicks] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const correctSet = new Set<number>(card.correct || []);
  const allRight = submitted && picks.length === correctSet.size && picks.every((p) => correctSet.has(p));

  const toggle = (i: number) => {
    if (submitted) return;
    setPicks((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  };

  return (
    <CardShell tone="emerald" label="اختر كل الإجابات الصحيحة">
      <p className="text-sm font-medium text-foreground">{card.question}</p>
      <div className="space-y-1.5">
        {(card.options || []).map((opt: string, i: number) => {
          const isPicked = picks.includes(i);
          const isCorrect = correctSet.has(i);
          let cls = "border-border/50 bg-background/60";
          if (submitted) {
            if (isCorrect) cls = "border-emerald-400/70 bg-emerald-500/15";
            else if (isPicked) cls = "border-rose-400/60 bg-rose-500/15";
          } else if (isPicked) cls = "border-emerald-400/60 bg-emerald-500/10";
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              disabled={submitted}
              className={`w-full text-right px-4 py-2.5 rounded-xl border text-sm transition-all ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {!submitted ? (
        <button
          disabled={picks.length === 0}
          onClick={() => setSubmitted(true)}
          className="w-full py-2 rounded-xl bg-emerald-500/20 text-emerald-200 text-sm font-medium hover:bg-emerald-500/30 disabled:opacity-40"
        >
          تأكيد
        </button>
      ) : (
        <div className="space-y-2">
          <div className={`text-xs ${allRight ? "text-emerald-300" : "text-rose-300"}`}>
            {allRight ? "✅ كل الإجابات صح" : "❌ مش كله صح"}
          </div>
          {card.explain && <div className="text-xs text-muted-foreground border-r-2 border-emerald-400/40 pr-3">{card.explain}</div>}
          <TeacherNoteInput onSend={(t) => onAnswer?.(t)} />
        </div>
      )}
    </CardShell>
  );
};

/* ───────────────────── True / False ───────────────────── */

const TrueFalseCard = ({ card, onAnswer }: BaseProps) => {
  const [picked, setPicked] = useState<boolean | null>(null);
  const isRight = picked === card.correct;
  return (
    <CardShell tone="emerald" label="صح أم خطأ">
      <p className="text-sm font-medium text-foreground">{card.question}</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "✅ صح", val: true },
          { label: "❌ خطأ", val: false },
        ].map((b) => {
          const sel = picked === b.val;
          const reveal = picked !== null;
          const correct = card.correct === b.val;
          let cls = "border-border/50 bg-background/60 hover:border-emerald-400/40";
          if (reveal) {
            if (correct) cls = "border-emerald-400/70 bg-emerald-500/15";
            else if (sel) cls = "border-rose-400/60 bg-rose-500/15";
          }
          return (
            <button
              key={b.label}
              disabled={picked !== null}
              onClick={() => setPicked(b.val)}
              className={`py-3 rounded-xl border text-sm font-medium ${cls}`}
            >
              {b.label}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="space-y-2">
          <div className={`text-xs ${isRight ? "text-emerald-300" : "text-rose-300"}`}>
            {isRight ? "✅ صح!" : "❌ غلط"}
          </div>
          {card.explain && <div className="text-xs text-muted-foreground border-r-2 border-emerald-400/40 pr-3">{card.explain}</div>}
          <TeacherNoteInput onSend={(t) => onAnswer?.(t)} />
        </div>
      )}
    </CardShell>
  );
};

/* ───────────────────── Explain (free text) ───────────────────── */

const ExplainCard = ({ card, onAnswer }: BaseProps) => {
  const [val, setVal] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <CardShell tone="blue" label="علل / فسر بكلامك">
      <p className="text-sm font-medium text-foreground">{card.question}</p>
      {!sent ? (
        <>
          <textarea
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="اكتب إجابتك..."
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background/60 text-sm outline-none focus:border-blue-400/50 resize-none"
          />
          <button
            disabled={!val.trim()}
            onClick={() => {
              setSent(true);
              onAnswer?.(`إجابتي: ${val.trim()}\n\n(صحح ليا الإجابة وقولي فين الصح وفين الغلط)`);
            }}
            className="w-full py-2 rounded-xl bg-blue-500/20 text-blue-200 text-sm font-medium hover:bg-blue-500/30 disabled:opacity-40"
          >
            إرسال للتصحيح
          </button>
        </>
      ) : (
        <div className="text-xs text-muted-foreground">تم الإرسال للمعلم للتصحيح ✓</div>
      )}
    </CardShell>
  );
};

/* ───────────────────── Fill in the blank ───────────────────── */

const FillCard = ({ card, onAnswer }: BaseProps) => {
  const [val, setVal] = useState("");
  const [sent, setSent] = useState(false);
  const isRight = sent && val.trim().toLowerCase() === String(card.answer || "").trim().toLowerCase();
  return (
    <CardShell tone="emerald" label="املأ الفراغ">
      <p className="text-sm font-medium text-foreground whitespace-pre-wrap">{card.question}</p>
      <div className="flex gap-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={sent}
          placeholder={card.placeholder || "إجابتك..."}
          className="flex-1 px-3 py-2 rounded-xl border border-border/50 bg-background/60 text-sm outline-none focus:border-emerald-400/50"
        />
        {!sent && (
          <button
            disabled={!val.trim()}
            onClick={() => setSent(true)}
            className="px-4 rounded-xl bg-emerald-500/20 text-emerald-200 text-sm font-medium hover:bg-emerald-500/30 disabled:opacity-40"
          >
            تأكيد
          </button>
        )}
      </div>
      {sent && (
        <div className="space-y-1.5">
          <div className={`text-xs ${isRight ? "text-emerald-300" : "text-rose-300"}`}>
            {isRight ? `✅ صح! الإجابة: ${card.answer}` : `❌ الإجابة الصحيحة: ${card.answer}`}
          </div>
          {card.explain && <div className="text-xs text-muted-foreground">{card.explain}</div>}
        </div>
      )}
    </CardShell>
  );
};

/* ───────────────────── Match (column A → B) ───────────────────── */

const MatchCard = ({ card, onAnswer }: BaseProps) => {
  // pairs: [{a:"...", b:"..."}, ...]
  const pairs = card.pairs || [];
  const [shuffledB] = useState<string[]>(() => {
    const arr = pairs.map((p: any) => p.b);
    return arr.sort(() => Math.random() - 0.5);
  });
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [done, setDone] = useState(false);

  return (
    <CardShell tone="violet" label="صل العمود A بالعمود B">
      <div className="space-y-2">
        {pairs.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="flex-1 px-3 py-2 rounded-lg bg-background/60 border border-border/40 text-sm">{p.a}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <select
              disabled={done}
              value={picks[i] || ""}
              onChange={(e) => setPicks({ ...picks, [i]: e.target.value })}
              className="flex-1 px-3 py-2 rounded-lg bg-background/60 border border-border/40 text-sm outline-none"
            >
              <option value="">اختر...</option>
              {shuffledB.map((b: string, j: number) => (
                <option key={j} value={b}>{b}</option>
              ))}
            </select>
            {done && (
              picks[i] === p.b
                ? <Check className="w-4 h-4 text-emerald-400" />
                : <X className="w-4 h-4 text-rose-400" />
            )}
          </div>
        ))}
      </div>
      {!done ? (
        <button
          disabled={Object.keys(picks).length !== pairs.length}
          onClick={() => setDone(true)}
          className="w-full py-2 rounded-xl bg-violet-500/20 text-violet-200 text-sm font-medium hover:bg-violet-500/30 disabled:opacity-40"
        >
          تأكيد
        </button>
      ) : (
        <TeacherNoteInput onSend={(t) => onAnswer?.(t)} />
      )}
    </CardShell>
  );
};

/* ───────────────────── Check-in ───────────────────── */

const CheckinCard = ({ card, onAnswer }: BaseProps) => {
  const opts = card.options || ["نكمل ✅", "بطّأ شوية 🐢", "مثال تاني 🔁", "خد بريك ☕"];
  return (
    <CardShell tone="amber" label="هل ما زلت معايا؟">
      <p className="text-sm font-medium text-foreground">{card.question || "إيه رأيك؟ نكمل ولا فيه حاجة محتاج توضيح؟"}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {opts.map((o: string, i: number) => (
          <button
            key={i}
            onClick={() => onAnswer?.(o)}
            className="px-3 py-2 rounded-xl bg-background/60 border border-border/40 text-xs hover:border-amber-400/50 hover:bg-amber-500/10 transition-colors"
          >
            {o}
          </button>
        ))}
      </div>
      <TeacherNoteInput onSend={(t) => onAnswer?.(t)} />
    </CardShell>
  );
};

/* ───────────────────── Mermaid diagram ───────────────────── */

const MermaidCard = ({ card }: BaseProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const id = useRef(`m-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    let cancelled = false;
    const code = String(card.code || "").trim();
    if (!code || !ref.current) return;
    mermaid
      .render(id.current, code)
      .then(({ svg }) => {
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      })
      .catch((e) => {
        if (!cancelled) setErr(String(e?.message || e));
      });
    return () => { cancelled = true; };
  }, [card.code]);

  return (
    <CardShell tone="violet" label="📊 شرح بصري">
      {card.title && <p className="text-sm font-medium text-foreground">{card.title}</p>}
      <div ref={ref} className="overflow-x-auto rounded-lg bg-background/40 p-2 [&_svg]:max-w-full [&_svg]:h-auto" />
      {err && <div className="text-xs text-rose-300">تعذّر رسم الشكل: {err}</div>}
    </CardShell>
  );
};

/* ───────────────────── Roadmap ───────────────────── */

const RoadmapCard = ({ card, onAnswer }: BaseProps) => {
  const stages = card.stages || [];
  return (
    <CardShell tone="blue" label="🗺️ خريطة التعلم">
      {card.title && <p className="text-sm font-semibold text-foreground">{card.title}</p>}
      <div className="space-y-2">
        {stages.map((s: any, i: number) => (
          <div key={i} className="rounded-xl border border-border/40 bg-background/60 p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-sm font-medium text-foreground">{s.title}</span>
            </div>
            {s.description && <p className="text-xs text-muted-foreground pr-8">{s.description}</p>}
            {s.resources && s.resources.length > 0 && (
              <div className="flex flex-wrap gap-1 pr-8">
                {s.resources.map((r: string, k: number) => (
                  <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300">
                    {r}
                  </span>
                ))}
              </div>
            )}
            {s.project && (
              <div className="pr-8 text-[11px] text-emerald-300">🛠️ مشروع: {s.project}</div>
            )}
            <button
              onClick={() => onAnswer?.(`ابدأ معايا في المرحلة: ${s.title}`)}
              className="text-[11px] text-blue-300 hover:text-blue-200 mr-8"
            >
              ابدأ هذه المرحلة →
            </button>
          </div>
        ))}
      </div>
    </CardShell>
  );
};

/* ───────────────────── Exam setup ───────────────────── */

const ExamSetupCard = ({ card, onAnswer }: BaseProps) => {
  const [topic, setTopic] = useState(card.suggestedTopic || "");
  const [count, setCount] = useState(10);
  const [duration, setDuration] = useState(15);
  const [difficulty, setDifficulty] = useState("متوسط");
  const [types, setTypes] = useState<string[]>(["اختيار من متعدد"]);

  const allTypes = ["اختيار من متعدد", "صح/خطأ", "املأ الفراغ", "علل/فسر"];

  const toggleType = (t: string) =>
    setTypes((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const submit = () => {
    onAnswer?.(
      `جهّزلي امتحان:\n- الموضوع: ${topic}\n- عدد الأسئلة: ${count}\n- المدة: ${duration} دقيقة\n- الصعوبة: ${difficulty}\n- أنواع الأسئلة: ${types.join("، ")}\n\nابدأ الامتحان مباشرة في رد واحد كـ exam_runner.`
    );
  };

  return (
    <CardShell tone="rose" label="📝 إعداد امتحان">
      <div className="space-y-2">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="الموضوع (مثلاً: الجبر، تاريخ مصر القديم)"
          className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background/60 text-sm outline-none focus:border-rose-400/50"
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground space-y-1">
            عدد الأسئلة
            <input
              type="number" min={3} max={30} value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 10)}
              className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background/60 text-sm outline-none"
            />
          </label>
          <label className="text-xs text-muted-foreground space-y-1">
            المدة (دقيقة)
            <input
              type="number" min={1} max={120} value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 15)}
              className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background/60 text-sm outline-none"
            />
          </label>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">الصعوبة</div>
          <div className="flex gap-1.5">
            {["سهل", "متوسط", "صعب"].map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-1.5 rounded-lg text-xs ${
                  difficulty === d ? "bg-rose-500/25 text-rose-200" : "bg-background/60 border border-border/40 text-muted-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">أنواع الأسئلة</div>
          <div className="flex flex-wrap gap-1.5">
            {allTypes.map((t) => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`px-2.5 py-1 rounded-full text-[11px] ${
                  types.includes(t) ? "bg-rose-500/25 text-rose-200" : "bg-background/60 border border-border/40 text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={submit}
          disabled={!topic.trim() || types.length === 0}
          className="w-full py-2 rounded-xl bg-rose-500/25 text-rose-100 text-sm font-medium hover:bg-rose-500/35 disabled:opacity-40"
        >
          ابدأ الامتحان 🚀
        </button>
      </div>
    </CardShell>
  );
};

/* ───────────────────── Exam runner (timer + result) ───────────────────── */

const ExamRunnerCard = ({ card, onAnswer }: BaseProps) => {
  const questions = card.questions || [];
  const totalSec = (card.durationMin || 10) * 60;
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [done, setDone] = useState(false);
  const [remaining, setRemaining] = useState(totalSec);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          setDone(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [done]);

  const finish = () => setDone(true);

  if (done) {
    const correct = questions.reduce(
      (acc: number, q: any, i: number) => acc + (answers[i] === q.correct ? 1 : 0),
      0
    );
    const pct = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    return (
      <CardShell tone="rose" label="🏁 نتيجة الامتحان">
        <div className="text-center py-2">
          <div className="text-4xl font-bold text-rose-200">{pct}%</div>
          <div className="text-sm text-muted-foreground mt-1">
            {correct} من {questions.length} صح
          </div>
        </div>
        <div className="space-y-1.5">
          {questions.map((q: any, i: number) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              {answers[i] === q.correct
                ? <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                : <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
              <span className="text-foreground/80">{q.question}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => onAnswer?.(`النتيجة ${correct}/${questions.length}. حلل لي نقاط ضعفي وقولي أراجع إيه.`)}
          className="w-full py-2 rounded-xl bg-rose-500/25 text-rose-100 text-sm font-medium hover:bg-rose-500/35"
        >
          حلل نتيجتي →
        </button>
      </CardShell>
    );
  }

  const q = questions[idx];
  if (!q) return null;
  const min = String(Math.floor(remaining / 60)).padStart(2, "0");
  const sec = String(remaining % 60).padStart(2, "0");

  return (
    <CardShell tone="rose" label={`سؤال ${idx + 1} / ${questions.length}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{card.topic}</span>
        <span className={`font-mono font-semibold ${remaining < 60 ? "text-rose-300" : "text-foreground"}`}>
          ⏱ {min}:{sec}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground">{q.question}</p>
      <div className="space-y-1.5">
        {(q.options || []).map((o: string, i: number) => (
          <button
            key={i}
            onClick={() => setAnswers({ ...answers, [idx]: i })}
            className={`w-full text-right px-4 py-2.5 rounded-xl border text-sm ${
              answers[idx] === i
                ? "border-rose-400/60 bg-rose-500/15"
                : "border-border/50 bg-background/60 hover:border-rose-400/40"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {idx > 0 && (
          <button onClick={() => setIdx(idx - 1)} className="flex-1 py-1.5 rounded-lg bg-background/60 border border-border/40 text-xs">
            ← السابق
          </button>
        )}
        {idx < questions.length - 1 ? (
          <button
            onClick={() => setIdx(idx + 1)}
            disabled={answers[idx] === undefined}
            className="flex-1 py-1.5 rounded-lg bg-rose-500/20 text-rose-200 text-xs font-medium disabled:opacity-40"
          >
            التالي →
          </button>
        ) : (
          <button
            onClick={finish}
            className="flex-1 py-1.5 rounded-lg bg-rose-500/30 text-rose-100 text-xs font-medium"
          >
            إنهاء وعرض النتيجة
          </button>
        )}
      </div>
    </CardShell>
  );
};

/* ───────────────────── Photo solve ───────────────────── */

const PhotoSolveCard = ({ card, onAnswer }: BaseProps) => {
  return (
    <CardShell tone="blue" label="📸 حل خطوة بخطوة">
      {card.problem && <p className="text-sm font-medium text-foreground">{card.problem}</p>}
      <ol className="space-y-1.5 list-decimal pr-5">
        {(card.steps || []).map((s: string, i: number) => (
          <li key={i} className="text-sm text-foreground/90 leading-relaxed">{s}</li>
        ))}
      </ol>
      {card.answer && (
        <div className="rounded-lg bg-blue-500/10 border border-blue-400/30 px-3 py-2 text-sm font-medium text-blue-200">
          ✅ الإجابة النهائية: {card.answer}
        </div>
      )}
      {card.similar && card.similar.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground">جرّب أسئلة شبيهة:</div>
          {card.similar.map((q: string, i: number) => (
            <button
              key={i}
              onClick={() => onAnswer?.(`حل لي: ${q}`)}
              className="w-full text-right text-xs px-3 py-2 rounded-lg bg-background/60 border border-border/40 hover:border-blue-400/40"
            >
              {i + 1}. {q}
            </button>
          ))}
        </div>
      )}
    </CardShell>
  );
};

/* ───────────────────── Onboarding ───────────────────── */

const OnboardingCard = ({ card, onAnswer }: BaseProps) => {
  const [interests, setInterests] = useState("");
  const [level, setLevel] = useState("");
  return (
    <CardShell tone="emerald" label="✨ عرّفني عليك في 30 ثانية">
      <p className="text-sm text-foreground">{card.question || "علشان أشرح بطريقة تناسبك:"}</p>
      <input
        value={interests}
        onChange={(e) => setInterests(e.target.value)}
        placeholder="هواياتك (كورة، ألعاب، طبخ...)"
        className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background/60 text-sm outline-none focus:border-emerald-400/50"
      />
      <div className="flex gap-1.5">
        {["مبتدئ", "متوسط", "متقدم"].map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`flex-1 py-1.5 rounded-lg text-xs ${
              level === l ? "bg-emerald-500/25 text-emerald-200" : "bg-background/60 border border-border/40 text-muted-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      <button
        disabled={!interests.trim() || !level}
        onClick={() =>
          onAnswer?.(
            `معلوماتي: هواياتي ${interests}، مستواي ${level}. استخدم تشبيهات من اهتماماتي في كل الشرح من دلوقتي.`
          )
        }
        className="w-full py-2 rounded-xl bg-emerald-500/25 text-emerald-100 text-sm font-medium hover:bg-emerald-500/35 disabled:opacity-40"
      >
        احفظ وابدأ →
      </button>
    </CardShell>
  );
};

/* ───────────────────── Router ───────────────────── */

const LearnCard = ({ card, onAnswer }: { card: LearnCardData; onAnswer?: (text: string) => void }) => {
  switch (card.type) {
    case "mcq": return <MCQCard card={card} onAnswer={onAnswer} />;
    case "multi": return <MultiCard card={card} onAnswer={onAnswer} />;
    case "truefalse": return <TrueFalseCard card={card} onAnswer={onAnswer} />;
    case "explain": return <ExplainCard card={card} onAnswer={onAnswer} />;
    case "fill": return <FillCard card={card} onAnswer={onAnswer} />;
    case "match": return <MatchCard card={card} onAnswer={onAnswer} />;
    case "checkin": return <CheckinCard card={card} onAnswer={onAnswer} />;
    case "mermaid": return <MermaidCard card={card} onAnswer={onAnswer} />;
    case "roadmap": return <RoadmapCard card={card} onAnswer={onAnswer} />;
    case "exam_setup": return <ExamSetupCard card={card} onAnswer={onAnswer} />;
    case "exam_runner": return <ExamRunnerCard card={card} onAnswer={onAnswer} />;
    case "photo_solve": return <PhotoSolveCard card={card} onAnswer={onAnswer} />;
    case "onboarding": return <OnboardingCard card={card} onAnswer={onAnswer} />;
    default:
      return (
        <CardShell tone="amber" label="بطاقة">
          <pre className="text-xs text-muted-foreground overflow-x-auto">{JSON.stringify(card, null, 2)}</pre>
        </CardShell>
      );
  }
};

export default LearnCard;
