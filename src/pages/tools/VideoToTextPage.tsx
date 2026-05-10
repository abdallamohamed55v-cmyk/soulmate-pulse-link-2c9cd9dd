import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, FileText, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AppLayout from "@/layouts/AppLayout";

const VideoToTextPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [transcription, setTranscription] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleTranscribe = async () => {
    if (!file && !url.trim()) { toast.error("Upload a file or paste a URL"); return; }
    setLoading(true);
    try {
      let inputUrl = url.trim();
      if (file) {
        // Upload to storage first
        const path = `transcribe/${Date.now()}-${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("model-media").upload(path, file);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("model-media").getPublicUrl(path);
        inputUrl = urlData.publicUrl;
      }
      const { data, error } = await supabase.functions.invoke("video-tools", {
        body: { action: "transcribe", url: inputUrl },
      });
      if (error) throw error;
      setTranscription(data?.text || data?.transcription || JSON.stringify(data));
      toast.success("Transcription complete");
    } catch (e: any) {
      toast.error(e.message || "Transcription failed");
    }
    setLoading(false);
  };

  return (
    <AppLayout onSelectConversation={() => {}} onNewChat={() => {}} activeConversationId={null}>
      <div className="h-full flex flex-col bg-background">
        <div className="sticky top-0 z-10 px-4 py-3 bg-background/80 backdrop-blur-xl flex items-center gap-3">
          <button onClick={() => navigate("/videos")} className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-base font-bold text-foreground">Video to Text</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8">
          <div className="max-w-lg mx-auto pt-4 space-y-4">
            <p className="text-sm text-muted-foreground">Transcribe videos and audio to text. Supports 99 languages with auto-detection. YouTube, TikTok, X URLs supported.</p>

            {/* URL input */}
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Paste video/audio URL (YouTube, TikTok, etc.)"
              className="w-full bg-card border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/30"
            />

            <div className="text-center text-xs text-muted-foreground">or</div>

            {/* File upload */}
            <input ref={fileRef} type="file" accept="video/*,audio/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            <button onClick={() => fileRef.current?.click()} className="w-full py-4 rounded-2xl border-2 border-dashed border-border/50 bg-card/50 text-sm text-muted-foreground hover:border-primary/30 transition-colors flex flex-col items-center gap-2">
              <Upload className="w-5 h-5" />
              {file ? file.name : "Upload video or audio file"}
            </button>

            <button onClick={handleTranscribe} disabled={loading || (!file && !url.trim())} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {loading ? "Transcribing..." : "Transcribe"}
            </button>

            <p className="text-xs text-muted-foreground text-center">1 MC per minute</p>

            {transcription && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-foreground">Result</p>
                  <button onClick={() => { navigator.clipboard.writeText(transcription); toast.success("Copied"); }} className="text-xs text-primary font-medium">Copy</button>
                </div>
                <div className="bg-card border border-border/30 rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                  {transcription}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default VideoToTextPage;
