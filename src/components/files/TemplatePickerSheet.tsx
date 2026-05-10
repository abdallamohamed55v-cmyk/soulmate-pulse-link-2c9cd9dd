import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Check } from "lucide-react";

export interface PickerTemplate {
  id: string;
  name: string;
  preview?: string;
  description?: string;
}

interface Props {
  open: boolean;
  templates: PickerTemplate[];
  selectedId?: string;
  onSelect: (t: PickerTemplate) => void;
  onClose: () => void;
}

const TemplatePickerSheet = ({ open, templates, selectedId, onSelect, onClose }: Props) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-background flex flex-col"
        >
          <header className="sticky top-0 z-10 h-14 px-4 flex items-center justify-between border-b border-border/40 bg-background/90 backdrop-blur-xl">
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-xl hover:bg-muted flex items-center justify-center"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-base font-bold">Select Style</h2>
            <div className="w-10" />
          </header>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
            <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
              {templates.map((t) => {
                const active = selectedId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { onSelect(t); onClose(); }}
                    className={`group relative rounded-2xl overflow-hidden border-2 text-left transition-all bg-card ${
                      active ? "border-primary ring-2 ring-primary/30" : "border-border/50 hover:border-foreground/30"
                    }`}
                  >
                    <div className="w-full aspect-[4/3] bg-gradient-to-br from-muted/40 to-muted overflow-hidden">
                      {t.preview ? (
                        <img
                          src={t.preview}
                          alt={t.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground uppercase tracking-widest">
                          {t.name}
                        </div>
                      )}
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
