import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Share2, Play, Pause, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import "./VoiceCallLoader.css";

const LOADING_TEXTS = [
  { text: "COMPOSING", accent: "YOUR TRACK" },
  { text: "LAYERING", accent: "MELODIES" },
  { text: "MIXING", accent: "THE VIBE" },
  { text: "ADDING", accent: "HARMONIES" },
  { text: "TUNING", accent: "THE BASS" },
  { text: "CRAFTING", accent: "THE DROP" },
  { text: "BUILDING", accent: "THE BEAT" },
  { text: "POLISHING", accent: "THE MIX" },
  { text: "ADJUSTING", accent: "TEMPO" },
  { text: "FINISHING", accent: "TOUCHES" },
  { text: "RENDERING", accent: "AUDIO" },
  { text: "ALMOST", accent: "READY" },
];

const MusicPlayerPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [song, setSong] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number>();

  const taskId = searchParams.get("task_id");
  const keyId = searchParams.get("key_id");

  // Rotate loading text
  useEffect(() => {
    if (!isPolling) return;
    const t = setInterval(() => setLoadingIdx(i => (i + 1) % LOADING_TEXTS.length), 2400);
    return () => clearInterval(t);
  }, [isPolling]);

  // Load song data
  useEffect(() => {
    if (!id) return;
    if (id === "sample") {
      setSong({
        id: "sample",
        title: "Egypt — Beauty in Simplicity",
        prompt: "Cinematic ambient track inspired by Egyptian nights",
        audio_url: "/audio/sample-track.mp3",
        status: "completed",
      });
      return;
    }
    supabase
      .from("generated_songs")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setSong(data);
      });
  }, [id]);

  // Poll for completion if task_id is present
  useEffect(() => {
    if (!taskId || !keyId || !id) return;
    setIsPolling(true);

    let cancelled = false;
    const poll = async () => {
      for (let i = 0; i < 60; i++) {
        if (cancelled) return;
        await new Promise(r => setTimeout(r, 3000));
        try {
          const { data: pollData } = await supabase.functions.invoke("generate-voice", {
            body: { poll_task_id: taskId, poll_key_id: keyId },
          });
          if (pollData?.status === "completed" && pollData?.url) {
            // Update the song record
            await supabase.from("generated_songs").update({
              audio_url: pollData.url,
              status: "completed",
              title: pollData.title || song?.title,
            }).eq("id", id);
            setSong((prev: any) => ({ ...prev, audio_url: pollData.url, status: "completed", title: pollData.title || prev?.title }));
            setIsPolling(false);
            return;
          }
          if (pollData?.status === "failed") {
            toast.error(pollData.error || "Generation failed");
            setIsPolling(false);
            return;
          }
        } catch (e) {
          console.error("Poll error:", e);
        }
      }
      toast.error("Generation timed out");
      setIsPolling(false);
    };
    poll();
    return () => { cancelled = true; };
  }, [taskId, keyId, id]);

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0);
      animationRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  const togglePlay = () => {
    if (!audioRef.current || isPolling) return;
    if (isPlaying) {
      audioRef.current.pause();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    } else {
      audioRef.current.play();
      animationRef.current = requestAnimationFrame(updateProgress);
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = async () => {
    if (!song?.audio_url || song.audio_url === "pending") return;
    try {
      const response = await fetch(song.audio_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(song.title || "track").replace(/\s+/g, "-")}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback
      const a = document.createElement("a");
      a.href = song.audio_url;
      a.download = `${(song.title || "track").replace(/\s+/g, "-")}.mp3`;
      a.click();
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/voice/music/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const isReady = song?.status === "completed" && song?.audio_url && song.audio_url !== "pending";
  const loadingCurrent = LOADING_TEXTS[loadingIdx];

  if (!song) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background">
        <div className="loader-wrapper">
          <div className="loader" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-violet-950/40 via-background to-background" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate("/voice/music")}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="text-xs text-muted-foreground truncate flex-1">{song.title}</p>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        {/* Animated orb */}
        <div className="loader-wrapper" style={{ width: 200, height: 200 }}>
          <div
            className="loader"
            style={{
              animationDuration: isPolling ? "3s" : isPlaying ? "3s" : "8s",
              opacity: isPolling ? 0.7 : isPlaying ? 1 : 0.4,
            }}
          />
          {isReady && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={togglePlay}
              className="relative z-10 w-16 h-16 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 text-white" fill="white" />
              ) : (
                <Play className="w-7 h-7 text-white ml-1" fill="white" />
              )}
            </motion.button>
          )}
        </div>

        {/* Loading state or song info */}
        {isPolling ? (
          <div className="mt-8 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={loadingIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-center"
              >
                <p className="text-2xl font-black text-white">{loadingCurrent.text}</p>
                <p className="text-2xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  {loadingCurrent.accent}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <div className="mt-8 text-center space-y-2">
            <h2 className="text-lg font-bold text-foreground">{song.title}</h2>
            <p className="text-xs text-muted-foreground max-w-[280px] line-clamp-2">{song.prompt}</p>
          </div>
        )}

        {/* Progress bar - only show when ready */}
        {isReady && (
          <div className="w-full max-w-xs mt-8 space-y-3">
            <div
              className="w-full h-2 rounded-full bg-white/10 cursor-pointer"
              onClick={(e) => {
                if (!audioRef.current) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                audioRef.current.currentTime = pct * audioRef.current.duration;
              }}
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Play/Pause below progress */}
            <div className="flex items-center justify-center pt-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={togglePlay}
                className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white" fill="white" />
                ) : (
                  <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                )}
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      {isReady && (
        <div className="relative z-10 pb-12 px-6 flex items-center justify-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-sm text-foreground text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Download
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleShare}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-sm text-foreground text-sm font-medium"
          >
            <Share2 className="w-4 h-4" /> Share
          </motion.button>
        </div>
      )}

      {/* Hidden audio */}
      {isReady && (
        <audio
          ref={audioRef}
          src={song.audio_url}
          onLoadedMetadata={() => {
            if (audioRef.current) setDuration(audioRef.current.duration);
          }}
          onEnded={() => {
            setIsPlaying(false);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
          }}
        />
      )}
    </div>
  );
};

export default MusicPlayerPage;
