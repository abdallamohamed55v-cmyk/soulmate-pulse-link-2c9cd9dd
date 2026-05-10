import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import FancyButton from "@/components/FancyButton";
import SEOHead from "@/components/SEOHead";
import { MessageSquare, Image, Video, Zap, Globe, Shield, Sparkles, Cpu, Layers } from "lucide-react";

const models = [
{
  name: "Megsy V1",
  tagline: "Advanced AI Chat & Reasoning",
  description: "Our flagship conversational AI model. Megsy V1 delivers intelligent, context-aware responses with deep reasoning capabilities, multilingual support, and creative problem-solving — all with a unique personality that sets it apart from generic chatbots.",
  icon: MessageSquare,
  color: "from-violet-500 to-purple-600",
  bgGlow: "bg-violet-500/10",
  capabilities: [
  "Advanced reasoning & analysis",
  "Creative writing & brainstorming",
  "Code generation & debugging",
  "Multilingual support (30+ languages)",
  "Document & file analysis",
  "Mathematical problem solving",
  "Context-aware conversations",
  "Web search integration"],

  specs: [
  { label: "Context Window", value: "128K tokens" },
  { label: "Languages", value: "30+" },
  { label: "Response Speed", value: "< 1s" },
  { label: "Credit Cost", value: "1 MC / message" }],

  cta: "Start Chatting",
  href: "/services/chat"
},
{
  name: "Megsy Imagine",
  tagline: "Professional AI Image Generation",
  description: "Create stunning, publication-ready images from text descriptions. Megsy Imagine produces photorealistic renders, digital art, illustrations, and brand assets with exceptional detail, accurate text rendering, and precise style control.",
  icon: Image,
  color: "from-emerald-500 to-teal-600",
  bgGlow: "bg-emerald-500/10",
  capabilities: [
  "Text-to-image generation",
  "Image-to-image transformation",
  "Accurate text rendering in images",
  "Multiple aspect ratios (1:1 to 21:9)",
  "Quality tiers up to 4K resolution",
  "Batch generation (up to 4 images)",
  "Style-consistent outputs",
  "Commercial usage rights"],

  specs: [
  { label: "Max Resolution", value: "4K" },
  { label: "Aspect Ratios", value: "10+" },
  { label: "Generation Speed", value: "~5s" },
  { label: "Credit Cost", value: "From 2 MC" }],

  cta: "Generate Images",
  href: "/services/images"
},
{
  name: "Megsy Video",
  tagline: "Cinematic AI Video Generation",
  description: "Transform ideas into cinematic video content. Megsy Video creates high-quality videos from text prompts or still images, with support for multiple durations, aspect ratios, and built-in audio generation for complete, ready-to-publish content.",
  icon: Video,
  color: "from-rose-500 to-pink-600",
  bgGlow: "bg-rose-500/10",
  capabilities: [
  "Text-to-video generation",
  "Image-to-video animation",
  "Built-in audio generation",
  "Multiple durations (5s to 10s)",
  "Cinematic aspect ratios",
  "Smooth motion & transitions",
  "Consistent character rendering",
  "Commercial usage rights"],

  specs: [
  { label: "Max Duration", value: "10s" },
  { label: "Resolution", value: "1080p" },
  { label: "Audio", value: "Built-in" },
  { label: "Credit Cost", value: "From 8 MC" }],

  cta: "Create Videos",
  href: "/services/videos"
}];


const stats = [
{ value: "3", label: "Megsy Models" },
{ value: "36+", label: "AI Engines" },
{ value: "80+", label: "Total Models" },
{ value: "1M+", label: "Generations" }];


const ModelsPage = () => {
  const navigate = useNavigate();

  return (
    <div data-theme="dark" className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="AI Models"
        description="Explore Megsy's AI models — Megsy V1 for chat, Megsy Imagine for image generation, and Megsy Video for cinematic video creation. Powered by 36+ AI engines."
        path="/models" />
      
      <LandingNavbar />

      {/* Hero */}
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-6 pt-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/6 blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 mx-auto max-w-4xl text-center">
          
          







          

          <h1 className="font-display text-5xl font-black uppercase leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
            <span className="block">Meet The</span>
            <span className="block bg-gradient-to-r from-primary via-purple-400 to-pink-500 bg-clip-text text-transparent">
              Megsy Models
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Three purpose-built AI models powering the next generation of creative work.
            Chat, generate images, create videos — all under one unified platform.
          </p>
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 gap-6 md:grid-cols-4">
          
          {stats.map((s, i) =>
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl border border-white/[0.06] bg-card p-6 text-center">
            
              <div className="font-display text-4xl font-black text-foreground">{s.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Models */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="space-y-32">
          {models.map((model, idx) =>
          <motion.div
            key={model.name}
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className={`flex flex-col gap-12 lg:flex-row lg:items-start ${idx % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
            
              {/* Info */}
              <div className="flex-1 space-y-8">
                <div>
                  

                
                  <h2 className="mt-5 font-display text-4xl font-black uppercase tracking-tight md:text-5xl">
                    {model.name}
                  </h2>
                  <p className="mt-1 text-lg font-medium text-primary">{model.tagline}</p>
                  <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
                    {model.description}
                  </p>
                </div>

                {/* Capabilities */}
                <div>
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Capabilities
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {model.capabilities.map((cap) =>
                  <div key={cap} className="flex items-center gap-3 text-sm text-foreground/80">
                        <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
                        {cap}
                      </div>
                  )}
                  </div>
                </div>

                <FancyButton onClick={() => navigate(model.href)} className="text-base">
                  {model.cta}
                </FancyButton>
              </div>

              {/* Specs Card */}
              <div className="w-full lg:w-[380px] shrink-0">
                <div className={`relative overflow-hidden rounded-3xl border border-white/[0.08] bg-card p-8`}>
                  <div className={`absolute -top-20 -right-20 h-40 w-40 rounded-full ${model.bgGlow} blur-[80px]`} />
                  <h3 className="relative mb-8 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Technical Specs
                  </h3>
                  <div className="relative space-y-6">
                    {model.specs.map((spec) =>
                  <div key={spec.label} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{spec.label}</span>
                        <span className="font-display text-lg font-bold text-foreground">{spec.value}</span>
                      </div>
                  )}
                  </div>

                  <div className="relative mt-8 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <div className="flex items-center gap-3">
                      

                    
                      <div>
                        <div className="text-sm font-semibold text-foreground">Powered by Megsy AI</div>
                        <div className="text-xs text-muted-foreground">Enterprise-grade infrastructure</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Why Megsy */}
      <section className="border-t border-white/[0.06] py-28">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center">
            
            <h2 className="font-display text-4xl font-black uppercase md:text-5xl">
              Why <span className="text-primary">Megsy</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
            { icon: Layers, title: "Unified Platform", desc: "Chat, images, and videos in one place. No switching between tools or subscriptions." },
            { icon: Globe, title: "Global Infrastructure", desc: "Low-latency servers worldwide ensure fast generation times regardless of your location." },
            { icon: Shield, title: "Enterprise Security", desc: "End-to-end encryption, GDPR compliance, and SOC 2 aligned security practices." }].
            map((item, i) =>
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-white/[0.06] bg-card p-8">
              
                

              
                <h3 className="mb-2 text-xl font-bold text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/[0.06] py-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl px-6 text-center">
          
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl">
            Ready to <span className="text-primary">Create</span>?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
            Start using Megsy's AI models today. No credit card required.
          </p>
          <div className="mt-10">
            <FancyButton onClick={() => navigate("/auth")} className="px-12 py-4 text-lg">
              Get Started Free
            </FancyButton>
          </div>
        </motion.div>
      </section>

      <LandingFooter />
    </div>);

};

export default ModelsPage;