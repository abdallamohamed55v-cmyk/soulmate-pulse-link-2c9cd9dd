import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCredits } from "@/hooks/useCredits";

const INTRO_STYLES = [
  { id: "cinematic", label: "Cinematic", prompt: "A cinematic logo reveal intro with epic lighting, lens flares, dark smoky atmosphere" },
  { id: "minimal", label: "Minimal", prompt: "A clean minimal logo animation on white background with elegant typography reveal" },
  { id: "tech", label: "Tech", prompt: "A futuristic tech intro with glitch effects, neon circuits, digital particles" },
  { id: "nature", label: "Nature", prompt: "An organic intro with flowing water, particles of light transforming into text" },
  { id: "fire", label: "Fire & Energy", prompt: "An explosive fire and energy intro with dramatic sparks and flames revealing text" },
  { id: "glass", label: "Glass", prompt: "A premium glass morphism intro with transparent 3D glass text, refractions and bokeh" },
];

const VideoIntroPage = () => {
  const navigate = useNavigate();
  const { hasEnoughCredits } = useCredits();
  const [brandName, setBrandName] = useState("");
  const [style, setStyle] = useState(INTRO_STYLES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!brandName.trim()) { toast.error("Enter your brand name"); return; }
    if (!hasEnoughCredits(5)) { toast.error("Insufficient credits"); return; }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("video-tools", {
        body: { tool: "video-intro", prompt: `${style.prompt}. The text "${brandName}" appears dramatically. 5 seconds, professional quality.`, duration: 5 },
      });
      if (error) throw error;
      if (data?.url) setResultUrl(data.url);
      else throw new Error(data?.error || "Failed");
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setIsGenerating(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <button onClick={() => navigate("/videos")} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-base font-semibold text-foreground flex-1">AI Video Intro</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-32 space-y-5">
        <AnimatePresence mode="wait">
          {resultUrl ? (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="rounded-2xl overflow-hidden border border-border/20"><video src={resultUrl} controls autoPlay className="w-full" /></div>
              <div className="flex gap-2">
                <button onClick={() => { const a = document.createElement("a"); a.href = resultUrl; a.download = "video-intro.mp4"; a.target = "_blank"; a.click(); }} className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-medium text-sm">Download</button>
                <button onClick={() => { navigator.clipboard.writeText(resultUrl); toast.success("Link copied!"); }} className="flex-1 py-3 rounded-2xl bg-accent text-foreground font-medium text-sm">Share</button>
              </div>
              <button onClick={() => setResultUrl(null)} className="w-full py-3 rounded-2xl bg-accent/50 text-foreground text-sm font-medium">Try Again</button>
            </motion.div>
          ) : isGenerating ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}><Sparkles className="w-10 h-10 text-primary" /></motion.div>
              <p className="text-sm text-muted-foreground animate-pulse">Creating your intro...</p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Brand / Channel Name</p>
                <input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Your brand name..." className="w-full px-4 py-3.5 rounded-xl bg-accent/30 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Intro Style</p>
                <div className="grid grid-cols-2 gap-2">
                  {INTRO_STYLES.map(s => (
                    <button key={s.id} onClick={() => setStyle(s)} className={`py-3 rounded-xl text-xs font-medium transition-all ${style.id === s.id ? "bg-primary text-primary-foreground" : "bg-accent/40 text-muted-foreground hover:bg-accent"}`}>{s.label}</button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!resultUrl && !isGenerating && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50 z-20 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleGenerate} disabled={!brandName.trim()} className="w-full py-3.5 rounded-2xl bg-yellow-500 text-black font-bold text-sm flex items-center justify-center disabled:opacity-40 shadow-lg shadow-yellow-500/20">Generate Intro · 5 MC</motion.button>
        </div>
      )}
    </div>
  );
};
export default VideoIntroPage;
