import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import FancyButton from "@/components/FancyButton";

const videoShowcase = [
  { src: "/showcase/vid-1.mp4", prompt: "A cinematic drone shot over a misty mountain valley at sunrise", model: "Kling Pro" },
  { src: "/showcase/vid-2.mp4", prompt: "A fashion model walking through neon-lit Tokyo streets at night", model: "Runway Gen-3" },
  { src: "/showcase/vid-3.mp4", prompt: "Underwater coral reef with tropical fish and light rays", model: "Luma Dream Machine" },
  { src: "/showcase/vid-4.mp4", prompt: "A cyberpunk car chase through a rain-soaked futuristic city", model: "Pika 2.0" },
  { src: "/showcase/vid-5.mp4", prompt: "Timelapse of flowers blooming in a spring garden", model: "Megsy Pro" },
  { src: "/showcase/vid-6.mp4", prompt: "A majestic eagle soaring over snow-capped mountains", model: "Kling Standard" },
];

const stats = [
  { value: "10+", label: "Video Models" },
  { value: "10s", label: "Max Duration" },
  { value: "4K", label: "Max Resolution" },
  { value: "50K+", label: "Videos Generated" },
];

const howItWorks = [
  { number: "1", title: "Describe Your Vision", desc: "Type a text prompt or upload an image to animate.", bg: "bg-primary", textColor: "text-primary-foreground" },
  { number: "2", title: "Choose Your Model", desc: "Pick from Kling, Runway, Luma, Pika, or let Auto choose.", bg: "bg-yellow-400", textColor: "text-black" },
  { number: "3", title: "Customize Settings", desc: "Set duration, aspect ratio, motion intensity, and camera movement.", bg: "bg-rose-500", textColor: "text-white" },
  { number: "4", title: "Generate & Export", desc: "Watch your video render and download in your preferred format.", bg: "bg-purple-500", textColor: "text-white" },
];

const models = [
  { name: "Kling Pro 1.6", logo: "/model-logos/kling.png", desc: "Best for cinematic realism" },
  { name: "Runway Gen-3", logo: "/model-logos/luma.png", desc: "Fast creative generation" },
  { name: "Luma Dream Machine", logo: "/model-logos/luma.png", desc: "Smooth motion & transitions" },
  { name: "Pika 2.0", logo: "/model-logos/pika.png", desc: "Stylized & artistic videos" },
  { name: "Megsy Pro Video", logo: "/model-logos/megsy.png", desc: "Our flagship model" },
  { name: "Minimax", logo: "/model-logos/megsy.png", desc: "Budget-friendly quality" },
];

const faqs = [
  { q: "What video formats are supported?", a: "Megsy generates MP4 videos. You can choose from multiple aspect ratios including 16:9, 9:16, 1:1, and 4:3 to fit any platform." },
  { q: "How long can generated videos be?", a: "Depending on the model, videos can be up to 10 seconds long. You can chain multiple clips together for longer sequences." },
  { q: "Can I animate my own images?", a: "Yes! Upload any image and our Image-to-Video feature will bring it to life with natural motion and camera movement." },
  { q: "What's the difference between models?", a: "Each model has unique strengths. Kling excels at realism, Runway at creative effects, and Megsy Pro balances quality with speed." },
  { q: "How many credits does video generation cost?", a: "Video generation costs vary by model and duration. Standard quality starts at 5 MC per clip, with HD options available for more credits." },
];

const ServiceVideosPage = () => {
  const navigate = useNavigate();
  const [activeVideo, setActiveVideo] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-cycle videos
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveVideo((prev) => (prev + 1) % videoShowcase.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div data-theme="dark" className="min-h-screen bg-background text-foreground">
      <LandingNavbar />

      {/* ── HERO ── */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 pt-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/8 blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 mx-auto max-w-4xl text-center"
        >
          <h1 className="font-display text-5xl font-black uppercase leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
            <span className="block">Create Videos</span>
            <span className="block text-primary">With AI</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Generate cinematic video clips from text or images. No editing skills, no expensive software — just describe what you want.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <FancyButton onClick={() => navigate("/auth")} className="px-10 py-4 text-base sm:text-lg">
              Start Creating Videos
            </FancyButton>
          </div>
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── STATS ── */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p className="font-display text-4xl font-black text-primary md:text-5xl">{s.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── VIDEO SHOWCASE ── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl lg:text-6xl">
            SEE WHAT'S <span className="text-primary">POSSIBLE</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Every video below was generated entirely by AI. No footage, no editing, no post-production.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-4">
          {videoShowcase.map((v, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl overflow-hidden border border-white/[0.06] group cursor-pointer ${i === activeVideo ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setActiveVideo(i)}
            >
              <video
                src={v.src}
                autoPlay
                muted
                loop
                playsInline
                className="w-full aspect-video object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-4 z-10">
                <span className="text-xs font-semibold text-primary">{v.model}</span>
                <p className="text-sm text-white/80 mt-1 line-clamp-2">{v.prompt}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── BENTO FEATURES ── */}
      <section className="mx-auto max-w-7xl px-6 py-28">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl lg:text-6xl">
            WHY CREATORS CHOOSE<br /><span className="text-primary">MEGSY FOR VIDEO</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[280px]">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="relative rounded-2xl bg-primary p-6 flex flex-col justify-between lg:row-span-2">
            <div className="w-16 h-16 flex items-center justify-center text-4xl font-black text-black">01</div>
            <div>
              <h3 className="text-2xl font-bold text-black">Text to Video in seconds.</h3>
              <p className="mt-3 text-sm text-black/70">Describe any scene and watch it come to life. From product demos to cinematic shorts.</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="relative rounded-2xl overflow-hidden lg:col-span-2">
            <video src="/api-showcase/video-gen-preview.mp4" autoPlay muted loop playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
            <div className="absolute bottom-0 left-0 p-6 z-10">
              <h3 className="text-xl font-bold text-white">Image to Video magic.</h3>
              <p className="mt-2 text-sm text-white/90 max-w-sm">Upload any still image and animate it with realistic motion, camera movements, and transitions.</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
            className="relative rounded-2xl bg-yellow-400 p-6 flex flex-col justify-between lg:row-span-2">
            <div className="w-16 h-16 flex items-center justify-center text-4xl font-black text-black">AI</div>
            <div>
              <h3 className="text-2xl font-bold text-black">Multiple formats & ratios.</h3>
              <p className="mt-3 text-sm text-black/70">Export for TikTok, Instagram, YouTube, or presentations. Every aspect ratio supported natively.</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
            className="relative rounded-2xl overflow-hidden lg:col-span-2">
            <video src="/api-showcase/video-1.mp4" autoPlay muted loop playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
            <div className="absolute bottom-0 left-0 p-6 z-10">
              <h3 className="text-xl font-bold text-white">Pro camera controls.</h3>
              <p className="mt-2 text-sm text-white/90 max-w-sm">Control pan, zoom, tilt, and tracking shots. Direct your AI-generated scenes like a real filmmaker.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── MODELS ── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl lg:text-6xl">
            POWERED BY <span className="text-primary">10+ MODELS</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Access the world's best video AI models — all in one platform. Switch between them freely.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 flex items-center gap-4 hover:border-primary/20 hover:bg-primary/[0.03] transition-colors"
            >
              <img src={m.logo} alt={m.name} className="w-10 h-10 rounded-xl object-contain" />
              <div>
                <h3 className="font-bold text-foreground">{m.name}</h3>
                <p className="text-sm text-muted-foreground">{m.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl lg:text-6xl">
            HOW IT <span className="text-primary">WORKS</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {howItWorks.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`${step.bg} rounded-2xl p-6 flex flex-col justify-between min-h-[200px]`}
            >
              <span className={`text-5xl font-black ${step.textColor} opacity-60`}>{step.number}</span>
              <div>
                <h3 className={`text-lg font-bold ${step.textColor}`}>{step.title}</h3>
                <p className={`text-sm ${step.textColor} opacity-80 mt-1`}>{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl">FAQ</h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-semibold text-foreground pr-4">{faq.q}</span>
                <span className={`text-muted-foreground transition-transform ${openFaq === i ? "rotate-45" : ""}`}>+</span>
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-5xl px-6 py-28 text-center">
        <h2 className="font-display text-4xl font-black uppercase md:text-6xl">Ready to Create?</h2>
        <p className="mt-6 text-lg text-muted-foreground">Join thousands of creators using Megsy Pro for AI video generation.</p>
        <FancyButton onClick={() => navigate("/auth")} className="mt-10 text-lg px-12 py-4">
          Get Started Free
        </FancyButton>
      </section>

      <LandingFooter />
    </div>
  );
};

export default ServiceVideosPage;
