import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import FancyButton from "@/components/FancyButton";

const stats = [
  { value: "80+", label: "AI Models" },
  { value: "30+", label: "Languages" },
  { value: "1M+", label: "Messages Sent" },
  { value: "99.9%", label: "Uptime" },
];

const modelLogos = [
  { name: "GPT-4o", logo: "/model-logos/openai.svg" },
  { name: "Gemini Pro", logo: "/model-logos/google.ico" },
  { name: "Grok", logo: "/model-logos/xai.ico" },
  { name: "Megsy Pro", logo: "/model-logos/megsy.png" },
  { name: "Recraft", logo: "/model-logos/recraft.png" },
  { name: "Ideogram", logo: "/model-logos/ideogram.png" },
];

const features = [
  { title: "Megsy Pro Model", desc: "Our proprietary model excels at creative writing, nuanced reasoning, and multilingual conversations with deep context understanding." },
  { title: "80+ Models in One Place", desc: "Switch between GPT-4o, Claude, Gemini, Llama, Mistral, and dozens more without leaving the chat. One subscription, all models." },
  { title: "Real-Time Web Search", desc: "Get up-to-date answers with integrated web search. Every response includes source citations for full transparency." },
  { title: "File & Image Analysis", desc: "Attach PDFs, images, spreadsheets, and documents. AI analyzes and answers questions about your uploaded content instantly." },
  { title: "Code Generation", desc: "Write, debug, and explain code in any language. Syntax highlighting, one-click copy, and full project generation built in." },
  { title: "Conversation Memory", desc: "Megsy remembers your preferences, writing style, and past interactions across sessions for increasingly personalized responses." },
];

const demoMessages = [
  { role: "user", text: "Write me a compelling product description for a premium wireless headphone" },
  { role: "ai", text: "Introducing the AuraX Pro — where silence meets symphony. Crafted with aerospace-grade titanium and memory-foam cushions that mold to your unique contour, these headphones deliver 40 hours of uninterrupted, studio-quality sound. The adaptive ANC learns your environment, while spatial audio transforms every track into a live performance. Premium. Personal. Profound." },
  { role: "user", text: "Now translate that to Japanese" },
  { role: "ai", text: "AuraX Proのご紹介 — 静寂と交響曲が出会う場所。航空宇宙グレードのチタンと、あなただけの輪郭に合わせて形を変えるメモリーフォームクッションで作られたこのヘッドフォンは、40時間の途切れないスタジオ品質のサウンドをお届けします。アダプティブANCがあなたの環境を学習し、空間オーディオがすべてのトラックをライブパフォーマンスに変えます。プレミアム。パーソナル。プロファウンド。" },
];

const howItWorks = [
  { number: "1", title: "Start a Chat", desc: "Type your message or paste content you want help with.", bg: "bg-primary", textColor: "text-primary-foreground" },
  { number: "2", title: "Pick a Model", desc: "Choose Megsy Pro for best results, or pick from 80+ alternatives.", bg: "bg-yellow-400", textColor: "text-black" },
  { number: "3", title: "Attach Files", desc: "Upload images, PDFs, or code files for AI-powered analysis.", bg: "bg-rose-500", textColor: "text-white" },
  { number: "4", title: "Get Results", desc: "Receive intelligent responses, code, translations, and more.", bg: "bg-purple-500", textColor: "text-white" },
];

const faqs = [
  { q: "What makes Megsy Pro different from ChatGPT?", a: "Megsy Pro gives you access to 80+ models including GPT-4o, Claude, Gemini, and our own Megsy Pro model — all in one interface. No need for multiple subscriptions." },
  { q: "Can I use it for coding?", a: "Absolutely. Megsy supports code generation, debugging, and explanation in all major programming languages with syntax highlighting and one-click copy." },
  { q: "Is my data private?", a: "Yes. We don't train on your conversations. All data is encrypted in transit and at rest. You can delete your history at any time." },
  { q: "How many messages can I send?", a: "Free users get daily message allowances. Premium users enjoy significantly higher limits with access to all models including the most powerful ones." },
  { q: "Does it support file uploads?", a: "Yes. You can upload images, PDFs, Word documents, spreadsheets, and code files. The AI will analyze and answer questions about your content." },
];

const ServiceChatPage = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [visibleMessages, setVisibleMessages] = useState(0);

  // Animate demo messages appearing
  useEffect(() => {
    if (visibleMessages < demoMessages.length) {
      const timer = setTimeout(() => setVisibleMessages(prev => prev + 1), 1500);
      return () => clearTimeout(timer);
    }
    // Reset after showing all
    const resetTimer = setTimeout(() => setVisibleMessages(0), 5000);
    return () => clearTimeout(resetTimer);
  }, [visibleMessages]);

  return (
    <div data-theme="dark" className="min-h-screen bg-background text-foreground">
      <LandingNavbar />

      {/* ── HERO ── */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 pt-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/8 blur-[100px]" />
        </div>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="relative z-10 mx-auto max-w-4xl text-center">
          <h1 className="font-display text-5xl font-black uppercase leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
            <span className="block">Chat With</span>
            <span className="block text-primary">80+ AI Models</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            One platform. Every model. From creative writing to code generation — Megsy Pro puts the world's best AI at your fingertips.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <FancyButton onClick={() => navigate("/auth")} className="px-10 py-4 text-base sm:text-lg">
              Start Chatting Free
            </FancyButton>
          </div>
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── STATS ── */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="text-center">
              <p className="font-display text-4xl font-black text-primary md:text-5xl">{s.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CHAT DEMO ── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl lg:text-6xl">
            SEE IT <span className="text-primary">IN ACTION</span>
          </h2>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden max-w-2xl mx-auto">
          <div className="border-b border-border/20 px-4 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
            <span className="ml-3 text-xs text-muted-foreground">Megsy Pro Chat</span>
          </div>
          <div className="p-6 space-y-4 min-h-[350px]">
            {demoMessages.slice(0, visibleMessages).map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted/30 text-foreground rounded-bl-md"}`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
              </motion.div>
            ))}
            {visibleMessages > 0 && visibleMessages < demoMessages.length && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="flex gap-1 px-4 py-3">
                  {[0, 1, 2].map(d => (
                    <motion.div key={d} className="w-2 h-2 rounded-full bg-primary/50"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: d * 0.15 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </section>

      {/* ── MODEL LOGOS ── */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl lg:text-6xl">
            ALL YOUR FAVORITE <span className="text-primary">MODELS</span>
          </h2>
        </motion.div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {modelLogos.map((m, i) => (
            <motion.div key={m.name} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-primary/20 transition-colors">
              <img src={m.logo} alt={m.name} className="w-10 h-10 rounded-xl object-contain" />
              <span className="text-xs font-medium text-muted-foreground">{m.name}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="mx-auto max-w-7xl px-6 py-28">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl lg:text-6xl">
            EVERYTHING YOU <span className="text-primary">NEED</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 hover:border-primary/20 hover:bg-primary/[0.03] transition-colors">
              <h3 className="text-lg font-bold text-foreground">{f.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl lg:text-6xl">HOW IT <span className="text-primary">WORKS</span></h2>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {howItWorks.map((step, i) => (
            <motion.div key={step.number} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className={`${step.bg} rounded-2xl p-6 flex flex-col justify-between min-h-[200px]`}>
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
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                <span className="font-semibold text-foreground pr-4">{faq.q}</span>
                <span className={`text-muted-foreground transition-transform ${openFaq === i ? "rotate-45" : ""}`}>+</span>
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
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
        <h2 className="font-display text-4xl font-black uppercase md:text-6xl">Ready to Chat?</h2>
        <p className="mt-6 text-lg text-muted-foreground">Join thousands using Megsy Pro for smarter AI conversations.</p>
        <FancyButton onClick={() => navigate("/auth")} className="mt-10 text-lg px-12 py-4">Get Started Free</FancyButton>
      </section>

      <LandingFooter />
    </div>
  );
};

export default ServiceChatPage;
