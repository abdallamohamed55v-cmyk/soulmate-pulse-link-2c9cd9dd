import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, Check, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AppLayout from "@/layouts/AppLayout";
import VoiceStarLoader from "@/components/VoiceStarLoader";
import VoiceResultPlayer from "@/components/VoiceResultPlayer";
import { useCredits } from "@/hooks/useCredits";

const COST = 1;

const TTSPage = () => {
  const navigate = useNavigate();
  const { credits, userId, hasEnoughCredits } = useCredits();
  const [step, setStep] = useState<"select-voice" | "text" | "confirm" | "loading" | "result">("select-voice");
  const [voices, setVoices] = useState<any[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<any>(null);
  const [prompt, setPrompt] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    supabase.from("tts_voices").select("*").eq("is_active", true).order("display_order").then(({ data }) => {
      if (data) setVoices(data);
    });
  }, []);

  const togglePreview = (v: any) => {
    if (playingId === v.id) { audioRef.current?.pause(); setPlayingId(null); }
    else if (audioRef.current) { audioRef.current.src = v.preview_audio_url; audioRef.current.play(); setPlayingId(v.id); }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedVoice || !userId) return;
    if (!hasEnoughCredits(COST)) { toast.error("Not enough credits"); return; }

    setStep("loading");
    try {
      await supabase.functions.invoke("deduct-credits", {
        body: { user_id: userId, amount: COST, action_type: "tts", description: "Text to Speech" }
      });

      const { data, error } = await supabase.functions.invoke("generate-voice", {
        body: { model_id: "kokoro", prompt: prompt.trim(), type: "tts", settings: { voice: selectedVoice.voice_id || "nova" } },
      });
      if (error) throw error;
      if (data?.url) { setResultUrl(data.url); setStep("result"); toast.success("Speech generated!"); }
      else { toast.error("No audio returned"); setStep("confirm"); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      setStep("confirm");
    }
  };

  const renderStep = () => {
    switch (step) {
      case "select-voice":
        return (
          <div className="px-4 pt-4">
            <h2 className="text-lg font-bold text-foreground mb-1">Choose a Voice</h2>
            <p className="text-sm text-muted-foreground mb-4">Select the voice for your speech</p>
            <div className="grid grid-cols-2 gap-3">
              {voices.map((v) => (
                <motion.button
                  key={v.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setSelectedVoice(v); setStep("text"); }}
                  className={`relative rounded-2xl overflow-hidden text-left p-4 border-2 transition-colors ${selectedVoice?.id === v.id ? "border-primary" : "border-border/20"}`}
                  style={{ background: "hsl(var(--card))" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">{v.name}</p>
                    {selectedVoice?.id === v.id && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); togglePreview(v); }} className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground">
                    {playingId === v.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                </motion.button>
              ))}
            </div>
            {voices.length === 0 && <p className="text-center text-muted-foreground/50 py-12 text-sm">No voices available yet</p>}
          </div>
        );

      case "text":
        return (
          <div className="px-4 pt-4 space-y-4">
            <div className="px-3 py-2 rounded-xl bg-accent/30 text-xs text-muted-foreground">
              Voice: <span className="text-foreground font-medium">{selectedVoice?.name}</span>
            </div>
            <h2 className="text-lg font-bold text-foreground">Enter Your Text</h2>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Type the text you want to convert to speech..."
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
              <h2 className="text-xl font-bold text-foreground mb-2">Ready to Generate</h2>
              <p className="text-sm text-muted-foreground">Voice: {selectedVoice?.name}</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">"{prompt.slice(0, 80)}{prompt.length > 80 ? "..." : ""}"</p>
              <p className="text-2xl font-bold text-primary mt-4">{COST} MC</p>
              <p className="text-xs text-muted-foreground mt-1">Your balance: {credits ?? 0} MC</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleGenerate}
              className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-blue-500 text-white font-bold text-sm"
            >
              Start Generation
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
                title="Text to Speech"
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
            if (step === "select-voice") navigate("/voice");
            else if (step === "text") setStep("select-voice");
            else if (step === "confirm") setStep("text");
            else navigate("/voice");
          }} className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-foreground">Text to Speech</h1>
        </div>
        <div className="flex-1 overflow-y-auto pb-8">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
        <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />
      </div>
    </AppLayout>
  );
};

export default TTSPage;
