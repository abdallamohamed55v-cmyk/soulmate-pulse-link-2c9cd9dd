import { forwardRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface SmartQuestion {
  title: string;
  options: string[];
  allowText?: boolean;
}

interface Props {
  questions: SmartQuestion[];
  /** Called once with the merged answer string when the user finishes (or skips). */
  onComplete: (answer: string) => void;
  answered?: boolean;
  /** Optional final answer to render when collapsed. */
  finalAnswer?: string;
}

const spring = { type: "spring" as const, damping: 24, stiffness: 320 };

/**
 * In-chat smart questions card. Renders one question at a time with multiple-choice
 * options + a free-text input + skip. No icons, fully theme-tokenised, mirrors RTL
 * automatically through the surrounding chat container.
 */
const SmartQuestionFlow = forwardRef<HTMLDivElement, Props>(
  ({ questions, onComplete, answered, finalAnswer }, ref) => {
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<{ q: string; a: string }[]>([]);
    const [text, setText] = useState("");

    if (answered) {
      const collapsed = finalAnswer || answers.map(a => `${a.q}: ${a.a}`).join("  ·  ");
      return (
        <div ref={ref} className="liquid-glass-subtle rounded-2xl px-4 py-3 text-sm text-muted-foreground/80 max-w-md">
          {collapsed || "Answered"}
        </div>
      );
    }

    if (!questions || questions.length === 0) return null;
    const q = questions[index];
    if (!q) return null;

    const finish = (extra: { q: string; a: string }[]) => {
      const all = [...answers, ...extra];
      onComplete(all.map(p => `${p.q}\n${p.a}`).join("\n\n"));
    };

    const choose = (option: string) => {
      const next = { q: q.title, a: option };
      if (index < questions.length - 1) {
        setAnswers([...answers, next]);
        setIndex(index + 1);
      } else {
        finish([next]);
      }
    };

    const submitText = () => {
      const v = text.trim();
      if (!v) return;
      setText("");
      choose(v);
    };

    const skip = () => onComplete("");

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="liquid-glass rounded-3xl p-5 max-w-md space-y-3"
      >
        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {questions.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === index ? "w-6 bg-primary" : i < index ? "w-3 bg-primary/40" : "w-3 bg-foreground/10"
              }`}
            />
          ))}
          <span className="ml-auto text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
            {index + 1} / {questions.length}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={spring}
            className="space-y-3"
          >
            <p className="text-sm font-semibold text-foreground leading-snug">{q.title}</p>

            <div className="flex flex-col gap-1.5">
              {q.options.map((opt, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  transition={spring}
                  onClick={() => choose(opt)}
                  className="w-full text-start px-4 py-2.5 rounded-2xl liquid-glass-button text-sm text-foreground/90 hover:text-foreground transition-colors"
                >
                  <span className="text-muted-foreground/60 me-2 tabular-nums">{i + 1}.</span>
                  {opt}
                </motion.button>
              ))}
            </div>

            {q.allowText !== false && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitText(); } }}
                  placeholder="…"
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-background/50 border border-border/30 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                />
                {text.trim() && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    transition={spring}
                    onClick={submitText}
                    className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20"
                  >
                    Send
                  </motion.button>
                )}
              </div>
            )}

            <button
              onClick={skip}
              className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              Skip — assume the best
            </button>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    );
  }
);

SmartQuestionFlow.displayName = "SmartQuestionFlow";

export default SmartQuestionFlow;
