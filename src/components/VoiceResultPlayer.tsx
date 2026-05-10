import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Download, Share2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface VoiceResultPlayerProps {
  audioUrl: string;
  title?: string;
  onGenerateMore?: () => void;
}

const VoiceResultPlayer = ({ audioUrl, title = "Generated Audio", onGenerateMore }: VoiceResultPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => { setProgress(audio.currentTime); };
    const onLoaded = () => { setDuration(audio.duration); };
    const onEnded = () => { setIsPlaying(false); };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audioUrl]);

  // Simple waveform animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const bars = 40;
      const barW = w / bars - 2;
      for (let i = 0; i < bars; i++) {
        const amp = isPlaying
          ? Math.abs(Math.sin(frame * 0.03 + i * 0.5)) * 0.6 + 0.15
          : 0.1 + Math.sin(i * 0.3) * 0.05;
        const barH = h * amp;
        const x = i * (barW + 2);
        const gradient = ctx.createLinearGradient(x, h / 2 - barH / 2, x, h / 2 + barH / 2);
        gradient.addColorStop(0, "rgba(139,92,246,0.8)");
        gradient.addColorStop(1, "rgba(59,130,246,0.5)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, h / 2 - barH / 2, barW, barH, 2);
        ctx.fill();
      }
      frame++;
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = ratio * duration;
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(audioUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${title}.mp3`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Download failed"); }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(audioUrl);
    toast.success("Link copied!");
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Waveform visualization */}
      <div className="rounded-2xl overflow-hidden bg-card/30 border border-border/10 p-4">
        <canvas ref={canvasRef} width={400} height={80} className="w-full h-20" />
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div
          onClick={handleSeek}
          className="w-full h-3 rounded-full bg-muted/30 cursor-pointer relative overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-100"
            style={{ width: duration ? `${(progress / duration) * 100}%` : "0%" }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{fmt(progress)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      {/* Play/Pause button */}
      <div className="flex justify-center">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={togglePlay}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 flex items-center justify-center text-white shadow-lg"
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
        </motion.button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button onClick={handleDownload} className="flex-1 py-3 rounded-2xl bg-primary/10 text-primary font-medium text-sm flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Download
        </button>
        <button onClick={handleShare} className="flex-1 py-3 rounded-2xl bg-accent/50 text-foreground font-medium text-sm flex items-center justify-center gap-2">
          <Share2 className="w-4 h-4" /> Share
        </button>
      </div>

      {onGenerateMore && (
        <button onClick={onGenerateMore} className="w-full py-3 rounded-2xl border border-border/30 text-muted-foreground text-sm flex items-center justify-center gap-2 hover:text-foreground transition-colors">
          Generate More <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default VoiceResultPlayer;
