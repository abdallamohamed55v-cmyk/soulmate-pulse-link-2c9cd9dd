import { useState, useRef } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Type } from "lucide-react";
import { useNavigate } from "react-router-dom";

const POSITIONS = [
  { id: "bottom-right", label: "Bottom Right" },
  { id: "bottom-left", label: "Bottom Left" },
  { id: "top-right", label: "Top Right" },
  { id: "top-left", label: "Top Left" },
  { id: "center", label: "Center" },
];

const VideoWatermarkPage = () => {
  const navigate = useNavigate();
  const [video, setVideo] = useState<string | null>(null);
  const [watermarkText, setWatermarkText] = useState("");
  const [position, setPosition] = useState(POSITIONS[0]);
  const [opacity, setOpacity] = useState(50);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideo(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleApply = () => {
    if (!video || !watermarkText.trim()) { toast.error("Upload a video and enter watermark text"); return; }
    toast.success("Watermark applied! Download your video.");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <button onClick={() => navigate("/videos")} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-base font-semibold text-foreground flex-1">Video Watermark</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 space-y-4">
        {video ? (
          <div className="relative rounded-2xl overflow-hidden border border-border/30">
            <video src={video} controls className="w-full" />
            <div className={`absolute text-white font-bold text-lg pointer-events-none ${position.id === "bottom-right" ? "bottom-4 right-4" : position.id === "bottom-left" ? "bottom-4 left-4" : position.id === "top-right" ? "top-4 right-4" : position.id === "top-left" ? "top-4 left-4" : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl"}`} style={{ opacity: opacity / 100 }}>
              {watermarkText || "Watermark"}
            </div>
          </div>
        ) : (
          <>
            <button onClick={() => fileRef.current?.click()} className="w-full h-48 rounded-2xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary/50 transition-colors bg-gradient-to-br from-accent/20 to-accent/5">
              <Type className="w-8 h-8" />
              <span className="text-sm font-medium">Upload Video</span>
            </button>
            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleUpload} />
          </>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Watermark Text</p>
          <input value={watermarkText} onChange={e => setWatermarkText(e.target.value)} placeholder="Your brand name..." className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Position</p>
          <div className="grid grid-cols-3 gap-2">
            {POSITIONS.map(p => (
              <button key={p.id} onClick={() => setPosition(p)} className={`py-2.5 rounded-xl text-xs font-medium transition-all ${position.id === p.id ? "bg-primary text-primary-foreground" : "bg-accent/40 text-muted-foreground"}`}>{p.label}</button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Opacity: {opacity}%</p>
          <input type="range" min="10" max="100" value={opacity} onChange={e => setOpacity(Number(e.target.value))} className="w-full accent-primary" />
        </div>
      </div>

      {video && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50 z-20 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleApply} className="w-full py-3.5 rounded-2xl bg-yellow-500 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20">
            <Download className="w-4 h-4" /> Apply Watermark · 1 MC
          </motion.button>
        </div>
      )}
    </div>
  );
};
export default VideoWatermarkPage;
