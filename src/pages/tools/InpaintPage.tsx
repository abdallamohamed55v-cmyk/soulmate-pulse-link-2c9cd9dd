import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Paintbrush, Eraser, Upload, Download, RotateCcw, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

type Stage = "landing" | "edit" | "result";
type Tool = "brush" | "eraser";

const InpaintPage = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("landing");
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("brush");
  const [brushSize, setBrushSize] = useState(30);
  const [landingImage, setLandingImage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("tool_landing_images").select("image_url").eq("tool_id", "inpaint").maybeSingle()
      .then(({ data }) => { if (data?.image_url) setLandingImage(data.image_url); });
  }, []);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      setSourceImage(e.target?.result as string);
      setStage("edit");
      setResultUrl(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRefUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setRefImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX: number, clientY: number;
    if ("touches" in e) {
      if (e.touches.length > 1) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const draw = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scaledBrush = brushSize * (canvas.width / (containerRef.current?.offsetWidth || canvas.width));
    if (activeTool === "brush") {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
    } else {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,1)";
    }
    if (lastPos.current) {
      const dist = Math.sqrt((x - lastPos.current.x) ** 2 + (y - lastPos.current.y) ** 2);
      const steps = Math.max(Math.ceil(dist / (scaledBrush / 4)), 1);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const ix = lastPos.current.x + (x - lastPos.current.x) * t;
        const iy = lastPos.current.y + (y - lastPos.current.y) * t;
        ctx.beginPath();
        ctx.arc(ix, iy, scaledBrush / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.arc(x, y, scaledBrush / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    lastPos.current = { x, y };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e && e.touches.length > 1) return;
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = null;
    const coords = getCanvasCoords(e);
    if (coords) draw(coords.x, coords.y);
  };

  const moveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    if ("touches" in e && e.touches.length > 1) { endDraw(); return; }
    e.preventDefault();
    const coords = getCanvasCoords(e);
    if (coords) draw(coords.x, coords.y);
  };

  const endDraw = () => { isDrawing.current = false; lastPos.current = null; };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getMaskDataUrl = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    const srcCtx = canvas.getContext("2d");
    if (!srcCtx) return null;
    const imageData = srcCtx.getImageData(0, 0, canvas.width, canvas.height);
    const maskData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i + 3] > 10) {
        maskData.data[i] = maskData.data[i + 1] = maskData.data[i + 2] = maskData.data[i + 3] = 255;
      }
    }
    ctx.putImageData(maskData, 0, 0);
    return maskCanvas.toDataURL("image/png");
  };

  const hasMaskSelection = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return false;
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 10) return true;
    }
    return false;
  };

  const handleGenerate = async () => {
    if (!sourceImage) { toast.error("Please upload an image"); return; }
    if (!prompt.trim()) { toast.error("Describe what to change"); return; }
    if (!hasMaskSelection()) { toast.error("حدد الجزء الذي تريد تعديله أولا"); return; }
    setIsGenerating(true);
    try {
      const maskDataUrl = getMaskDataUrl();
      const { data, error } = await supabase.functions.invoke("image-tools", {
        body: { tool: "inpaint", image: sourceImage, mask: maskDataUrl, referenceImage: refImage, prompt: prompt.trim() },
      });
      if (error) throw error;
      if (data?.url) { setResultUrl(data.url); setStage("result"); }
      else throw new Error(data?.error || "Generation failed");
    } catch (e: any) { toast.error(e.message || "Failed to generate"); }
    finally { setIsGenerating(false); }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/10">
        <button onClick={() => navigate("/images")} className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-foreground">Inpaint</h1>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {/* Landing - opens file picker directly */}
          {stage === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
              <div className="relative h-full flex flex-col items-center justify-center">
                {landingImage ? (
                  <img src={landingImage} alt="Inpaint" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-500/10 to-background" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                <div className="relative z-10 text-center px-6">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => fileInputRef.current?.click()} className="px-10 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg shadow-primary/20">
                    <Upload className="w-4 h-4 inline mr-2" />Upload Your Photo
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Edit */}
          {stage === "edit" && sourceImage && (
            <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col">
              <div className="shrink-0 flex items-center justify-between px-4 py-2">
                <div className="flex gap-1.5">
                  <button onClick={() => setActiveTool("brush")} className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeTool === "brush" ? "bg-primary text-primary-foreground" : "bg-accent/40 text-muted-foreground"}`}>
                    <Paintbrush className="w-3.5 h-3.5" /> Brush
                  </button>
                  <button onClick={() => setActiveTool("eraser")} className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeTool === "eraser" ? "bg-primary text-primary-foreground" : "bg-accent/40 text-muted-foreground"}`}>
                    <Eraser className="w-3.5 h-3.5" /> Eraser
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input type="range" min={5} max={80} value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-20 accent-primary" />
                  <button onClick={clearMask} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-accent/40 transition-colors">
                    <RotateCcw className="w-3 h-3" /> Clear
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto px-3 pb-2" style={{ touchAction: "pinch-zoom" }}>
                <div ref={containerRef} className="relative rounded-2xl overflow-hidden bg-accent/10 border border-border/10">
                  <img ref={imgRef} src={sourceImage} alt="" className="w-full block" onLoad={setupCanvas} draggable={false} />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ cursor: activeTool === "brush" ? "crosshair" : "cell", touchAction: "none" }}
                    onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
                    onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw}
                  />
                </div>
                {refImage && (
                  <div className="flex items-center gap-3 mt-2 px-1">
                    <img src={refImage} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    <p className="text-xs text-muted-foreground flex-1">Reference attached</p>
                    <button onClick={() => setRefImage(null)} className="text-xs text-destructive">Remove</button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Result */}
          {stage === "result" && resultUrl && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col">
              <div className="flex-1 overflow-auto px-4 py-4 flex flex-col gap-3">
                <div className="rounded-2xl overflow-hidden border border-border/20">
                  <img src={resultUrl} alt="Result" className="w-full block" />
                </div>
                <a href={resultUrl} download="inpaint-result.png" target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm">
                  <Download className="w-4 h-4" /> Download
                </a>
                <div className="flex gap-2">
                  <button onClick={() => { setStage("edit"); setResultUrl(null); }} className="flex-1 py-3 rounded-xl bg-accent/50 text-foreground text-sm font-medium">Edit Again</button>
                  <button onClick={() => { setStage("landing"); setSourceImage(null); setRefImage(null); setPrompt(""); setResultUrl(null); }} className="flex-1 py-3 rounded-xl bg-accent/50 text-foreground text-sm font-medium">Start Over</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom input bar - always visible for edit AND result stages */}
      {(stage === "edit" || stage === "result") && (
        <div className="shrink-0 border-t border-border/10 bg-background/90 backdrop-blur-xl px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <div className="rounded-2xl bg-card/80 border border-border/20 p-3">
            <div className="flex items-center gap-2">
              <input ref={refInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleRefUpload(e.target.files[0]); }} />
              <button onClick={() => refInputRef.current?.click()} className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                <Plus className="w-5 h-5" />
              </button>
              <input
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                placeholder="Describe what to change..."
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50 py-2"
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="shrink-0 px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-30 transition-all"
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                ) : "Generate"}
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InpaintPage;
