import { Globe } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  active: boolean;
  onToggle: () => void;
}

const DeepResearchToggle = ({ active, onToggle }: Props) => {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.96 }}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
        active
          ? "border-violet-400/40 bg-violet-500/15 text-violet-300"
          : "border-border/40 bg-background/40 text-muted-foreground hover:text-foreground hover:border-border/70"
      }`}
      aria-pressed={active}
      title="Deep Research"
    >
      <Globe className="w-3.5 h-3.5" />
      <span>Deep Research</span>
    </motion.button>
  );
};

export default DeepResearchToggle;
