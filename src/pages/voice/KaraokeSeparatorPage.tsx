import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AppLayout from "@/layouts/AppLayout";
import VoiceStarLoader from "@/components/VoiceStarLoader";
import VoiceResultPlayer from "@/components/VoiceResultPlayer";
import { useCredits } from "@/hooks/useCredits";

const COST = 3;

const KaraokeSeparatorPage = () => {
  const navigate = useNavigate();
  const { credits, userId, hasEnoughCredits } = useCredits();
  const [step, setStep] = useState<"upload" | "confirm" | "loading" | "result">("upload");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    setStep("confirm");
  };

  const handleGenerate = async () => {
    if (!audioFile || !userId) return;
    if (!hasEnoughCredits(COST)) { toast.error("Not enough credits"); return; }
    setStep("loading");
    try {
      await supabase.functions.invoke("deduct-credits", {
        body: { user_id: userId, amount: COST, action_type: "karaoke_separator", description: "Karaoke Separation" },
      });
      const reader = new FileReader();
      reader.onload = async () => {
        const { data, error } = await supabase.functions.invoke("generate-voice", {
          body: { model_id: "music-separator", prompt: reader.result, type: "separate", settings: {} },
        });
        if (error) throw error;
        if (data?.url) { setResultUrl(data.url); setStep("result"); toast.success("Separation complete!"); }
        else { toast.error("Failed"); setStep("confirm"); }
      };
      reader.readAsDataURL(audioFile);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); setStep("confirm"); }
  };

  const renderStep = () => {
    switch (step) {
      case "upload":
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
            <h2 className="text-xl font-bold text-foreground mb-2">AI Karaoke Separator</h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">Separate vocals from music in any audio track</p>
            <button onClick={() => fileInputRef.current?.click()} className="w-full max-w-sm py-16 rounded-2xl border-2 border-dashed border-border/40 flex flex-col items-center gap-3 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
              <Upload className="w-8 h-8" />
              <p className="text-sm font-medium">Upload Audio</p>
              <p className="text-xs text-muted-foreground/50">MP3, WAV, M4A</p>
            </button>
            <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
          </div>
        );
      case "confirm":
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"><Coins className="w-8 h-8 text-primary" /></div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">Ready to Separate</h2>
              <p className="text-sm text-muted-foreground">File: {audioFile?.name}</p>
              <p className="text-2xl font-bold text-primary mt-4">{COST} MC</p>
              <p className="text-xs text-muted-foreground mt-1">Your balance: {credits ?? 0} MC</p>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleGenerate} className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-blue-500 text-white font-bold text-sm">Separate Tracks</motion.button>
            <button onClick={() => setStep("upload")} className="text-sm text-muted-foreground">Change file</button>
          </div>
        );
      case "loading": return <VoiceStarLoader text="Separating vocals from music..." />;
      case "result":
        return (
          <div className="px-4 pt-4">
            {resultUrl && <VoiceResultPlayer audioUrl={resultUrl} title="Separated Audio" onGenerateMore={() => navigate("/voice")} />}
          </div>
        );
    }
  };

  return (
    <AppLayout onSelectConversation={() => {}} onNewChat={() => {}} activeConversationId={null}>
      <div className="h-full flex flex-col bg-background">
        <div className="sticky top-0 z-10 px-4 py-3 bg-background/80 backdrop-blur-xl flex items-center gap-3">
          <button onClick={() => step === "upload" ? navigate("/voice") : setStep("upload")} className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-base font-bold text-foreground">Karaoke Separator</h1>
        </div>
        <div className="flex-1 overflow-y-auto pb-8">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>{renderStep()}</motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
};
export default KaraokeSeparatorPage;
