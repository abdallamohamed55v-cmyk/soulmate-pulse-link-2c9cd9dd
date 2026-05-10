import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import FancyButton from "@/components/FancyButton";

const stats = [
  { value: "50+", label: "Languages" },
  { value: "1-Click", label: "Deploy" },
  { value: "Live", label: "Preview" },
  { value: "Full-Stack", label: "Apps" },
];

const codeSnippets = [
  { lang: "React", code: `import { useState } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <button onClick={() => setCount(c => c + 1)}>\n      Count: {count}\n    </button>\n  );\n}` },
  { lang: "Python", code: `from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get("/api/users")\nasync def get_users():\n    return {"users": await db.fetch_all()}\n\n@app.post("/api/users")\nasync def create_user(user: User):\n    return await db.insert(user)` },
  { lang: "SQL", code: `CREATE TABLE products (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  name TEXT NOT NULL,\n  price DECIMAL(10,2) NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT now()\n);\n\nALTER TABLE products\n  ENABLE ROW LEVEL SECURITY;` },
];

const features = [
  { title: "Natural Language to Code", desc: "Describe what you want in plain English and Megsy Pro generates production-ready code. No syntax memorization needed." },
  { title: "Full-Stack Generation", desc: "Build complete applications with frontend, backend, database, and API — all from a single conversation with Megsy Pro." },
  { title: "Live Preview", desc: "See your app running in real-time as Megsy builds it. Watch changes appear instantly without manual compilation." },
  { title: "One-Click Deploy", desc: "Deploy your finished app to the cloud instantly. Automatic hosting, SSL certificates, and custom domain support included." },
  { title: "Smart Debugging", desc: "Megsy Pro identifies bugs, explains the root cause, and suggests fixes. Automated error detection saves hours of debugging." },
  { title: "Version Control", desc: "Every change is tracked. Revert to any previous version, compare changes, and maintain full project history." },
];

const techStack = [
  "React", "TypeScript", "Node.js", "Python", "PostgreSQL", "Supabase",
  "Tailwind CSS", "Next.js", "Express", "FastAPI", "MongoDB", "Redis",
];

const howItWorks = [
  { number: "1", title: "Describe Your App", desc: "Tell Megsy what you want to build in plain language.", bg: "bg-primary", textColor: "text-primary-foreground" },
  { number: "2", title: "AI Generates Code", desc: "Watch as Megsy writes clean, production-ready code in real-time.", bg: "bg-yellow-400", textColor: "text-black" },
  { number: "3", title: "Preview & Iterate", desc: "See your app live, request changes, and refine with natural language.", bg: "bg-rose-500", textColor: "text-white" },
  { number: "4", title: "Deploy & Share", desc: "One click to deploy. Get a live URL and share with the world.", bg: "bg-purple-500", textColor: "text-white" },
];

const faqs = [
  { q: "What programming languages are supported?", a: "Megsy Pro supports 50+ languages including JavaScript, TypeScript, Python, Go, Rust, SQL, HTML/CSS, and more. It generates idiomatic code following best practices for each language." },
  { q: "Can I build a full app from scratch?", a: "Yes! Describe your app idea and Megsy will generate the complete frontend, backend, database schema, and API endpoints. You can iterate and refine through natural conversation." },
  { q: "How does one-click deploy work?", a: "Once your app is ready, click Deploy and Megsy handles everything — containerization, hosting, SSL, and domain configuration. Your app is live in seconds." },
  { q: "Can I export the code?", a: "Absolutely. All generated code is yours. Download the full project, push to GitHub, or continue editing locally. No vendor lock-in." },
  { q: "Is it good for learning to code?", a: "Yes! Megsy explains its code, teaches patterns, and answers questions about programming concepts. It's like having a senior developer mentor available 24/7." },
];

const ServiceCodePage = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeSnippet, setActiveSnippet] = useState(0);

  return (
    <div data-theme="dark" className="min-h-screen bg-background text-foreground">
      <LandingNavbar />

      {/* ── HERO ── */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 pt-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/8 blur-[100px]" />
        </div>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="relative z-10 mx-auto max-w-4xl text-center">
          <h1 className="font-display text-5xl font-black uppercase leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
            <span className="block">Build Apps</span>
            <span className="block text-primary">With AI</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Describe what you want to build in plain language. Megsy Pro writes, debugs, and deploys your code — no experience needed.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <FancyButton onClick={() => navigate("/auth")} className="px-10 py-4 text-base sm:text-lg">
              Start Building Free
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

      {/* ── CODE SHOWCASE ── */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl lg:text-6xl">
            SEE IT <span className="text-primary">IN ACTION</span>
          </h2>
        </motion.div>

        <div className="flex gap-2 mb-4 justify-center">
          {codeSnippets.map((s, i) => (
            <button key={s.lang} onClick={() => setActiveSnippet(i)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeSnippet === i ? "bg-primary text-primary-foreground" : "bg-white/[0.06] text-muted-foreground hover:text-foreground"}`}>
              {s.lang}
            </button>
          ))}
        </div>

        <motion.div
          key={activeSnippet}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden"
        >
          <div className="border-b border-border/20 px-4 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
            <span className="ml-3 text-xs text-muted-foreground">{codeSnippets[activeSnippet].lang}</span>
          </div>
          <pre className="p-6 text-sm text-foreground/90 overflow-x-auto font-mono leading-relaxed">
            {codeSnippets[activeSnippet].code}
          </pre>
        </motion.div>
      </section>

      {/* ── TECH STACK ── */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl lg:text-6xl">
            SUPPORTS <span className="text-primary">YOUR STACK</span>
          </h2>
        </motion.div>
        <div className="flex flex-wrap justify-center gap-3">
          {techStack.map((tech, i) => (
            <motion.span key={tech} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-foreground/80 hover:border-primary/30 hover:text-primary transition-colors">
              {tech}
            </motion.span>
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
        <h2 className="font-display text-4xl font-black uppercase md:text-6xl">Ready to Build?</h2>
        <p className="mt-6 text-lg text-muted-foreground">Turn your ideas into apps with Megsy Pro — no coding required.</p>
        <FancyButton onClick={() => navigate("/auth")} className="mt-10 text-lg px-12 py-4">Get Started Free</FancyButton>
      </section>

      <LandingFooter />
    </div>
  );
};

export default ServiceCodePage;
