import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LOADING_TEXTS = [
  "Processing your audio...",
  "Analyzing voice patterns...",
  "Applying AI magic...",
  "Fine-tuning the output...",
  "Almost there...",
  "Rendering final audio...",
  "Optimizing quality...",
  "Creating something amazing...",
  "Polishing the result...",
  "Just a moment more...",
  "Working on it...",
  "Transforming your audio...",
];

const VoiceStarLoader = ({ text }: { text?: string }) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % LOADING_TEXTS.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-8">
      {/* Animated star */}
      <div className="relative w-24 h-24">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-violet-500 via-blue-500 to-pink-500 blur-xl opacity-40" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-400 via-blue-400 to-pink-400 blur-md opacity-60"
        />
        <motion.div
          animate={{ scale: [1, 0.95, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-4 rounded-full bg-gradient-to-r from-violet-300 to-blue-300"
          style={{ filter: "blur(1px)" }}
        />
      </div>

      {/* Status text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-lg font-bold bg-gradient-to-r from-violet-400 via-blue-400 to-pink-400 bg-clip-text text-transparent text-center"
        >
          {text || LOADING_TEXTS[idx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

export default VoiceStarLoader;
