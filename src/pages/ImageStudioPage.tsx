import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ThumbsUp, Share2, ArrowLeft, X, Loader2, Plus, ChevronDown, RefreshCw } from "lucide-react";
import ImagePreviewModal from "@/components/ImagePreviewModal";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import AppLayout from "@/layouts/AppLayout";
import { getDefaultModel } from "@/components/ModelSelector";
import type { ModelOption } from "@/components/ModelSelector";
import ModelPickerSheet from "@/components/ModelPickerSheet";
import studioHero from "@/assets/studio-images-hero.jpg";

const TruncatedText = ({ text }: { text: string }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 120;
  return (
    <div className="text-sm text-foreground">
      {isLong && !expanded ? (
        <>
          <span>{text.slice(0, 120)}...</span>
          <button onClick={() => setExpanded(true)} className="text-blue-400 text-xs ml-1 font-medium">Show more</button>
        </>
      ) : (
        <>
          <span>{text}</span>
          {isLong && <button onClick={() => setExpanded(false)} className="text-blue-400 text-xs ml-1 font-medium">Show less</button>}
        </>
      )}
    </div>
  );
};

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  attachedImage?: string;
}

const STUDIO_PLACEHOLDERS = [
  "A dreamy landscape at golden hour...",
  "Portrait with cinematic lighting...",
  "Surreal artwork with bold colors...",
  "Describe your next masterpiece...",
];

const HERO_TEXTS = [
  { main: "Create", accent: "masterpieces" },
  { main: "Imagine", accent: "anything" },
  { main: "Your art", accent: "your rules" },
];

const LOADING_TEXTS = [
  { text: "Creating", accent: "magic" },
  { text: "Painting", accent: "pixels" },
  { text: "Almost", accent: "there" },
  { text: "Bringing ideas", accent: "to life" },
];

const StudioThinkingLoader = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % LOADING_TEXTS.length), 2400);
    return () => clearInterval(t);
  }, []);
  const current = LOADING_TEXTS[idx];
  return (
    <div className="flex items-center gap-2.5 py-2">
      <motion.svg
        width="18" height="18" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 text-blue-400"
        animate={{ y: [0, -6, 0], rotate: [0, 180, 360], scale: [1, 1.15, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M50 5 L60 40 L95 50 L60 60 L50 95 L40 60 L5 50 L40 40 Z" fill="currentColor" />
      </motion.svg>
      <AnimatePresence mode="wait">
        <motion.span key={idx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-xs">
          <span className="text-foreground">{current.text} </span>
          <span className="text-blue-400">{current.accent}</span>
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

const ImageStudioPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId, hasEnoughCredits, refreshCredits } = useCredits();
  const [selectedModel, setSelectedModel] = useState<ModelOption>(() =>
    location.state?.model || getDefaultModel("images")
  );
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [heroIdx, setHeroIdx] = useState(0);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // No persistence - start fresh every time

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (location.state?.prompt) {
      const p = location.state.prompt;
      const img = location.state?.attachedImage || null;
      setInput(p);
      if (img) setAttachedImage(img);
      setTimeout(() => handleSend(p, img), 200);
      window.history.replaceState({}, "");
    }
  }, []);

  // Typing animation
  useEffect(() => {
    const target = STUDIO_PLACEHOLDERS[placeholderIdx];
    let charIdx = 0;
    setIsTyping(true);
    setDisplayedPlaceholder("");
    const typeInterval = setInterval(() => {
      charIdx++;
      setDisplayedPlaceholder(target.slice(0, charIdx));
      if (charIdx >= target.length) {
        clearInterval(typeInterval);
        setIsTyping(false);
        setTimeout(() => setPlaceholderIdx(i => (i + 1) % STUDIO_PLACEHOLDERS.length), 2000);
      }
    }, 40);
    return () => clearInterval(typeInterval);
  }, [placeholderIdx]);

  useEffect(() => {
    const interval = setInterval(() => setHeroIdx(i => (i + 1) % HERO_TEXTS.length), 4000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAttachedImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSend = async (promptOverride?: string, imageOverride?: string | null) => {
    const prompt = promptOverride || input.trim();
    if (!prompt || isGenerating) return;

    const cost = Number(selectedModel.credits) || 1;
    if (userId && !hasEnoughCredits(cost)) { toast.error("Insufficient credits"); return; }

    const currentAttachedImage = imageOverride !== undefined ? imageOverride : attachedImage;
    setLastPrompt(prompt);
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      attachedImage: currentAttachedImage || undefined,
    };
    const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "" };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput("");
    setAttachedImage(null);
    setIsGenerating(true);

    try {
      const body: any = {
        prompt,
        model: selectedModel.id,
        user_id: userId,
        credits_cost: cost,
        num_images: 1,
        image_size: { width: 1024, height: 1024 },
      };
      if (currentAttachedImage) body.image_url = currentAttachedImage;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify(body),
      });
      const data = await resp.json();

      if (data.error) {
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1].content = `Error: ${data.error}`;
          return copy;
        });
      } else {
        const urls: string[] = data.image_urls || (data.image_url ? [data.image_url] : []);
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1].content = "";
          copy[copy.length - 1].images = urls;
          return copy;
        });
      }
    } catch {
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1].content = "Generation failed. Please try again.";
        return copy;
      });
    }

    setIsGenerating(false);
    refreshCredits();
  };

  const handleRegenerate = () => {
    if (lastPrompt) handleSend(lastPrompt);
  };

  const handleDownload = (url: string) => {
    const a = document.createElement("a"); a.href = url; a.download = "generated.png"; a.target = "_blank"; a.click();
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-rose-950/20 via-background to-background pointer-events-none" />

        <ModelPickerSheet open={modelPickerOpen} onClose={() => setModelPickerOpen(false)} onSelect={m => { setSelectedModel(m); setModelPickerOpen(false); }} mode="images" selectedModelId={selectedModel.id} />

        <div className="relative z-10 flex items-center gap-3 px-4 py-3 bg-background/50 backdrop-blur-xl">
          <button onClick={() => navigate("/images")} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-accent transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.p key={heroIdx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.3 }} className="text-sm font-bold">
                <span className="text-foreground">{HERO_TEXTS[heroIdx].main} </span>
                <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">{HERO_TEXTS[heroIdx].accent}</span>
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
              <div className="w-full max-w-[280px] rounded-3xl overflow-hidden shadow-2xl shadow-primary/10">
                <img src={studioHero} alt="" className="w-full h-auto" />
              </div>
              <div>
                <AnimatePresence mode="wait">
                  <motion.div key={heroIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="text-xl font-bold text-foreground">{HERO_TEXTS[heroIdx].main}</p>
                    <p className="text-xl font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">{HERO_TEXTS[heroIdx].accent}</p>
                  </motion.div>
                </AnimatePresence>
                <p className="text-sm text-muted-foreground mt-2">Describe your image or attach a photo to edit</p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`mb-4 ${msg.role === "user" ? "flex justify-end" : "flex justify-start"}`}>
              <div className={`max-w-[85%] ${msg.role === "user" ? "bg-accent/30 rounded-2xl rounded-br-md p-3" : "p-1"}`}>
                {msg.attachedImage && <img src={msg.attachedImage} alt="" className="w-32 h-32 object-cover rounded-xl mb-2" />}
                {msg.content && msg.role === "user" && <TruncatedText text={msg.content} />}
                {msg.content && msg.role === "assistant" && <div className="text-sm text-foreground px-2 py-1">{msg.content}</div>}
                <AnimatePresence>
                  {msg.role === "assistant" && !msg.content && !msg.images?.length && isGenerating && (
                    <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                      <StudioThinkingLoader />
                    </motion.div>
                  )}
                </AnimatePresence>
                {msg.images && msg.images.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mt-2 space-y-2">
                    {msg.images.map((url, i) => (
                      <div key={i}>
                        <img src={url} alt="" className="w-full rounded-2xl cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setPreviewUrl(url)} />
                        <div className="flex items-center gap-1.5 mt-2 px-1">
                          <button onClick={() => handleDownload(url)} className="p-2 rounded-xl bg-accent/50 hover:bg-accent transition-colors"><Download className="w-4 h-4 text-foreground" /></button>
                          <button className="p-2 rounded-xl bg-accent/50 hover:bg-accent transition-colors"><ThumbsUp className="w-4 h-4 text-foreground" /></button>
                          <button className="p-2 rounded-xl bg-accent/50 hover:bg-accent transition-colors"><Share2 className="w-4 h-4 text-foreground" /></button>
                          <button onClick={handleRegenerate} className="p-2 rounded-xl bg-accent/50 hover:bg-accent transition-colors"><RefreshCw className="w-4 h-4 text-foreground" /></button>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Input */}
        <div className="relative z-10 p-3 bg-background/80 backdrop-blur-xl">
          <div className="rounded-2xl bg-accent/40 backdrop-blur-sm">
            {attachedImage && (
              <div className="px-4 pt-4 relative inline-block">
                <img src={attachedImage} alt="" className="h-16 w-16 object-cover rounded-xl" />
                <button onClick={() => setAttachedImage(null)} className="absolute -right-1 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px]">✕</button>
              </div>
            )}
            <div className="px-4 pt-4 pb-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={displayedPlaceholder + (isTyping ? "|" : "")}
                rows={2}
                className="min-h-[64px] w-full bg-transparent text-sm text-foreground outline-none resize-none placeholder:text-muted-foreground/40"
              />
            </div>
            <div className="flex items-center gap-2 px-4 pb-4">
              <button
                onClick={() => setModelPickerOpen(true)}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent/60 px-3 py-2 hover:bg-accent transition-all text-xs font-medium"
              >
                {selectedModel.iconUrl ? (
                  <img src={selectedModel.iconUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                ) : null}
                <span className="text-foreground font-semibold truncate max-w-[100px]">{selectedModel.name}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent/60 px-3 py-2 hover:bg-accent transition-all text-xs font-medium text-muted-foreground hover:text-foreground">
                <Plus className="w-3.5 h-3.5" />
                <span>Media</span>
              </button>
              <div className="flex-1" />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSend()}
                disabled={(!input.trim() && !attachedImage) || isGenerating}
                className="shrink-0 rounded-xl bg-foreground px-6 py-2.5 text-xs font-semibold text-background transition-all disabled:opacity-30"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate"}
              </motion.button>
            </div>
          </div>
        </div>

        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />

        <ImagePreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
      </div>
    </AppLayout>
  );
};

export default ImageStudioPage;
