import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FancyButton from "@/components/FancyButton";
import ChatDemo from "@/components/landing/ChatDemo";
import CodeDemo from "@/components/landing/CodeDemo";
import LazyVideo from "@/components/landing/LazyVideo";

const tabs = [
  {
    title: "AI CHAT",
    description: "Your ultimate AI companion — powered by GPT-5, Gemini, Claude, DeepSeek R1 & Megsy's own model. Chat naturally, upload files, search the web in real-time, and let AI remember everything. One conversation. Unlimited possibilities.",
    video: "",
    accent: "bg-emerald-500",
    useChat: true,
  },
  {
    title: "IMAGE GENERATION",
    description: "Turn words into breathtaking visuals. 20+ world-class models — FLUX Kontext Max, Recraft V4, Ideogram 3, Megsy V1 & more. From cinematic concept art to stunning product shots, create visuals that stop the scroll.",
    video: "",
    image: "/api-showcase/image-gen-preview.jpg",
    accent: "bg-primary",
  },
  {
    title: "VIDEO CREATION",
    description: "Bring your imagination to life in motion. Kling 3.0 Pro, Veo 3.1, Runway Gen-4 & Megsy Video — generate cinematic scenes, control camera angles, and render stunning videos from a single prompt. Your director's chair awaits.",
    video: "/api-showcase/video-gen-preview.mp4",
    accent: "bg-amber-500",
  },
  {
    title: "CODE & DEPLOY",
    description: "Describe what you want, watch it come to life. Live preview, real-time code editing, GitHub sync & one-click Vercel deployment. From idea to production in seconds — no setup, no limits.",
    video: "",
    accent: "bg-cyan-500",
    useCode: true,
  },
];

const StickyFeatureTabs = () => {
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const current = tabs[active];

  return (
    <section id="features" className="bg-background py-14 md:py-28">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-12"
        >
          <h2 className="font-display text-3xl font-black uppercase tracking-tight text-foreground md:text-6xl">
            WHAT YOU CAN <span className="text-primary">CREATE</span>
          </h2>
        </motion.div>

        {/* Tab buttons */}
        <div className="relative mb-6 md:mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:flex-wrap md:gap-3 md:overflow-visible md:pb-0">
            {tabs.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`relative shrink-0 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 md:px-5 md:py-2.5 md:text-sm ${
                  i === active
                    ? "bg-foreground text-background"
                    : "border border-border/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                {tab.title}
              </button>
            ))}
          </div>
          {/* Scroll hint fade - mobile only */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent md:hidden" />
        </div>

        {/* Content */}
        <div className="grid gap-6 md:gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-stretch">
          {/* Text side */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.35 }}
              className="order-2 flex flex-col justify-center lg:order-1"
            >
              <div className={`mb-4 h-1 w-12 rounded-full ${current.accent}`} />
              <h3 className="font-display text-2xl font-black uppercase tracking-tight text-foreground md:text-5xl">
                {current.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:mt-4 md:text-lg">
                {current.description}
              </p>
              <div className="mt-6 md:mt-8">
                <FancyButton onClick={() => navigate("/auth")} className="text-sm">
                  Try it now
                </FancyButton>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Preview side */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.4 }}
              className="relative order-1 aspect-[16/10] overflow-hidden rounded-2xl lg:order-2"
            >
              {current.useChat ? (
                <ChatDemo />
              ) : current.useCode ? (
                <CodeDemo />
              ) : current.image ? (
                <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border/30">
                  <img
                    src={current.image}
                    alt={current.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border/30">
                  <LazyVideo src={current.video} className="h-full w-full" />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default StickyFeatureTabs;
