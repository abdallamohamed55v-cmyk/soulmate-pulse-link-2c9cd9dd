import { motion } from "framer-motion";
import { UserPlus, Layers, Cpu, Sparkles, Rocket } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Create Your Account",
    description: "Sign up in seconds and receive free credits to explore all 80+ AI models right away.",
    bg: "bg-emerald-950/60",
    border: "border-emerald-500/20 hover:border-emerald-400/40",
    numColor: "text-emerald-500",
    titleColor: "text-emerald-100",
    descColor: "text-emerald-300/60",
    pointColor: "#10b981",
    glowColor: "shadow-emerald-500/10",
    icon: UserPlus,
  },
  {
    number: "02",
    title: "Choose Your Tool",
    description: "Pick from Chat, Image Gen, Video Creation, Code Builder, and 18+ pro creative tools.",
    bg: "bg-amber-950/60",
    border: "border-amber-500/20 hover:border-amber-400/40",
    numColor: "text-amber-500",
    titleColor: "text-amber-100",
    descColor: "text-amber-300/60",
    pointColor: "#f59e0b",
    glowColor: "shadow-amber-500/10",
    icon: Layers,
  },
  {
    number: "03",
    title: "Pick Your Model",
    description: "Access 80+ models including Megsy flagships — each fine-tuned for specific creative tasks.",
    bg: "bg-rose-950/60",
    border: "border-rose-500/20 hover:border-rose-400/40",
    numColor: "text-rose-500",
    titleColor: "text-rose-100",
    descColor: "text-rose-300/60",
    pointColor: "#f43f5e",
    glowColor: "shadow-rose-500/10",
    icon: Cpu,
  },
  {
    number: "04",
    title: "Create & Iterate",
    description: "Generate, edit, and refine your work. Upscale, restyle, and perfect every detail with ease.",
    bg: "bg-purple-950/60",
    border: "border-purple-500/20 hover:border-purple-400/40",
    numColor: "text-purple-500",
    titleColor: "text-purple-100",
    descColor: "text-purple-300/60",
    pointColor: "#a855f7",
    glowColor: "shadow-purple-500/10",
    icon: Sparkles,
  },
  {
    number: "05",
    title: "Export & Deploy",
    description: "Download in any format, deploy code projects live, or share directly to your platforms.",
    bg: "bg-cyan-950/60",
    border: "border-cyan-500/20 hover:border-cyan-400/40",
    numColor: "text-cyan-500",
    titleColor: "text-cyan-100",
    descColor: "text-cyan-300/60",
    pointColor: "#06b6d4",
    glowColor: "shadow-cyan-500/10",
    icon: Rocket,
  },
];

const POINT_CONFIGS = [
  { left: "10%", opacity: 1, duration: "2.35s", delay: "0.2s" },
  { left: "30%", opacity: 0.7, duration: "2.5s", delay: "0.5s" },
  { left: "25%", opacity: 0.8, duration: "2.2s", delay: "0.1s" },
  { left: "44%", opacity: 0.6, duration: "2.05s", delay: "0s" },
  { left: "50%", opacity: 1, duration: "1.9s", delay: "0s" },
  { left: "75%", opacity: 0.5, duration: "1.5s", delay: "1.5s" },
  { left: "88%", opacity: 0.9, duration: "2.2s", delay: "0.2s" },
  { left: "58%", opacity: 0.8, duration: "2.25s", delay: "0.2s" },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="relative overflow-hidden py-16 md:py-44">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="mb-20 text-center"
        >
          <h2 className="font-display text-[10vw] font-black uppercase leading-[0.85] tracking-tighter text-white md:text-[8vw]">
            GET STARTED
          </h2>
          <h2 className="font-display text-[10vw] font-black uppercase leading-[0.85] tracking-tighter md:text-[8vw]">
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              WITH MEGSY
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/40 leading-relaxed">
            From signup to deployment in five simple steps.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 80, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: i * 0.1 }}
                className={i === 4 ? "col-span-2 mx-auto w-1/2 md:col-span-1 md:w-full" : ""}
              >
                <div
                  className={`group relative h-full overflow-hidden rounded-2xl border ${step.border} ${step.bg} p-6 transition-all duration-300 hover:scale-[1.03] shadow-lg ${step.glowColor} hover:shadow-xl`}
                >
                  {/* Floating particles */}
                  <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                    {POINT_CONFIGS.map((cfg, j) => (
                      <span
                        key={j}
                        className="hiw-point"
                        style={{
                          left: cfg.left,
                          opacity: cfg.opacity,
                          animationDuration: cfg.duration,
                          animationDelay: cfg.delay,
                          backgroundColor: step.pointColor,
                        }}
                      />
                    ))}
                  </div>
                  <div className="relative z-10 flex flex-col gap-4">
                    <span className={`text-4xl font-black leading-none ${step.numColor} opacity-40`}>
                      {step.number}
                    </span>
                    <h3 className={`text-base font-bold ${step.titleColor}`}>{step.title}</h3>
                    <p className={`text-[13px] leading-relaxed ${step.descColor}`}>{step.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
