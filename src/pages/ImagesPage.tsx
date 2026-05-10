import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, Download, RefreshCw, ArrowLeft, Wand2, Compass, LayoutGrid, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppSidebar from "@/components/AppSidebar";
import AppLayout from "@/layouts/AppLayout";
import { IMAGE_TOOLS } from "@/lib/imageToolsData";
import type { ShowcaseItem } from "@/components/ShowcaseGrid";
import ModelPickerSheet from "@/components/ModelPickerSheet";
import type { ModelOption } from "@/components/ModelSelector";
import UnifiedInputBar from "@/components/UnifiedInputBar";
import createImageCard from "@/assets/create-image-card.jpg";
import editImageCard from "@/assets/edit-image-card.jpg";

type Tab = "home" | "studio" | "community";

const NANO_BANANA_DEFAULT: ModelOption = {
  id: "nano-banana",
  name: "Nano Banana",
  credits: "1",
  iconUrl: "/model-logos/nano-banana.jpg",
};

const ALL_TOOLS = [
  { id: "inpaint", name: "Inpaint", route: "/images/tools/inpaint" },
  { id: "clothes-changer", name: "Clothes Changer", route: "/images/tools/clothes-changer" },
  { id: "headshot", name: "AI Headshot", route: "/images/tools/headshot" },
  { id: "face-swap", name: "Face Swap", route: "/images/tools/face-swap" },
  { id: "bg-remover", name: "BG Remover", route: "/images/tools/bg-remover" },
  { id: "cartoon", name: "Cartoon", route: "/images/tools/cartoon" },
  { id: "colorizer", name: "Colorizer", route: "/images/tools/colorizer" },
  { id: "retouching", name: "Retouch", route: "/images/tools/retouching" },
  { id: "remover", name: "Object Remover", route: "/images/tools/remover" },
  { id: "sketch-to-image", name: "Sketch to Image", route: "/images/tools/sketch-to-image" },
  { id: "relight", name: "Relight", route: "/images/tools/relight" },
  { id: "character-swap", name: "Character Swap", route: "/images/tools/character-swap" },
  { id: "storyboard", name: "Storyboard", route: "/images/tools/storyboard" },
  { id: "hair-changer", name: "Hair Changer", route: "/images/tools/hair-changer" },
  { id: "avatar-generator", name: "Avatar Generator", route: "/images/tools/avatar-generator" },
  { id: "product-photo", name: "Product Photo", route: "/images/tools/product-photo" },
  { id: "logo-generator", name: "Logo Generator", route: "/images/tools/logo-generator" },
  { id: "perspective-correction", name: "Fix Perspective", route: "/images/tools/perspective-correction" },
];

const TOOL_ROWS = [
  ALL_TOOLS.slice(0, Math.ceil(ALL_TOOLS.length / 2)),
  ALL_TOOLS.slice(Math.ceil(ALL_TOOLS.length / 2)),
];

// Each tool gets a unique silk-fabric gradient with multiple radial layers for depth
const TOOL_SILK: Record<string, { bg: string; s1: string; s2: string; s3: string; s4: string }> = {
  "inpaint": { bg: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 40%, #1e40af 100%)", s1: "rgba(96,165,250,0.5)", s2: "rgba(37,99,235,0.4)", s3: "rgba(147,197,253,0.15)", s4: "rgba(59,130,246,0.25)" },
  "clothes-changer": { bg: "linear-gradient(135deg, #5f1e3a 0%, #e11d48 40%, #9f1239 100%)", s1: "rgba(251,113,133,0.5)", s2: "rgba(225,29,72,0.4)", s3: "rgba(253,164,175,0.15)", s4: "rgba(244,63,94,0.25)" },
  "headshot": { bg: "linear-gradient(135deg, #5f3a1e 0%, #d97706 40%, #b45309 100%)", s1: "rgba(251,191,36,0.5)", s2: "rgba(217,119,6,0.4)", s3: "rgba(253,224,71,0.15)", s4: "rgba(245,158,11,0.25)" },
  "face-swap": { bg: "linear-gradient(135deg, #3a1e5f 0%, #7c3aed 40%, #6d28d9 100%)", s1: "rgba(167,139,250,0.5)", s2: "rgba(124,58,237,0.4)", s3: "rgba(196,181,253,0.15)", s4: "rgba(139,92,246,0.25)" },
  "bg-remover": { bg: "linear-gradient(135deg, #1e4a4a 0%, #0d9488 40%, #0f766e 100%)", s1: "rgba(94,234,212,0.5)", s2: "rgba(13,148,136,0.4)", s3: "rgba(153,246,228,0.15)", s4: "rgba(20,184,166,0.25)" },
  "cartoon": { bg: "linear-gradient(135deg, #5f1e4a 0%, #d946ef 40%, #a21caf 100%)", s1: "rgba(232,121,249,0.5)", s2: "rgba(217,70,239,0.4)", s3: "rgba(240,171,252,0.15)", s4: "rgba(192,38,211,0.25)" },
  "colorizer": { bg: "linear-gradient(135deg, #1e5f2a 0%, #16a34a 40%, #15803d 100%)", s1: "rgba(74,222,128,0.5)", s2: "rgba(22,163,74,0.4)", s3: "rgba(134,239,172,0.15)", s4: "rgba(34,197,94,0.25)" },
  "retouching": { bg: "linear-gradient(135deg, #1e3a5f 0%, #0284c7 40%, #0369a1 100%)", s1: "rgba(56,189,248,0.5)", s2: "rgba(2,132,199,0.4)", s3: "rgba(125,211,252,0.15)", s4: "rgba(14,165,233,0.25)" },
  "remover": { bg: "linear-gradient(135deg, #2a2a3a 0%, #475569 40%, #334155 100%)", s1: "rgba(148,163,184,0.5)", s2: "rgba(71,85,105,0.4)", s3: "rgba(203,213,225,0.15)", s4: "rgba(100,116,139,0.25)" },
  "sketch-to-image": { bg: "linear-gradient(135deg, #2a4a1e 0%, #65a30d 40%, #4d7c0f 100%)", s1: "rgba(163,230,53,0.5)", s2: "rgba(101,163,13,0.4)", s3: "rgba(190,242,100,0.15)", s4: "rgba(132,204,22,0.25)" },
  "relight": { bg: "linear-gradient(135deg, #5f4a1e 0%, #eab308 40%, #ca8a04 100%)", s1: "rgba(250,204,21,0.5)", s2: "rgba(234,179,8,0.4)", s3: "rgba(253,224,71,0.15)", s4: "rgba(202,138,4,0.25)" },
  "character-swap": { bg: "linear-gradient(135deg, #4a1e5f 0%, #c026d3 40%, #a21caf 100%)", s1: "rgba(232,121,249,0.5)", s2: "rgba(192,38,211,0.4)", s3: "rgba(240,171,252,0.15)", s4: "rgba(168,85,247,0.25)" },
  "storyboard": { bg: "linear-gradient(135deg, #1e2a5f 0%, #4f46e5 40%, #4338ca 100%)", s1: "rgba(129,140,248,0.5)", s2: "rgba(79,70,229,0.4)", s3: "rgba(165,180,252,0.15)", s4: "rgba(99,102,241,0.25)" },
  "hair-changer": { bg: "linear-gradient(135deg, #1e4a4f 0%, #06b6d4 40%, #0891b2 100%)", s1: "rgba(34,211,238,0.5)", s2: "rgba(6,182,212,0.4)", s3: "rgba(103,232,249,0.15)", s4: "rgba(8,145,178,0.25)" },
  "avatar-generator": { bg: "linear-gradient(135deg, #2d1b69 0%, #8b5cf6 40%, #7c3aed 100%)", s1: "rgba(167,139,250,0.5)", s2: "rgba(139,92,246,0.4)", s3: "rgba(196,181,253,0.15)", s4: "rgba(124,58,237,0.25)" },
  "product-photo": { bg: "linear-gradient(135deg, #1e3a3a 0%, #14b8a6 40%, #0d9488 100%)", s1: "rgba(94,234,212,0.5)", s2: "rgba(20,184,166,0.4)", s3: "rgba(153,246,228,0.15)", s4: "rgba(13,148,136,0.25)" },
  "logo-generator": { bg: "linear-gradient(135deg, #3a1e1e 0%, #ef4444 40%, #dc2626 100%)", s1: "rgba(248,113,113,0.5)", s2: "rgba(239,68,68,0.4)", s3: "rgba(254,202,202,0.15)", s4: "rgba(220,38,38,0.25)" },
  "perspective-correction": { bg: "linear-gradient(135deg, #1e2a4a 0%, #6366f1 40%, #4f46e5 100%)", s1: "rgba(129,140,248,0.5)", s2: "rgba(99,102,241,0.4)", s3: "rgba(165,180,252,0.15)", s4: "rgba(79,70,229,0.25)" },
};

const IMAGE_PLACEHOLDERS = [
  "A futuristic city at sunset in cyberpunk style...",
  "Portrait of a woman in golden light...",
  "Anime character in a magical forest...",
  "Abstract art with vibrant colors...",
];

const HERO_TEXTS = [
  { main: "Turn words into", accent: "stunning images" },
  { main: "AI-powered", accent: "image creation" },
  { main: "Your imagination", accent: "visualized" },
  { main: "Create art with", accent: "a single prompt" },
];

const ImagesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>((location.state as any)?.tab || "home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studioImages, setStudioImages] = useState<any[]>([]);
  const [communityItems, setCommunityItems] = useState<ShowcaseItem[]>([]);
  const [previewImg, setPreviewImg] = useState<{ url: string; prompt?: string } | null>(null);
  const [prompt, setPrompt] = useState("");
  const [reuseTemplate, setReuseTemplate] = useState<{ url: string; prompt: string } | null>(null);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(NANO_BANANA_DEFAULT);
  const [toolLandingImages, setToolLandingImages] = useState<Record<string, string>>({});
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === "studio") loadStudioImages();
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

  const loadStudioImages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: convs } = await supabase.from("conversations").select("id").eq("user_id", user.id).eq("mode", "images");
    if (!convs || convs.length === 0) { setStudioImages([]); return; }
    const convIds = convs.map(c => c.id);
    const { data } = await supabase.from("messages").select("content, images, created_at").eq("role", "assistant").not("images", "is", null).in("conversation_id", convIds).order("created_at", { ascending: false }).limit(200);
    if (data) {
      const imgs = data.flatMap(m => (m.images || []).filter((u: string) => !u.includes(".mp4") && !u.includes("video")).map((url: string) => ({ url, prompt: m.content?.slice(0, 200) || "", created_at: m.created_at })));
      setStudioImages(imgs);
    }
  };

  const loadCommunity = async () => {
    const { data } = await supabase.from("showcase_items").select("*").eq("media_type", "image").order("display_order", { ascending: true }).limit(50);
    if (data) setCommunityItems(data as any);
  };

  const loadToolLandingImages = async () => {
    // Try cache first
    const cached = localStorage.getItem("megsy_tool_images_img");
    if (cached) {
      try { setToolLandingImages(JSON.parse(cached)); } catch {}
    }
    const { data } = await supabase.from("tool_landing_images").select("tool_id, image_url").in("tool_id", ALL_TOOLS.map(t => t.id));
    if (!data) return;
    const map = data.reduce<Record<string, string>>((acc, item) => { if (item.image_url) acc[item.tool_id] = item.image_url; return acc; }, {});
    setToolLandingImages(map);
    localStorage.setItem("megsy_tool_images_img", JSON.stringify(map));
  };

  const getToolImage = (toolId: string) => {
    if (toolLandingImages[toolId]) return toolLandingImages[toolId];
    const tool = IMAGE_TOOLS.find(t => t.id === toolId);
    return tool?.previewImage || tool?.previewVideo || "";
  };

  const handleGenerate = () => {
    if (!prompt.trim() && !attachedImage) return;
    navigate("/images/studio", { state: { prompt: prompt.trim(), attachedImage, model: selectedModel } });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAttachedImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (previewImg) {
    return (
      <AppLayout onSelectConversation={() => {}} onNewChat={() => {}} activeConversationId={null}>
        <div className="h-full flex flex-col bg-background">
          <div className="sticky top-0 z-10 px-4 py-3 bg-background/80 backdrop-blur-xl flex items-center gap-3 border-b border-border/30">
            <button onClick={() => setPreviewImg(null)} className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-accent/50"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-base font-bold text-foreground flex-1">Preview</h1>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="rounded-2xl overflow-hidden border border-border/20"><img src={previewImg.url} alt="" className="w-full object-contain" /></div>
            <div className="flex gap-3">
              <a href={previewImg.url} download className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-medium text-sm"><Download className="w-4 h-4" /> Download</a>
              {previewImg.prompt && (
                <button onClick={() => {
                  setReuseTemplate({ url: previewImg.url, prompt: previewImg.prompt! });
                  setPrompt("Let's get creative ✨");
                  setPreviewImg(null);
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
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onNewChat={() => {}} currentMode="images" />
        <ModelPickerSheet open={modelPickerOpen} onClose={() => setModelPickerOpen(false)} onSelect={m => { setSelectedModel(m); setModelPickerOpen(false); }} mode="images" selectedModelId={selectedModel.id} />

        <div className="sticky top-0 z-10 px-4 pt-3 pb-2 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground"><Menu className="w-5 h-5" /></button>
            <div className="w-9" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-24">
          {activeTab === "home" && (
            <div className="pt-2 space-y-5">
              {/* Hero text - bigger, no commas */}
              <div className="text-center py-3">
                <AnimatePresence mode="wait">
                  <motion.div key={heroIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5 }}>
                    <p className="text-2xl font-extrabold text-foreground leading-tight">{HERO_TEXTS[heroIdx].main}</p>
                    <p className="text-2xl font-extrabold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent leading-tight">{HERO_TEXTS[heroIdx].accent}</p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Input bar - bigger, no borders, rectangular */}
              {reuseTemplate && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/50 backdrop-blur-sm mb-2">
                  <img src={reuseTemplate.url} alt="" className="w-10 h-10 rounded-lg object-cover" />
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
                placeholders={IMAGE_PLACEHOLDERS}
                attachedImage={attachedImage}
                onClearAttachment={() => setAttachedImage(null)}
                className="min-h-[72px]"
              />

              <div className="space-y-3">
                {TOOL_ROWS.map((row, rowIndex) => (
                  <div key={rowIndex} className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
                    <div className="flex min-w-max gap-3">
                    {row.map((tool) => {
                        const silk = TOOL_SILK[tool.id] || TOOL_SILK["inpaint"];
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

              <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigate("/images/studio")} className="relative flex h-32 w-full items-center overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/20 to-primary/5">
                <div className="absolute inset-y-0 right-0 w-[42%] overflow-hidden">
                  <img src={createImageCard} alt="Create" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-l from-background/10 via-background/20 to-transparent" />
                </div>
                <div className="relative flex-1 text-left px-5 pr-[38%]">
                  <p className="text-lg font-bold text-foreground">Create Your Image</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Generate images with AI</p>
                </div>
              </motion.button>

              <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigate("/images/studio")} className="relative flex h-32 w-full items-center overflow-hidden rounded-2xl border border-border/20 bg-gradient-to-r from-accent/30 to-accent/5">
                <div className="absolute inset-y-0 right-0 w-[42%] overflow-hidden">
                  <img src={editImageCard} alt="Edit" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-l from-background/10 via-background/20 to-transparent" />
                </div>
                <div className="relative flex-1 text-left px-5 pr-[38%]">
                  <p className="text-lg font-bold text-foreground">Edit Your Image</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Transform existing images</p>
                </div>
              </motion.button>
            </div>
          )}

          {activeTab === "studio" && (
            <div className="pt-4">
              {studioImages.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-sm">No images generated yet</p>
                  <button onClick={() => navigate("/images/studio")} className="mt-3 text-sm text-primary font-medium">Start creating</button>
                </div>
              ) : (
                <div className="columns-2 gap-2.5">
                  {studioImages.map((img, i) => (
                    <motion.div key={i} whileTap={{ scale: 0.98 }} className="break-inside-avoid mb-2.5 rounded-2xl overflow-hidden cursor-pointer" onClick={() => setPreviewImg(img)}>
                      <img src={img.url} alt="" className="w-full object-cover" loading="lazy" />
                    </motion.div>
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
                <div className="columns-2 gap-2.5">
                  {communityItems.map(item => (
                    <div key={item.id} className="break-inside-avoid mb-3 rounded-2xl overflow-hidden cursor-pointer" onClick={() => setPreviewImg({ url: item.media_url, prompt: item.prompt })}>
                      <img src={item.media_url} alt="" className="w-full object-cover" loading="lazy" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-1 p-1.5 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.4)]">
            {[
              { key: "home", Icon: LayoutGrid },
              { key: "studio", Icon: Wand2 },
              { key: "community", Icon: Compass },
            ].map(({ key, Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as typeof activeTab)}
                  className={`relative flex items-center justify-center w-12 h-10 rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-white/90 shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.9)]"
                      : "hover:bg-white/10"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-colors ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
      </div>
    </AppLayout>
  );
};

export default ImagesPage;
