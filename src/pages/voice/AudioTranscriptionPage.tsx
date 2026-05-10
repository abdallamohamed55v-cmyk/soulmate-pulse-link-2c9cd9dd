import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Coins, Copy, Download, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AppLayout from "@/layouts/AppLayout";
import VoiceStarLoader from "@/components/VoiceStarLoader";
import { useCredits } from "@/hooks/useCredits";

const COST = 1;

const AudioTranscriptionPage = () => {
  const navigate = useNavigate();
  const { credits, userId, hasEnoughCredits } = useCredits();
  const [step, setStep] = useState<"upload" | "confirm" | "loading" | "result">("upload");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [copied, setCopied] = useState(false);
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
        body: { user_id: userId, amount: COST, action_type: "audio_transcription", description: "Audio Transcription" },
      });
      const reader = new FileReader();
      reader.onload = async () => {
        const { data, error } = await supabase.functions.invoke("generate-voice", {
          body: { model_id: "transcription", prompt: reader.result, type: "transcribe", settings: {} },
        });
        if (error) throw error;
        if (data?.text || data?.transcript) {
          setTranscript(data.text || data.transcript);
          setStep("result");
          toast.success("Transcription complete!");
        } else { toast.error("Failed"); setStep("confirm"); }
      };
      reader.readAsDataURL(audioFile);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); setStep("confirm"); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied!");
  };

  const handleDownload = () => {
    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "transcript.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const renderStep = () => {
    switch (step) {
      case "upload":
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
            <h2 className="text-xl font-bold text-foreground mb-2">AI Audio Transcription</h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">Transcribe meetings, lectures, and conversations with AI</p>
            <button onClick={() => fileInputRef.current?.click()} className="w-full max-w-sm py-16 rounded-2xl border-2 border-dashed border-border/40 flex flex-col items-center gap-3 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
              <Upload className="w-8 h-8" />
              <p className="text-sm font-medium">Upload Audio or Video</p>
              <p className="text-xs text-muted-foreground/50">MP3, WAV, MP4, M4A</p>
            </button>
            <input ref={fileInputRef} type="file" accept="audio/*,video/*" className="hidden" onChange={handleFileUpload} />
          </div>
        );
      case "confirm":
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"><Coins className="w-8 h-8 text-primary" /></div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">Ready to Transcribe</h2>
              <p className="text-sm text-muted-foreground">File: {audioFile?.name}</p>
              <p className="text-2xl font-bold text-primary mt-4">{COST} MC/min</p>
              <p className="text-xs text-muted-foreground mt-1">Your balance: {credits ?? 0} MC</p>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleGenerate} className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-blue-500 text-white font-bold text-sm">Transcribe</motion.button>
            <button onClick={() => setStep("upload")} className="text-sm text-muted-foreground">Change file</button>
          </div>
        );
      case "loading": return <VoiceStarLoader text="Transcribing audio..." />;
      case "result":
        return (
          <div className="px-4 pt-4 space-y-4">
            <div className="rounded-2xl bg-accent/30 border border-border/30 p-4 max-h-[50vh] overflow-y-auto">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed" dir="auto">{transcript}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-medium text-sm">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copied" : "Copy"}
              </button>
              <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent text-foreground font-medium text-sm">
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
            <button onClick={() => { setStep("upload"); setTranscript(""); setAudioFile(null); }} className="w-full py-3 rounded-2xl bg-accent/50 text-foreground text-sm font-medium">Transcribe Another</button>
          </div>
        );
    }
  };

  return (
    <AppLayout onSelectConversation={() => {}} onNewChat={() => {}} activeConversationId={null}>
      <div className="h-full flex flex-col bg-background">
        <div className="sticky top-0 z-10 px-4 py-3 bg-background/80 backdrop-blur-xl flex items-center gap-3">
          <button onClick={() => step === "upload" ? navigate("/voice") : setStep("upload")} className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-base font-bold text-foreground">Audio Transcription</h1>
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
export default AudioTranscriptionPage;
