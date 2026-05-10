import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ThinkingLoaderProps {
  searchStatus?: string;
}

const ThinkingLoader = ({ searchStatus }: ThinkingLoaderProps) => {
  const displayText = searchStatus || "Thinking...";

  return (
    <div className="py-3">
      <div className="flex items-center gap-3">
        <motion.svg
          width="22" height="22" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
          className="shrink-0 text-primary"
          animate={{ rotate: [0, 180, 360], scale: [1, 1.15, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M50 5 L60 40 L95 50 L60 60 L50 95 L40 60 L5 50 L40 40 Z" fill="currentColor" />
        </motion.svg>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={displayText}
            initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(6px)" }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="text-sm font-bold text-foreground/90"
          >
            {displayText}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default memo(ThinkingLoader);
