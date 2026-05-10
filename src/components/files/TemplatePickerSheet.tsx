import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Check, Sparkles, LayoutGrid } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";

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

const TemplatePickerSheet = ({
  open, templates, selectedId, onSelect, onClose, showCategoryTabs,
}: Props) => {
  const [tab, setTab] = useState<PickerCategory>("premium");

  const visible = useMemo(() => {
    if (!showCategoryTabs) return templates;
    const filtered = templates.filter((t) => (t.category || "standard") === tab);
    return filtered.length ? filtered : templates;
  }, [templates, tab, showCategoryTabs]);

  const counts = useMemo(() => ({
    premium: templates.filter((t) => t.category === "premium").length,
    standard: templates.filter((t) => t.category === "standard").length,
  }), [templates]);

  const getFallbackStyle = (id: string): CSSProperties => {
    const palettes: Record<string, string> = {
      "megsy-3d-portfolio": "linear-gradient(135deg,#0b0118 0%,#5b21b6 48%,#22d3ee 100%)",
      "megsy-graphic": "linear-gradient(135deg,#3b0764 0%,#ec4899 48%,#fb923c 100%)",
      "megsy-spider": "linear-gradient(135deg,#7f1d1d 0%,#1e3a8a 48%,#fde68a 100%)",
      "portfolio-3d": "linear-gradient(135deg,#08080c 0%,#28135f 48%,#65f4ff 100%)",
      documentary: "linear-gradient(135deg,#161412 0%,#6d5540 48%,#e6d3b1 100%)",
      "fashion-ice": "linear-gradient(135deg,#eef8ff 0%,#9ed6ef 48%,#18212b 100%)",
      "digital-marketplace": "linear-gradient(135deg,#0b1020 0%,#174ea6 48%,#5cffc8 100%)",
      "blob-landing": "linear-gradient(135deg,#fff1f2 0%,#f59e0b 48%,#7c3aed 100%)",
      landscape: "linear-gradient(135deg,#10291e 0%,#77935d 48%,#e8d6a0 100%)",
      "modern-ai": "linear-gradient(135deg,#06111f 0%,#2563eb 48%,#dbeafe 100%)",
      noodles: "linear-gradient(135deg,#fff3d6 0%,#f97316 48%,#9a3412 100%)",
      "science-lab": "linear-gradient(135deg,#06130f 0%,#10b981 48%,#d9f99d 100%)",
    };
    return { background: palettes[id] || "linear-gradient(135deg,hsl(var(--muted)),hsl(var(--accent)))" };
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
                  className={`flex-1 h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    tab === "premium"
                      ? "bg-foreground text-background shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Premium
                  <span className="text-[10px] opacity-70">({counts.premium})</span>
                </button>
                <button
                  onClick={() => setTab("standard")}
                  className={`flex-1 h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    tab === "standard"
                      ? "bg-foreground text-background shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Standard
                  <span className="text-[10px] opacity-70">({counts.standard})</span>
                </button>
              </div>
            )}
          </header>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
            <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
              {visible.map((t) => {
                const active = selectedId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { onSelect(t); onClose(); }}
                    className={`group relative rounded-2xl overflow-hidden border-2 text-left transition-all bg-card ${
                      active ? "border-primary ring-2 ring-primary/30" : "border-border/50 hover:border-foreground/30"
                    }`}
                  >
                    {t.category === "premium" && (
                      <span className="absolute top-2 right-2 z-20 text-[10px] font-bold px-2 py-0.5 rounded-full bg-foreground text-background flex items-center gap-1 shadow">
                        <Sparkles className="h-2.5 w-2.5" />
                        Premium
                      </span>
                    )}
                    <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-muted/40 to-muted overflow-hidden">
                      <div
                        className="absolute inset-0 flex items-end p-3 text-xs font-black uppercase tracking-[0.22em] text-white/90"
                        style={getFallbackStyle(t.id)}
                      >
                        <span className="drop-shadow-lg">{t.fallbackLabel || t.name}</span>
                      </div>
                      {t.preview ? (
                        <img
                          src={t.preview}
                          alt={t.name}
                          loading="lazy"
                          className="relative z-10 w-full h-full object-cover"
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            img.style.display = "none";
                            img.parentElement?.classList.remove("bg-gradient-to-br", "from-muted/40", "to-muted");
                          }}
                        />
                      ) : null}
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
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold"
            >Confirm</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TemplatePickerSheet;
