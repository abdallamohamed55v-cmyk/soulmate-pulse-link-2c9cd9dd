import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCredits } from "@/hooks/useCredits";
import ToolPageLayout, { TemplateGrid, SilkyToolLanding } from "@/components/ToolPageLayout";
import { useToolTemplates } from "@/hooks/useToolTemplates";
import type { ToolTemplate } from "@/components/ToolPageLayout";

type Step = "landing" | "templates" | "generating" | "result";

const LOADING_TEXTS = [
  { text: "CREATING", accent: "MAGIC" },
  { text: "PROCESSING", accent: "YOUR IMAGE" },
  { text: "REFINING", accent: "DETAILS" },
  { text: "ALMOST", accent: "READY" },
];

const CartoonStarLoader = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % LOADING_TEXTS.length), 2400);
    return () => clearInterval(t);
  }, []);
  const current = LOADING_TEXTS[idx];
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5">
      <motion.svg width="36" height="36" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
        animate={{ y: [0, -8, 0], rotate: [0, 180, 360], scale: [1, 1.2, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M50 5 L60 40 L95 50 L60 60 L50 95 L40 60 L5 50 L40 40 Z" fill="url(#cartoonStarGrad)" />
        <defs>
          <linearGradient id="cartoonStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </motion.svg>
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-center">
          <p className="text-2xl font-black text-foreground">{current.text}</p>
          <p className="text-2xl font-black bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">{current.accent}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const CartoonPage = () => {
  const navigate = useNavigate();
  const { hasEnoughCredits } = useCredits();
  const [step, setStep] = useState<Step>("landing");
  const [image, setImage] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ToolTemplate | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const { templates } = useToolTemplates("cartoon");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLandingUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { setImage(reader.result as string); setStep("templates"); };
    reader.readAsDataURL(file);
  };

  const handleTemplateSelect = (t: ToolTemplate) => { setSelectedTemplate(t); };

  const handleGenerate = async () => {
    if (!image) { toast.error("Please upload a photo"); return; }
    const prompt = selectedTemplate?.prompt || customPrompt || "Cartoonify this photo";
    if (!hasEnoughCredits(1)) { toast.error("Insufficient MC"); navigate("/pricing"); return; }
    setStep("generating");
    try {
      const { data, error } = await supabase.functions.invoke("image-tools", { body: { tool: "cartoon", image, prompt } });
      if (error) throw error;
      if (data?.url) { setResultUrl(data.url); setStep("result"); }
      else throw new Error(data?.error || "Failed");
    } catch (e: any) { toast.error(e.message || "Failed"); setStep("templates"); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <button onClick={() => navigate("/images")} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-base font-semibold text-foreground flex-1">Cartoon</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SilkyToolLanding toolId="cartoon" onStart={handleLandingUpload} />
            </motion.div>
          )}

          {step === "templates" && (
            <motion.div key="templates" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 py-4 pb-32 space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-border/30"><img src={image!} alt="" className="w-full h-40 object-cover" /></div>
              <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Describe the cartoon style you want..." className="w-full rounded-2xl border border-border/50 bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
              {templates.length > 0 && <TemplateGrid templates={templates} onSelect={handleTemplateSelect} hideNames />}
            </motion.div>
          )}

          {step === "generating" && (
            <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-[50vh]">
              <CartoonStarLoader />
            </motion.div>
          )}

          {step === "result" && resultUrl && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-4 space-y-4">
              <div className="rounded-2xl overflow-hidden border border-border/20"><img src={resultUrl} alt="Result" className="w-full" /></div>
              <div className="flex gap-3">
                <button onClick={() => { const a = document.createElement("a"); a.href = resultUrl; a.download = "cartoon-result.png"; a.click(); }} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-medium text-sm"><Download className="w-4 h-4" /> Download</button>
                <button onClick={() => { navigator.clipboard.writeText(resultUrl); toast.success("Link copied!"); }} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent text-foreground font-medium text-sm"><Share2 className="w-4 h-4" /> Share</button>
              </div>
              <button onClick={() => { setResultUrl(null); setStep("templates"); setSelectedTemplate(null); }} className="w-full py-3 rounded-2xl bg-accent/50 text-foreground text-sm font-medium">Try Again</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {step === "templates" && (selectedTemplate || customPrompt.trim()) && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50 z-20 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleGenerate} className="w-full py-3.5 rounded-2xl bg-yellow-500 text-black font-bold text-sm flex items-center justify-center shadow-lg shadow-yellow-500/20">Generate · 1 MC</motion.button>
        </div>
      )}
    </div>
  );
};
export default CartoonPage;
