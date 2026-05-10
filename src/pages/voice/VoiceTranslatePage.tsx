import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Mic, Coins, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AppLayout from "@/layouts/AppLayout";
import VoiceStarLoader from "@/components/VoiceStarLoader";
import VoiceResultPlayer from "@/components/VoiceResultPlayer";
import { useCredits } from "@/hooks/useCredits";

const COST = 2;

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "ar", name: "Arabic" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "ru", name: "Russian" },
  { code: "hi", name: "Hindi" },
  { code: "tr", name: "Turkish" },
];

const VoiceTranslatePage = () => {
  const navigate = useNavigate();
  const { credits, userId, hasEnoughCredits } = useCredits();
  const [step, setStep] = useState<"upload" | "language" | "confirm" | "loading" | "result">("upload");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState(LANGUAGES[0]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    setStep("language");
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
        setStep("language");
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
    if (!audioFile || !userId) return;
    if (!hasEnoughCredits(COST)) { toast.error("Not enough credits"); return; }

    setStep("loading");
    try {
      await supabase.functions.invoke("deduct-credits", {
        body: { user_id: userId, amount: COST, action_type: "voice_translate", description: "Voice Translation" }
      });

      const reader = new FileReader();
      reader.onload = async () => {
        const { data, error } = await supabase.functions.invoke("generate-voice", {
          body: {
            model_id: "voice-translate",
            prompt: reader.result,
            type: "tts",
            settings: { target_language: targetLang.code, voice: "nova" }
          },
        });
        if (error) throw error;
        if (data?.url) { setResultUrl(data.url); setStep("result"); toast.success("Voice translated!"); }
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
            <h2 className="text-xl font-bold text-foreground mb-2">Upload Voice to Translate</h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">Upload or record audio in any language to translate it</p>
            <button onClick={() => fileInputRef.current?.click()} className="w-full max-w-sm py-16 rounded-2xl border-2 border-dashed border-border/40 flex flex-col items-center gap-3 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
              <Upload className="w-8 h-8" />
              <p className="text-sm font-medium">Upload Audio File</p>
              <p className="text-xs text-muted-foreground/50">MP3, WAV, M4A, WebM</p>
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

      case "language":
        return (
          <div className="px-4 pt-4 space-y-4">
            <h2 className="text-lg font-bold text-foreground">Translate To</h2>
            <p className="text-sm text-muted-foreground">Choose the target language</p>
            <div className="grid grid-cols-2 gap-3">
              {LANGUAGES.map(lang => (
                <motion.button
                  key={lang.code}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setTargetLang(lang); setStep("confirm"); }}
                  className={`p-4 rounded-2xl border-2 text-left transition-colors ${targetLang.code === lang.code ? "border-primary bg-primary/5" : "border-border/20"}`}
                  style={{ background: targetLang.code === lang.code ? undefined : "hsl(var(--card))" }}
                >
                  <p className="text-sm font-medium text-foreground">{lang.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{lang.code.toUpperCase()}</p>
                </motion.button>
              ))}
            </div>
          </div>
        );

      case "confirm":
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Coins className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">Ready to Translate</h2>
              <p className="text-sm text-muted-foreground">Target: <span className="text-foreground font-medium">{targetLang.name}</span></p>
              <p className="text-2xl font-bold text-primary mt-4">{COST} MC</p>
              <p className="text-xs text-muted-foreground mt-1">Your balance: {credits ?? 0} MC</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleGenerate}
              className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-sm"
            >
              Start Translation
            </motion.button>
            <button onClick={() => setStep("language")} className="text-sm text-muted-foreground">Change language</button>
          </div>
        );

      case "loading":
        return <VoiceStarLoader text="Translating voice..." />;

      case "result":
        return (
          <div className="px-4 pt-4">
            {resultUrl && (
              <VoiceResultPlayer
                audioUrl={resultUrl}
                title="Translated Voice"
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
          <button onClick={() => step === "upload" ? navigate("/voice") : setStep("upload")} className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-foreground">Voice Translation</h1>
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

export default VoiceTranslatePage;
