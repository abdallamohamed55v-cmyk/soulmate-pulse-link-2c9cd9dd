import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Check } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

export type PickerCategory = "premium" | "standard";

export interface PickerTemplate {
  id: string;
  name: string;
  preview?: string;
  description?: string;
  fallbackLabel?: string;
  category?: PickerCategory;
}

interface Props {
  open: boolean;
  templates: PickerTemplate[];
  selectedId?: string;
  onSelect: (t: PickerTemplate) => void;
  onClose: () => void;
  /** Show the Premium / Standard tabs (slides only). */
  showCategoryTabs?: boolean;
}

/* Deterministic gradient generator from a string id. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function gradientFor(id: string): string {
  const h = hashString(id);
  const h1 = h % 360;
  const h2 = (h1 + 40 + (h % 80)) % 360;
  const h3 = (h1 + 200 + ((h >> 3) % 60)) % 360;
  const angle = (h >> 5) % 360;
  return `linear-gradient(${angle}deg, hsl(${h1} 80% 18%) 0%, hsl(${h2} 75% 38%) 48%, hsl(${h3} 85% 60%) 100%)`;
}

const TemplatePickerSheet = ({
  open, templates, selectedId, onSelect, onClose, showCategoryTabs,
}: Props) => {
  const [tab, setTab] = useState<PickerCategory>("premium");
  const [pendingId, setPendingId] = useState<string | undefined>(selectedId);

  useEffect(() => { if (open) setPendingId(selectedId); }, [open, selectedId]);

  const visible = useMemo(() => {
    if (!showCategoryTabs) return templates;
    const filtered = templates.filter((t) => (t.category || "standard") === tab);
    return filtered.length ? filtered : templates;
  }, [templates, tab, showCategoryTabs]);

  const fallbackStyle = (id: string): CSSProperties => ({ background: gradientFor(id) });

  const confirm = () => {
    const tpl = templates.find((x) => x.id === pendingId);
    if (tpl) onSelect(tpl);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-background flex flex-col"
        >
          <header className="sticky top-0 z-10 px-4 pt-3 pb-2 border-b border-border/40 bg-background/90 backdrop-blur-xl">
            <div className="h-10 flex items-center justify-between">
              <button
                onClick={onClose}
                className="h-10 w-10 rounded-xl hover:bg-muted flex items-center justify-center"
                aria-label="Back"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-base font-bold">Select Style</h2>
              <div className="w-10" />
            </div>

            {showCategoryTabs && (
              <div className="mt-2 flex items-center gap-1 p-1 rounded-2xl bg-muted/60 max-w-md mx-auto">
                <button
                  onClick={() => setTab("premium")}
                  className={`flex-1 h-10 rounded-xl text-xs font-semibold transition ${
                    tab === "premium"
                      ? "bg-foreground text-background shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Premium
                </button>
                <button
                  onClick={() => setTab("standard")}
                  className={`flex-1 h-10 rounded-xl text-xs font-semibold transition ${
                    tab === "standard"
                      ? "bg-foreground text-background shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Standard
                </button>
              </div>
            )}
          </header>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
            <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
              {visible.map((t) => {
                const active = pendingId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setPendingId(t.id)}
                    className={`group relative rounded-2xl overflow-hidden border-2 text-left transition-all bg-card ${
                      active ? "border-primary ring-2 ring-primary/30" : "border-border/50 hover:border-foreground/30"
                    }`}
                  >
                    <div className="relative w-full aspect-[4/3] overflow-hidden" style={fallbackStyle(t.id)}>
                      {t.preview ? (
                        <img
                          src={t.preview}
                          alt={t.name}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : null}
                      <div className="absolute inset-0 flex items-end p-3 text-xs font-black uppercase tracking-[0.22em] text-white/95 bg-gradient-to-t from-black/40 to-transparent">
                        <span className="drop-shadow-lg">{t.fallbackLabel || t.name}</span>
                      </div>
                    </div>
                    <div className="px-3 py-2.5 flex items-center justify-between">
                      <span className="text-sm font-semibold truncate">{t.name}</span>
                      {active && (
                        <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sticky bottom-0 px-4 py-3 border-t border-border/40 bg-background/95 backdrop-blur-xl flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl bg-muted text-foreground font-semibold"
            >Cancel</button>
            <button
              onClick={confirm}
              className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold"
            >Confirm</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TemplatePickerSheet;
