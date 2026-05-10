import { useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Download, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCredits } from "@/hooks/useCredits";
import { VideoUploadBox, ImageUploadBox, TemplateGrid, SilkyToolLanding } from "@/components/ToolPageLayout";
import { useToolTemplates } from "@/hooks/useToolTemplates";
import type { ToolTemplate } from "@/components/ToolPageLayout";

type Step = "landing" | "upload" | "templates" | "generating" | "result";

const VideoSwapPage = () => {
  const navigate = useNavigate();
  const { hasEnoughCredits } = useCredits();
  const [step, setStep] = useState<Step>("landing");
  const [video, setVideo] = useState<string | null>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const { templates } = useToolTemplates("swap-characters");
  const customInputRef = useRef<HTMLInputElement>(null);

  const cost = resolution === '720p' ? 4 : 5.5;

  const handleVideoUpload = (v: string) => { setVideo(v); setStep("templates"); };
  const handleTemplateSelect = (t: ToolTemplate) => { if (t.preview_url) setFaceImage(t.preview_url); };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFaceImage(reader.result as string);
    reader.readAsDataURL(file); e.target.value = "";
  };

  const handleGenerate = async () => {
    if (!video || !faceImage) { toast.error("Please upload both video and face image"); return; }
    if (!hasEnoughCredits(cost)) { toast.error("Insufficient MC"); navigate("/pricing"); return; }
    setStep("generating");
    try {
      const { data, error } = await supabase.functions.invoke("video-tools", { body: { tool: "swap-characters", video, image: faceImage, resolution } });
      if (error) throw error;
      if (data?.url) { setResultUrl(data.url); setStep("result"); }
      else throw new Error(data?.error || "Failed");
    } catch (e: any) { toast.error(e.message || "Failed"); setStep("templates"); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <button onClick={() => navigate("/videos")} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-base font-semibold text-foreground flex-1">Swap Characters</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SilkyToolLanding toolId="swap-characters" uploadLabel="Upload Your Video" onButtonClick={() => setStep("upload")} />
            </motion.div>
          )}

          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <VideoUploadBox label="Upload video" video={video} onUpload={handleVideoUpload} onClear={() => setVideo(null)} />
            </motion.div>
          )}

          {step === "templates" && (
            <motion.div key="templates" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 py-4 pb-32 space-y-4">
              <input ref={customInputRef} type="file" accept="image/*" className="hidden" onChange={handleCustomUpload} />
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => customInputRef.current?.click()} className="w-full rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center hover:border-primary/50 transition-colors">
                <p className="text-sm font-semibold text-primary">Upload Face Image</p>
                <p className="text-xs text-muted-foreground mt-0.5">Or choose from templates below</p>
              </motion.button>
              {faceImage && (
                <div className="flex items-center gap-3">
                  <img src={faceImage} alt="" className="w-16 h-16 rounded-xl object-cover" />
                  <span className="text-sm text-foreground flex-1">Face selected</span>
                  <button onClick={() => setFaceImage(null)} className="text-xs text-destructive">Remove</button>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Resolution</p>
                <div className="flex gap-2">
                  {(['720p', '1080p'] as const).map(r => (
                    <button key={r} onClick={() => setResolution(r)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${resolution === r ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground'}`}>{r}</button>
                  ))}
                </div>
              </div>
              {templates.length > 0 && <TemplateGrid templates={templates} onSelect={handleTemplateSelect} />}
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
              <div className="rounded-2xl overflow-hidden border border-border/20"><video src={resultUrl} controls autoPlay className="w-full" /></div>
              <div className="flex gap-3">
                <a href={resultUrl} download className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-medium text-sm"><Download className="w-4 h-4" /> Download</a>
                <button onClick={() => { navigator.clipboard.writeText(resultUrl); toast.success("Link copied!"); }} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent text-foreground font-medium text-sm"><Share2 className="w-4 h-4" /> Share</button>
              </div>
              <button onClick={() => { setResultUrl(null); setStep("templates"); setFaceImage(null); }} className="w-full py-3 rounded-2xl bg-accent/50 text-foreground text-sm font-medium">Try Again</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {step === "templates" && faceImage && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50 z-20 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleGenerate} className="w-full py-3.5 rounded-2xl bg-yellow-500 text-black font-bold text-sm flex items-center justify-center shadow-lg shadow-yellow-500/20">Generate · {cost} MC</motion.button>
        </div>
      )}
    </div>
  );
};
export default VideoSwapPage;
