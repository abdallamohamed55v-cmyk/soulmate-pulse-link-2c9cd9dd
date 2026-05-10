import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Download, Share2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import { CLOTHES_STYLES, FOOTBALL_CLUBS, getFootballPrompt } from "@/lib/imageToolsData";
import { useToolTemplates } from "@/hooks/useToolTemplates";
import { SilkyToolLanding } from "@/components/ToolPageLayout";
import type { ToolTemplate } from "@/components/ToolPageLayout";

type Step = 'landing' | 'styles' | 'clubs' | 'generating' | 'result';

const ClothesChangerPage = () => {
  const navigate = useNavigate();
  const { hasEnoughCredits } = useCredits();
  const [step, setStep] = useState<Step>('landing');
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState<typeof FOOTBALL_CLUBS[0] | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [refImage, setRefImage] = useState<string | null>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const { templates } = useToolTemplates("clothes-changer");

  const handleLandingUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { setImage(reader.result as string); setStep('styles'); };
    reader.readAsDataURL(file);
  };

  const handleStyleSelect = (styleId: string) => {
    setSelectedStyle(styleId);
    if (styleId === 'football') setStep('clubs');
    else if (styleId === 'blank') setCustomPrompt("");
    else handleGenerate(CLOTHES_STYLES.find(s => s.id === styleId)?.prompt || '');
  };
  const handleClubSelect = (club: typeof FOOTBALL_CLUBS[0]) => { setSelectedClub(club); handleGenerate(getFootballPrompt(club)); };
  const handleTemplateSelect = (t: ToolTemplate) => { if (t.prompt) handleGenerate(t.prompt); };

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRefImage(reader.result as string);
    reader.readAsDataURL(file); e.target.value = "";
  };

  const handleGenerate = async (prompt?: string) => {
    const finalPrompt = prompt || customPrompt;
    if (!image) { toast.error("Please upload your photo"); return; }
    if (!finalPrompt) { toast.error("Please enter a description"); return; }
    if (!hasEnoughCredits(4)) { toast.error("Insufficient MC"); navigate("/pricing"); return; }
    setStep('generating');
    try {
      const { data, error } = await supabase.functions.invoke("image-tools", { body: { tool: "clothes-changer", image, prompt: finalPrompt } });
      if (error) throw error;
      if (data?.url) { setResultUrl(data.url); setStep('result'); }
      else throw new Error(data?.error || "Failed");
    } catch (e: any) { toast.error(e.message || "Failed"); setStep('styles'); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <button onClick={() => navigate("/images")} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-base font-semibold text-foreground flex-1">Clothes Changer</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SilkyToolLanding toolId="clothes-changer" onStart={handleLandingUpload} />
            </motion.div>
          )}

          {step === 'styles' && (
            <motion.div key="styles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 py-4 pb-32 space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-border/30"><img src={image!} alt="" className="w-full h-40 object-cover" /></div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleStyleSelect('blank')} className="w-full rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center hover:border-primary/50 transition-colors">
                <p className="text-sm font-semibold text-primary">Custom Style</p>
                <p className="text-xs text-muted-foreground mt-0.5">Create your own look</p>
              </motion.button>
              {selectedStyle === 'blank' && (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-card/80 border border-border/20 p-3">
                    <div className="flex items-center gap-2">
                      <input ref={refInputRef as any} type="file" accept="image/*" className="hidden" onChange={handleRefUpload} />
                      <button onClick={() => refInputRef.current?.click()} className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50"><Plus className="w-5 h-5" /></button>
                      <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Describe the outfit..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 resize-none min-h-[80px] focus:outline-none py-2" />
                    </div>
                  </div>
                  {refImage && (
                    <div className="flex items-center gap-2">
                      <img src={refImage} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      <span className="text-xs text-muted-foreground flex-1">Reference attached</span>
                      <button onClick={() => setRefImage(null)} className="text-xs text-destructive">Remove</button>
                    </div>
                  )}
                </div>
              )}
              {templates.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {templates.map(t => (
                    <motion.button key={t.id} whileTap={{ scale: 0.97 }} onClick={() => handleTemplateSelect(t)} className="rounded-2xl overflow-hidden border border-border/20 bg-card text-left">
                      {t.preview_url ? <img src={t.preview_url} alt={t.name} className="w-full h-36 object-cover" /> : <div className="w-full h-36 bg-gradient-to-br from-primary/10 to-accent/20 flex items-center justify-center"><Sparkles className="w-8 h-8 text-muted-foreground/20" /></div>}
                      <div className="p-2.5"><p className="text-sm font-medium text-foreground">{t.name}</p></div>
                    </motion.button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {CLOTHES_STYLES.filter(s => s.id !== 'blank').map((style) => (
                  <motion.button key={style.id} whileTap={{ scale: 0.97 }} onClick={() => handleStyleSelect(style.id)} className="rounded-2xl overflow-hidden border border-border/50 bg-card text-left">
                    {style.previewUrl ? <img src={style.previewUrl} alt={style.name} className="w-full h-36 object-cover" /> : <div className="w-full h-36 bg-accent flex items-center justify-center"><Sparkles className="w-8 h-8 text-muted-foreground" /></div>}
                    <div className="p-2.5"><p className="text-sm font-medium text-foreground">{style.name}</p></div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'clubs' && (
            <motion.div key="clubs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 py-4 space-y-2">
              <p className="text-sm font-medium text-foreground mb-3">Select a club</p>
              <div className="grid grid-cols-2 gap-2">
                {FOOTBALL_CLUBS.map((club) => (
                  <button key={club.name} onClick={() => handleClubSelect(club)} className="px-3 py-2.5 rounded-xl text-left text-sm bg-card border border-border/50 hover:border-primary/50 transition-colors">
                    <p className="font-medium text-foreground">{club.name}</p>
                    <p className="text-xs text-muted-foreground">{club.colors}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'generating' && (
            <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
              <motion.div animate={{ rotate: 360, scale: [1, 1.2, 1] }} transition={{ rotate: { duration: 2, repeat: Infinity, ease: "linear" }, scale: { duration: 1, repeat: Infinity } }} className="relative">
                <Sparkles className="w-12 h-12 text-yellow-400" />
              </motion.div>
              <p className="text-sm text-muted-foreground animate-pulse">Generating...</p>
            </motion.div>
          )}

          {step === 'result' && resultUrl && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-4 space-y-4">
              <div className="rounded-2xl overflow-hidden border border-border/20"><img src={resultUrl} alt="Result" className="w-full" /></div>
              <div className="flex gap-3">
                <button onClick={() => { const a = document.createElement("a"); a.href = resultUrl; a.download = "clothes-result.png"; a.click(); }} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-medium text-sm"><Download className="w-4 h-4" /> Download</button>
                <button onClick={() => { navigator.clipboard.writeText(resultUrl); toast.success("Link copied!"); }} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent text-foreground font-medium text-sm"><Share2 className="w-4 h-4" /> Share</button>
              </div>
              <button onClick={() => { setResultUrl(null); setStep('styles'); }} className="w-full py-3 rounded-2xl bg-accent/50 text-foreground text-sm font-medium">Try Again</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {step === 'styles' && selectedStyle === 'blank' && customPrompt.trim() && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50 z-20 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleGenerate(customPrompt)} className="w-full py-3.5 rounded-2xl bg-yellow-500 text-black font-bold text-sm flex items-center justify-center shadow-lg shadow-yellow-500/20">Generate · 4 MC</motion.button>
        </div>
      )}
    </div>
  );
};
export default ClothesChangerPage;
