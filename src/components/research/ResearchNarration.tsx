import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Search,
  Globe,
  Brain,
  FileText,
  CheckCircle2,
  BookOpen,
  Sparkles,
  Link2,
  PenLine,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";
import { detectLang, langDir } from "@/lib/detectLang";

interface Props {
  items: string[];
  active: boolean;
}

/** Pick an icon based on the narration text content (Arabic + English). */
function pickIcon(text: string): LucideIcon {
  const t = (text || "").toLowerCase();
  if (/بحث|ابحث|أبحث|بدور|search|google|googling|looking|query/i.test(t)) return Search;
  if (/فتح|موقع|رابط|صفحة|open|visit|browsing|website|url|page/i.test(t)) return Globe;
  if (/فكر|أفكر|تحليل|أحلل|think|analy[sz]|reason/i.test(t)) return Brain;
  if (/قرأ|أقرأ|اقرأ|محتوى|read|reading|content|extract/i.test(t)) return BookOpen;
  if (/مصدر|مرجع|source|reference|cite|citation/i.test(t)) return Link2;
  if (/كتاب|أكتب|اكتب|تقرير|اخراج|إخراج|writ|draft|generat|compos/i.test(t)) return PenLine;
  if (/ملف|تصميم|صمم|file|design|format|layout|export|render/i.test(t)) return FileText;
  if (/خلاص|تم|انته|finished|done|complete|ready/i.test(t)) return CheckCircle2;
  return Sparkles;
}

const ResearchNarration = ({ items, active }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const visible = (items || []).filter((t) => (t || "").trim().length > 0 || active);
  if (visible.length === 0 && !active) return null;

  if (visible.length === 0 && active) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        <span className="text-xs">جاري البحث…</span>
      </div>
    );
  }

  const dir = langDir(detectLang(items.join(" ")));
  const lastIdx = items.length - 1;
  // When collapsed (and we have more than 1 item) show only the last item.
  const showAll = expanded || items.length <= 1;
  const displayedItems = showAll
    ? items.map((text, i) => ({ text, originalIndex: i }))
    : [{ text: items[lastIdx], originalIndex: lastIdx }];
  const hiddenCount = items.length - 1;

  return (
    <div dir={dir} className="mb-3">
      {/* Toggle button when collapsed */}
      {!showAll && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="mb-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-full bg-secondary/40 border border-border/40"
        >
          <ChevronDown className="w-3 h-3" />
          <span>عرض كل الخطوات ({hiddenCount}+)</span>
        </button>
      )}

      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {displayedItems.map(({ text, originalIndex }) => {
            const isLast = originalIndex === lastIdx;
            const isEmpty = !text || text.trim().length === 0;
            const Icon = pickIcon(text);
            const isActiveStep = isLast && active;
            return (
              <motion.div
                key={originalIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="flex items-start gap-2.5"
              >
                <span className="mt-0.5 inline-flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-secondary/50 border border-border/40">
                  {isActiveStep && isEmpty ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  ) : (
                    <Icon
                      className={`w-3.5 h-3.5 ${isActiveStep ? "text-primary" : "text-muted-foreground"}`}
                    />
                  )}
                </span>
                <p className="text-[14px] leading-relaxed text-foreground/90 flex-1 break-words pt-0.5">
                  {text}
                  {isActiveStep && !isEmpty && (
                    <span className="inline-block w-[2px] h-[14px] bg-primary/70 align-middle ms-0.5 animate-pulse" />
                  )}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Collapse button when expanded */}
      {showAll && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-full bg-secondary/40 border border-border/40"
        >
          <ChevronUp className="w-3 h-3" />
          <span>عرض آخر خطوة فقط</span>
        </button>
      )}
    </div>
  );
};

export default ResearchNarration;
