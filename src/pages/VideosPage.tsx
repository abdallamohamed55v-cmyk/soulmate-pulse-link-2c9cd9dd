import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, Download, RefreshCw, ArrowLeft, Wand2, Compass, LayoutGrid, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppSidebar from "@/components/AppSidebar";
import AppLayout from "@/layouts/AppLayout";
import { VIDEO_TOOLS } from "@/lib/videoToolsData";
import type { ShowcaseItem } from "@/components/ShowcaseGrid";
import ModelPickerSheet from "@/components/ModelPickerSheet";
import type { ModelOption } from "@/components/ModelSelector";
import UnifiedInputBar from "@/components/UnifiedInputBar";
import createVideoCard from "@/assets/create-video-card.jpg";
import editVideoCard from "@/assets/edit-video-hero.jpg";

type Tab = "home" | "studio" | "community";

const NANO_BANANA_DEFAULT: ModelOption = {
  id: "nano-banana",
  name: "Nano Banana",
  credits: "1",
  iconUrl: "/model-logos/nano-banana.jpg",
};

const ALL_TOOLS = [
  { id: "swap-characters", name: "Swap Characters", route: "/videos/tools/swap-characters" },
  { id: "talking-photo", name: "Talking Photo", route: "/videos/tools/talking-photo" },
  { id: "upscale", name: "Video Upscale", route: "/videos/tools/upscale" },
  { id: "auto-caption", name: "Auto Caption", route: "/videos/tools/auto-caption" },
  { id: "lip-sync", name: "Lip Sync", route: "/videos/tools/lip-sync" },
  { id: "video-extender", name: "Video Extender", route: "/videos/tools/video-extender" },
  { id: "green-screen", name: "Green Screen", route: "/videos/tools/green-screen" },
  { id: "video-colorizer", name: "Video Colorizer", route: "/videos/tools/video-colorizer" },
  { id: "video-watermark", name: "Watermark", route: "/videos/tools/video-watermark" },
  { id: "video-bg-replacer", name: "BG Replacer", route: "/videos/tools/video-bg-replacer" },
  { id: "video-intro", name: "Video Intro", route: "/videos/tools/video-intro" },
  { id: "video-denoise", name: "Denoise", route: "/videos/tools/video-denoise" },
  { id: "thumbnail-generator", name: "Thumbnail", route: "/videos/tools/thumbnail-generator" },
];

const TOOL_ROWS = [
  ALL_TOOLS.slice(0, Math.ceil(ALL_TOOLS.length / 2)),
  ALL_TOOLS.slice(Math.ceil(ALL_TOOLS.length / 2)),
];

const TOOL_SILK: Record<string, { bg: string; s1: string; s2: string; s3: string; s4: string }> = {
  "swap-characters": { bg: "linear-gradient(135deg, #3a1e5f 0%, #7c3aed 40%, #6d28d9 100%)", s1: "rgba(167,139,250,0.5)", s2: "rgba(124,58,237,0.4)", s3: "rgba(196,181,253,0.15)", s4: "rgba(139,92,246,0.25)" },
  "talking-photo": { bg: "linear-gradient(135deg, #5f1e3a 0%, #e11d48 40%, #9f1239 100%)", s1: "rgba(251,113,133,0.5)", s2: "rgba(225,29,72,0.4)", s3: "rgba(253,164,175,0.15)", s4: "rgba(244,63,94,0.25)" },
  "upscale": { bg: "linear-gradient(135deg, #1e3a5f 0%, #0284c7 40%, #0369a1 100%)", s1: "rgba(56,189,248,0.5)", s2: "rgba(2,132,199,0.4)", s3: "rgba(125,211,252,0.15)", s4: "rgba(14,165,233,0.25)" },
  "auto-caption": { bg: "linear-gradient(135deg, #5f3a1e 0%, #d97706 40%, #b45309 100%)", s1: "rgba(251,191,36,0.5)", s2: "rgba(217,119,6,0.4)", s3: "rgba(253,224,71,0.15)", s4: "rgba(245,158,11,0.25)" },
  "lip-sync": { bg: "linear-gradient(135deg, #1e5f2a 0%, #16a34a 40%, #15803d 100%)", s1: "rgba(74,222,128,0.5)", s2: "rgba(22,163,74,0.4)", s3: "rgba(134,239,172,0.15)", s4: "rgba(34,197,94,0.25)" },
  "video-extender": { bg: "linear-gradient(135deg, #1e2a5f 0%, #4f46e5 40%, #4338ca 100%)", s1: "rgba(129,140,248,0.5)", s2: "rgba(79,70,229,0.4)", s3: "rgba(165,180,252,0.15)", s4: "rgba(99,102,241,0.25)" },
  "green-screen": { bg: "linear-gradient(135deg, #1e4a4a 0%, #0d9488 40%, #0f766e 100%)", s1: "rgba(94,234,212,0.5)", s2: "rgba(13,148,136,0.4)", s3: "rgba(153,246,228,0.15)", s4: "rgba(20,184,166,0.25)" },
  "video-colorizer": { bg: "linear-gradient(135deg, #5f4a1e 0%, #eab308 40%, #ca8a04 100%)", s1: "rgba(250,204,21,0.5)", s2: "rgba(234,179,8,0.4)", s3: "rgba(253,224,71,0.15)", s4: "rgba(202,138,4,0.25)" },
  "video-watermark": { bg: "linear-gradient(135deg, #2a2a3a 0%, #475569 40%, #334155 100%)", s1: "rgba(148,163,184,0.5)", s2: "rgba(71,85,105,0.4)", s3: "rgba(203,213,225,0.15)", s4: "rgba(100,116,139,0.25)" },
  "video-bg-replacer": { bg: "linear-gradient(135deg, #1e3a3a 0%, #14b8a6 40%, #0d9488 100%)", s1: "rgba(94,234,212,0.5)", s2: "rgba(20,184,166,0.4)", s3: "rgba(153,246,228,0.15)", s4: "rgba(13,148,136,0.25)" },
  "video-intro": { bg: "linear-gradient(135deg, #5f1e4a 0%, #d946ef 40%, #a21caf 100%)", s1: "rgba(232,121,249,0.5)", s2: "rgba(217,70,239,0.4)", s3: "rgba(240,171,252,0.15)", s4: "rgba(192,38,211,0.25)" },
  "video-denoise": { bg: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 40%, #1e40af 100%)", s1: "rgba(96,165,250,0.5)", s2: "rgba(37,99,235,0.4)", s3: "rgba(147,197,253,0.15)", s4: "rgba(59,130,246,0.25)" },
  "thumbnail-generator": { bg: "linear-gradient(135deg, #3a1e1e 0%, #ef4444 40%, #dc2626 100%)", s1: "rgba(248,113,113,0.5)", s2: "rgba(239,68,68,0.4)", s3: "rgba(254,202,202,0.15)", s4: "rgba(220,38,38,0.25)" },
};

const VIDEO_PLACEHOLDERS = [
  "A cinematic drone shot over mountains...",
  "A cat playing piano in slow motion...",
  "Create your next viral video...",
  "Anime fight scene with epic effects...",
];

const HERO_TEXTS = [
  { main: "Generate cinematic", accent: "AI videos" },
  { main: "Text to video", accent: "in seconds" },
  { main: "Your story", accent: "brought to life" },
  { main: "Create videos with", accent: "AI magic" },
];

const VideosPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>((location.state as any)?.tab || "home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studioVideos, setStudioVideos] = useState<any[]>([]);
  const [communityItems, setCommunityItems] = useState<ShowcaseItem[]>([]);
  const [previewVid, setPreviewVid] = useState<{ url: string; prompt?: string } | null>(null);
  const [prompt, setPrompt] = useState("");
  const [reuseTemplate, setReuseTemplate] = useState<{ url: string; prompt: string } | null>(null);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(NANO_BANANA_DEFAULT);
  const [toolLandingImages, setToolLandingImages] = useState<Record<string, string>>({});
  const [heroIdx, setHeroIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedVideo, setAttachedVideo] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "studio") loadStudioVideos();
    if (activeTab === "community") loadCommunity();
  }, [activeTab]);

  useEffect(() => {
    const s = (location.state as any)?.tab;
    if (s === "studio") setActiveTab("studio");
  }, [location.state]);

  useEffect(() => { loadToolLandingImages(); }, []);

  useEffect(() => {
    const interval = setInterval(() => setHeroIdx(i => (i + 1) % HERO_TEXTS.length), 4000);
    return () => clearInterval(interval);
  }, []);

  const loadStudioVideos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: convs } = await supabase.from("conversations").select("id").eq("user_id", user.id).eq("mode", "videos");
    if (!convs || convs.length === 0) { setStudioVideos([]); return; }
    const convIds = convs.map(c => c.id);
    const { data } = await supabase.from("messages").select("content, images, created_at").eq("role", "assistant").not("images", "is", null).in("conversation_id", convIds).order("created_at", { ascending: false }).limit(50);
    if (data) {
      const vids = data.flatMap(m => (m.images || []).filter((u: string) => u.includes(".mp4") || u.includes("video")).map((url: string) => ({ url, prompt: m.content?.slice(0, 200) || "", created_at: m.created_at })));
      setStudioVideos(vids);
    }
  };

  const loadCommunity = async () => {
    const { data } = await supabase.from("showcase_items").select("*").eq("media_type", "video").order("display_order", { ascending: true }).limit(50);
    if (data) setCommunityItems(data as any);
  };

  const loadToolLandingImages = async () => {
    const cached = localStorage.getItem("megsy_tool_images_vid");
    if (cached) {
      try { setToolLandingImages(JSON.parse(cached)); } catch {}
    }
    const { data } = await supabase.from("tool_landing_images").select("tool_id, image_url").in("tool_id", ALL_TOOLS.map(t => t.id));
    if (!data) return;
    const map = data.reduce<Record<string, string>>((acc, item) => { if (item.image_url) acc[item.tool_id] = item.image_url; return acc; }, {});
    setToolLandingImages(map);
    localStorage.setItem("megsy_tool_images_vid", JSON.stringify(map));
  };

  const getToolPreview = (toolId: string) => {
    if (toolLandingImages[toolId]) return toolLandingImages[toolId];
    const tool = VIDEO_TOOLS.find(t => t.id === toolId);
    return tool?.previewVideo || "";
  };

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    navigate("/videos/studio", { state: { prompt: prompt.trim(), model: selectedModel } });
  };

  if (previewVid) {
    return (
      <AppLayout onSelectConversation={() => {}} onNewChat={() => {}} activeConversationId={null}>
        <div className="h-full flex flex-col bg-background">
          <div className="sticky top-0 z-10 px-4 py-3 bg-background/80 backdrop-blur-xl flex items-center gap-3 border-b border-border/30">
            <button onClick={() => setPreviewVid(null)} className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-accent/50"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-base font-bold text-foreground flex-1">Preview</h1>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="rounded-2xl overflow-hidden border border-border/20"><video src={previewVid.url} controls autoPlay className="w-full" /></div>
            <div className="flex gap-3">
              <a href={previewVid.url} download className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-medium text-sm"><Download className="w-4 h-4" /> Download</a>
              {previewVid.prompt && (
                <button onClick={() => {
                  setReuseTemplate({ url: previewVid.url, prompt: previewVid.prompt! });
                  setPrompt("Let's get creative ✨");
                  setPreviewVid(null);
                  setActiveTab("home");
                }} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent text-foreground font-medium text-sm"><RefreshCw className="w-4 h-4" /> Reuse</button>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout onSelectConversation={() => {}} onNewChat={() => {}} activeConversationId={null}>
      <div className="h-full flex flex-col bg-background">
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onNewChat={() => {}} currentMode="videos" />
        <ModelPickerSheet open={modelPickerOpen} onClose={() => setModelPickerOpen(false)} onSelect={m => { setSelectedModel(m); setModelPickerOpen(false); }} mode="videos" selectedModelId={selectedModel.id} />

        <div className="sticky top-0 z-10 px-4 pt-3 pb-2 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground"><Menu className="w-5 h-5" /></button>
            <div className="w-9" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-24">
          {activeTab === "home" && (
            <div className="pt-2 space-y-5">
              <div className="text-center py-3">
                <AnimatePresence mode="wait">
                  <motion.div key={heroIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5 }}>
                    <p className="text-2xl font-extrabold text-foreground leading-tight">{HERO_TEXTS[heroIdx].main}</p>
                    <p className="text-2xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent leading-tight">{HERO_TEXTS[heroIdx].accent}</p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {reuseTemplate && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/50 backdrop-blur-sm mb-2">
                  <video src={reuseTemplate.url} muted className="w-10 h-10 rounded-lg object-cover" />
                  <p className="text-xs text-muted-foreground flex-1 truncate">Inspired by this template</p>
                  <button onClick={() => { setReuseTemplate(null); setPrompt(""); }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <UnifiedInputBar
                prompt={prompt}
                onPromptChange={setPrompt}
                onGenerate={handleGenerate}
                onAttach={() => fileInputRef.current?.click()}
                onModelPick={() => setModelPickerOpen(true)}
                modelIcon={selectedModel.iconUrl}
                modelName={selectedModel.name}
                showModelPicker
                placeholders={VIDEO_PLACEHOLDERS}
                className="min-h-[72px]"
              />

              <div className="space-y-3">
                {TOOL_ROWS.map((row, rowIndex) => (
                  <div key={rowIndex} className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
                    <div className="flex min-w-max gap-3">
                      {row.map((tool) => {
                        const silk = TOOL_SILK[tool.id] || TOOL_SILK["swap-characters"];
                        return (
                          <motion.button key={tool.id} whileTap={{ scale: 0.96 }} onClick={() => navigate(tool.route)} className="relative h-56 w-44 flex-shrink-0 overflow-hidden rounded-2xl" style={{ background: silk.bg }}>
                            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 150% 100% at 15% 25%, ${silk.s1}, transparent 70%), radial-gradient(ellipse 130% 90% at 85% 75%, ${silk.s2}, transparent 65%), radial-gradient(ellipse 100% 120% at 50% -10%, ${silk.s3}, transparent 60%)` }} />
                            <div className="absolute inset-0" style={{ background: `radial-gradient(circle 60px at 25% 75%, ${silk.s4}, transparent), radial-gradient(circle 50px at 75% 25%, rgba(255,255,255,0.08), transparent), radial-gradient(circle 80px at 50% 50%, ${silk.s4}, transparent)` }} />
                            <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, rgba(255,255,255,0.06) 0%, transparent 40%, rgba(255,255,255,0.04) 60%, transparent 100%)` }} />
                            <div className="absolute inset-0 flex items-center justify-center p-4">
                              <p className="text-[11px] uppercase tracking-[0.2em] font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent text-center leading-relaxed drop-shadow-sm">{tool.name}</p>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigate("/videos/studio")} className="relative flex h-32 w-full items-center overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/20 to-primary/5">
                <div className="absolute inset-y-0 right-0 w-[42%] overflow-hidden">
                  <img src={createVideoCard} alt="Create" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-l from-background/10 via-background/20 to-transparent" />
                </div>
                <div className="relative flex-1 px-5 pr-[38%] text-left">
                  <p className="text-lg font-bold text-foreground">Create Your Video</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Generate videos with AI</p>
                </div>
              </motion.button>

              <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigate("/videos/studio")} className="relative flex h-32 w-full items-center overflow-hidden rounded-2xl border border-border/20 bg-gradient-to-r from-accent/30 to-accent/5">
                <div className="absolute inset-y-0 right-0 w-[42%] overflow-hidden">
                  <img src={editVideoCard} alt="Edit" className="h-full w-full object-cover opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-l from-background/10 via-background/20 to-transparent" />
                </div>
                <div className="relative flex-1 px-5 pr-[38%] text-left">
                  <p className="text-lg font-bold text-foreground">Edit Your Video</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Transform existing videos</p>
                </div>
              </motion.button>
            </div>
          )}

          {activeTab === "studio" && (
            <div className="pt-4">
              {studioVideos.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-sm">No videos generated yet</p>
                  <button onClick={() => navigate("/videos/studio")} className="mt-3 text-sm text-primary font-medium">Start creating</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {studioVideos.map((vid, i) => (
                    <div key={i} className="rounded-2xl overflow-hidden bg-card border border-border/20 cursor-pointer" onClick={() => setPreviewVid(vid)}>
                      <video src={vid.url} className="w-full" muted playsInline />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "community" && (
            <div className="pt-4">
              {communityItems.length === 0 ? (
                <p className="text-center py-20 text-muted-foreground text-sm">Community gallery coming soon</p>
              ) : (
                <div className="space-y-3">
                  {communityItems.map(item => (
                    <div key={item.id} className="rounded-2xl overflow-hidden bg-card border border-border/20 cursor-pointer" onClick={() => setPreviewVid({ url: item.media_url, prompt: item.prompt })}>
                      <video src={item.media_url} autoPlay muted loop playsInline className="w-full" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-8 px-8 py-3 rounded-full bg-card/90 backdrop-blur-xl border border-border/30 shadow-lg">
            <button onClick={() => setActiveTab("home")} className="flex flex-col items-center gap-0.5">
              <LayoutGrid className={`w-5 h-5 ${activeTab === "home" ? "text-primary" : "text-muted-foreground"}`} strokeWidth={activeTab === "home" ? 2.5 : 1.8} />
            </button>
            <button onClick={() => setActiveTab("studio")} className="flex flex-col items-center gap-0.5">
              <Wand2 className={`w-5 h-5 ${activeTab === "studio" ? "text-primary" : "text-muted-foreground"}`} strokeWidth={activeTab === "studio" ? 2.5 : 1.8} />
            </button>
            <button onClick={() => setActiveTab("community")} className="flex flex-col items-center gap-0.5">
              <Compass className={`w-5 h-5 ${activeTab === "community" ? "text-primary" : "text-muted-foreground"}`} strokeWidth={activeTab === "community" ? 2.5 : 1.8} />
            </button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" className="hidden" accept="video/*" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => setAttachedVideo(reader.result as string);
            reader.readAsDataURL(file);
          }
          e.target.value = "";
        }} />
      </div>
    </AppLayout>
  );
};

export default VideosPage;
