import { useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Download, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCredits } from "@/hooks/useCredits";
import { TemplateGrid, SilkyToolLanding } from "@/components/ToolPageLayout";
import { useToolTemplates } from "@/hooks/useToolTemplates";
import type { ToolTemplate } from "@/components/ToolPageLayout";

type Step = "landing" | "templates" | "custom" | "generating" | "result";

const HairChangerPage = () => {
  const navigate = useNavigate();
  const { hasEnoughCredits } = useCredits();
  const [step, setStep] = useState<Step>("landing");
  const [image, setImage] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ToolTemplate | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const { templates } = useToolTemplates("hair-changer");

  const handleLandingUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { setImage(reader.result as string); setStep("templates"); };
    reader.readAsDataURL(file);
  };

  const handleTemplateSelect = (t: ToolTemplate) => { setSelectedTemplate(t); };

  const handleGenerate = async () => {
    if (!image) { toast.error("Please upload a photo"); return; }
    const prompt = selectedTemplate?.prompt || customPrompt || "Change hairstyle";
    if (!hasEnoughCredits(1)) { toast.error("Insufficient MC"); navigate("/pricing"); return; }
    setStep("generating");
    try {
      const { data, error } = await supabase.functions.invoke("image-tools", { body: { tool: "hair-changer", image, prompt } });
      if (error) throw error;
      if (data?.url) { setResultUrl(data.url); setStep("result"); }
      else throw new Error(data?.error || "Failed");
    } catch (e: any) { toast.error(e.message || "Failed"); setStep("templates"); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <button onClick={() => navigate("/images")} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-base font-semibold text-foreground flex-1">Hair Changer</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SilkyToolLanding toolId="hair-changer" onStart={handleLandingUpload} />
            </motion.div>
          )}

          {step === "templates" && (
            <motion.div key="templates" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 py-4 pb-32 space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-border/30"><img src={image!} alt="" className="w-full h-40 object-cover" /></div>
              {templates.length > 0 ? (
                <TemplateGrid templates={templates} onSelect={handleTemplateSelect} onCustom={() => setStep("custom")} customLabel="Custom Hairstyle" />
              ) : (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep("custom")} className="w-full rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center hover:border-primary/50 transition-colors">
                  <p className="text-sm font-semibold text-primary">Custom Hairstyle</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Describe the hairstyle you want</p>
                </motion.button>
              )}
            </motion.div>
          )}

          {step === "custom" && (
            <motion.div key="custom" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 py-4 pb-32 space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-border/30"><img src={image!} alt="" className="w-full h-40 object-cover" /></div>
              <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Describe the hairstyle you want... (e.g., long blonde curly hair)" className="w-full rounded-2xl border border-border/50 bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </motion.div>
          )}

          {step === "generating" && (
            <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
              <motion.div animate={{ rotate: 360, scale: [1, 1.2, 1] }} transition={{ rotate: { duration: 2, repeat: Infinity, ease: "linear" }, scale: { duration: 1, repeat: Infinity } }} className="relative">
                <Sparkles className="w-12 h-12 text-yellow-400" />
              </motion.div>
              <p className="text-sm text-muted-foreground animate-pulse">Generating...</p>
            </motion.div>
          )}

          {step === "result" && resultUrl && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-4 space-y-4">
              <div className="rounded-2xl overflow-hidden border border-border/20"><img src={resultUrl} alt="Result" className="w-full" /></div>
              <div className="flex gap-3">
                <button onClick={() => { const a = document.createElement("a"); a.href = resultUrl; a.download = "hair-result.png"; a.click(); }} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-medium text-sm"><Download className="w-4 h-4" /> Download</button>
                <button onClick={() => { navigator.clipboard.writeText(resultUrl); toast.success("Link copied!"); }} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent text-foreground font-medium text-sm"><Share2 className="w-4 h-4" /> Share</button>
              </div>
              <button onClick={() => { setResultUrl(null); setStep("templates"); setSelectedTemplate(null); setCustomPrompt(""); }} className="w-full py-3 rounded-2xl bg-accent/50 text-foreground text-sm font-medium">Try Again</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {step === "templates" && selectedTemplate && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50 z-20 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleGenerate} className="w-full py-3.5 rounded-2xl bg-yellow-500 text-black font-bold text-sm flex items-center justify-center shadow-lg shadow-yellow-500/20">Generate · 1 MC</motion.button>
        </div>
      )}

      {step === "custom" && customPrompt.trim() && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50 z-20 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleGenerate} className="w-full py-3.5 rounded-2xl bg-yellow-500 text-black font-bold text-sm flex items-center justify-center shadow-lg shadow-yellow-500/20">Generate · 1 MC</motion.button>
        </div>
      )}
    </div>
  );
};
export default HairChangerPage;
