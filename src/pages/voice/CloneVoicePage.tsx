import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Mic, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AppLayout from "@/layouts/AppLayout";
import VoiceStarLoader from "@/components/VoiceStarLoader";
import VoiceResultPlayer from "@/components/VoiceResultPlayer";
import { useCredits } from "@/hooks/useCredits";

const COST = 2;

const CloneVoicePage = () => {
  const navigate = useNavigate();
  const { credits, userId, hasEnoughCredits } = useCredits();
  const [step, setStep] = useState<"upload" | "text" | "confirm" | "loading" | "result">("upload");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    setStep("text");
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "recording.webm", { type: "audio/webm" });
        setAudioFile(file);
        setStep("text");
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !audioFile || !userId) return;
    if (!hasEnoughCredits(COST)) { toast.error("Not enough credits"); return; }

    setStep("loading");
    try {
      await supabase.functions.invoke("deduct-credits", {
        body: { user_id: userId, amount: COST, action_type: "clone_voice", description: "Voice Cloning" }
      });

      const reader = new FileReader();
      reader.onload = async () => {
        const { data, error } = await supabase.functions.invoke("generate-voice", {
          body: { model_id: "qwen3-tts-clone", prompt: prompt.trim(), type: "tts", settings: { voice_sample: reader.result } },
        });
        if (error) throw error;
        if (data?.url) { setResultUrl(data.url); setStep("result"); toast.success("Voice cloned!"); }
        else { toast.error("No audio returned"); setStep("confirm"); }
      };
      reader.readAsDataURL(audioFile);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      setStep("confirm");
    }
  };

  const renderStep = () => {
    switch (step) {
      case "upload":
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
            <h2 className="text-xl font-bold text-foreground mb-2">Upload Voice Sample</h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">Upload a clear audio sample (10+ seconds) of the voice you want to clone</p>
            <button onClick={() => fileInputRef.current?.click()} className="w-full max-w-sm py-16 rounded-2xl border-2 border-dashed border-border/40 flex flex-col items-center gap-3 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
              <Upload className="w-8 h-8" />
              <p className="text-sm font-medium">Upload Voice Sample (10s+)</p>
              <p className="text-xs text-muted-foreground/50">MP3, WAV, M4A</p>
            </button>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-full max-w-sm py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium ${isRecording ? "bg-red-500/20 text-red-400" : "bg-accent/30 text-foreground"}`}
            >
              <Mic className={`w-4 h-4 ${isRecording ? "animate-pulse" : ""}`} />
              {isRecording ? "Stop Recording" : "Record Audio"}
            </button>
            <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
          </div>
        );

      case "text":
        return (
          <div className="px-4 pt-4 space-y-4">
            <h2 className="text-lg font-bold text-foreground">What should the clone say?</h2>
            <p className="text-sm text-muted-foreground">Enter the text you want spoken in the cloned voice</p>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Type or paste your text here..."
              rows={6}
              className="w-full rounded-2xl border border-border/30 bg-card/50 p-4 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none resize-none"
            />
            {prompt.trim() && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setStep("confirm")}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-blue-500 text-white font-bold text-sm"
              >
                Next
              </motion.button>
            )}
          </div>
        );

      case "confirm":
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Coins className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">Ready to Clone</h2>
              <p className="text-sm text-muted-foreground max-w-xs">"{prompt.slice(0, 80)}{prompt.length > 80 ? "..." : ""}"</p>
              <p className="text-2xl font-bold text-primary mt-4">{COST} MC</p>
              <p className="text-xs text-muted-foreground mt-1">Your balance: {credits ?? 0} MC</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleGenerate}
              className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-blue-500 text-white font-bold text-sm"
            >
              Start Cloning
            </motion.button>
            <button onClick={() => setStep("text")} className="text-sm text-muted-foreground">Edit text</button>
          </div>
        );

      case "loading":
        return <VoiceStarLoader />;

      case "result":
        return (
          <div className="px-4 pt-4">
            {resultUrl && (
              <VoiceResultPlayer
                audioUrl={resultUrl}
                title="Cloned Voice"
                onGenerateMore={() => navigate("/voice")}
              />
            )}
          </div>
        );
    }
  };

  return (
    <AppLayout onSelectConversation={() => {}} onNewChat={() => {}} activeConversationId={null}>
      <div className="h-full flex flex-col bg-background">
        <div className="sticky top-0 z-10 px-4 py-3 bg-background/80 backdrop-blur-xl flex items-center gap-3">
          <button onClick={() => {
            if (step === "upload") navigate("/voice");
            else if (step === "text") setStep("upload");
            else if (step === "confirm") setStep("text");
            else navigate("/voice");
          }} className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-foreground">Clone Voice</h1>
        </div>
        <div className="flex-1 overflow-y-auto pb-8">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
};

export default CloneVoicePage;
