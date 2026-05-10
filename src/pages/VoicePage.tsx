import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, Mic, Music, Volume2, AudioLines, Phone, Eraser, Languages, LayoutGrid, Wand2, Compass } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import AppLayout from "@/layouts/AppLayout";

const HERO_PHRASES = [
  "Transform your voice with AI-powered tools",
  "Create music, clone voices, and more",
  "Your personal AI audio studio awaits",
  "Turn text into natural speech instantly",
  "AI voice cloning in seconds",
  "Generate music from your imagination",
  "Professional voice tools at your fingertips",
  "Real-time AI voice conversations",
  "Change any voice to any style",
  "Remove noise from any audio file",
  "Create voiceovers like a pro",
  "AI-powered speech synthesis engine",
  "Clone any voice with a short sample",
  "Generate cinematic soundtracks instantly",
  "Talk to AI naturally in any language",
  "Transform recordings with one click",
  "Studio-quality audio processing by AI",
  "Create podcasts with AI voices",
  "Generate audiobooks from text instantly",
  "AI music that sounds human-made",
  "Professional noise removal in seconds",
  "Voice effects powered by deep learning",
  "Multilingual text-to-speech engine",
  "Create unique sound effects with AI",
  "Real-time voice transformation technology",
  "AI-powered audio enhancement suite",
  "Generate natural speech in 50+ languages",
  "Clone celebrity voices ethically with AI",
  "Create custom AI voice assistants",
  "Professional dubbing with voice cloning",
  "AI audio mastering and enhancement",
  "Generate ambient music for any mood",
  "Voice-to-voice translation in real-time",
  "Create song covers with AI voices",
  "Professional audio restoration by AI",
  "Generate jingles and intros with AI",
  "AI-powered speech coaching and analysis",
  "Create ASMR content with AI voices",
  "Generate radio-quality voiceovers",
  "AI music composition for any genre",
  "Remove echo and reverb from recordings",
  "Create meditation guides with AI voice",
  "AI-powered karaoke voice separation",
  "Generate voice messages in any accent",
  "Professional speech enhancement tools",
  "Create AI voice characters for games",
  "Generate background music for videos",
  "AI-powered audio transcription engine",
  "Create voice filters and effects",
  "Real-time language translation via voice",
];

const PRIORITY_SERVICES = [
  { id: "call-ai", title: "Call with AI", description: "Talk naturally with Megsy", route: "/voice/call", icon: <Phone className="w-5 h-5" />, gradient: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #3b82f6 100%)", glow: "rgba(59,130,246,0.4)" },
  { id: "music", title: "Music Generator", description: "Create AI music from text", route: "/voice/music", icon: <Music className="w-5 h-5" />, gradient: "linear-gradient(135deg, #1e3a5f 0%, #7c3aed 40%, #a21caf 100%)", glow: "rgba(167,139,250,0.5)" },
];

// Silk gradient backgrounds for each tool (no images)
const TOOL_SILK: Record<string, { bg: string; s1: string; s2: string; s3: string }> = {
  "voice-changer": { bg: "linear-gradient(135deg, #1e3a5f 0%, #7c3aed 40%, #6d28d9 100%)", s1: "rgba(139,92,246,0.5)", s2: "rgba(124,58,237,0.4)", s3: "rgba(167,139,250,0.2)" },
  "clone-voice": { bg: "linear-gradient(135deg, #0f172a 0%, #0ea5e9 40%, #0284c7 100%)", s1: "rgba(56,189,248,0.5)", s2: "rgba(14,165,233,0.4)", s3: "rgba(125,211,252,0.2)" },
  "tts": { bg: "linear-gradient(135deg, #1e3a5f 0%, #10b981 40%, #059669 100%)", s1: "rgba(52,211,153,0.5)", s2: "rgba(16,185,129,0.4)", s3: "rgba(110,231,183,0.2)" },
  "noise-remover": { bg: "linear-gradient(135deg, #1c1917 0%, #f59e0b 40%, #d97706 100%)", s1: "rgba(251,191,36,0.5)", s2: "rgba(245,158,11,0.4)", s3: "rgba(253,224,71,0.2)" },
  "voice-translate": { bg: "linear-gradient(135deg, #1e1b4b 0%, #e11d48 40%, #be123c 100%)", s1: "rgba(251,113,133,0.5)", s2: "rgba(225,29,72,0.4)", s3: "rgba(253,164,175,0.2)" },
  "karaoke-separator": { bg: "linear-gradient(135deg, #3a1e5f 0%, #d946ef 40%, #a21caf 100%)", s1: "rgba(232,121,249,0.5)", s2: "rgba(217,70,239,0.4)", s3: "rgba(240,171,252,0.2)" },
  "podcast-editor": { bg: "linear-gradient(135deg, #1e4a4a 0%, #0d9488 40%, #0f766e 100%)", s1: "rgba(94,234,212,0.5)", s2: "rgba(13,148,136,0.4)", s3: "rgba(153,246,228,0.2)" },
  "audio-restoration": { bg: "linear-gradient(135deg, #5f3a1e 0%, #d97706 40%, #b45309 100%)", s1: "rgba(251,191,36,0.5)", s2: "rgba(217,119,6,0.4)", s3: "rgba(253,224,71,0.2)" },
  "transcription": { bg: "linear-gradient(135deg, #1e2a5f 0%, #4f46e5 40%, #4338ca 100%)", s1: "rgba(129,140,248,0.5)", s2: "rgba(79,70,229,0.4)", s3: "rgba(165,180,252,0.2)" },
};

const TOOL_SERVICES = [
  { id: "voice-changer", title: "Voice Changer", route: "/voice/changer", icon: <AudioLines className="w-5 h-5" /> },
  { id: "clone-voice", title: "Clone Voice", route: "/voice/clone", icon: <Mic className="w-5 h-5" /> },
  { id: "tts", title: "Text to Speech", route: "/voice/tts", icon: <Volume2 className="w-5 h-5" /> },
  { id: "noise-remover", title: "Noise Remover", route: "/voice/noise-remover", icon: <Eraser className="w-5 h-5" /> },
  { id: "voice-translate", title: "Voice Translation", route: "/voice/translate", icon: <Languages className="w-5 h-5" /> },
  { id: "karaoke-separator", title: "Karaoke Separator", route: "/voice/karaoke-separator", icon: <Music className="w-5 h-5" /> },
  { id: "podcast-editor", title: "Podcast Editor", route: "/voice/podcast-editor", icon: <Mic className="w-5 h-5" /> },
  { id: "audio-restoration", title: "Audio Restoration", route: "/voice/audio-restoration", icon: <Volume2 className="w-5 h-5" /> },
  { id: "transcription", title: "Transcription", route: "/voice/transcription", icon: <AudioLines className="w-5 h-5" /> },
];

const VoicePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx(p => (p + 1) % HERO_PHRASES.length), 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <AppLayout onSelectConversation={() => {}} onNewChat={() => {}} activeConversationId={null}>
      <div className="h-full flex flex-col bg-background">
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onNewChat={() => {}} currentMode="voice" />

        <div className="sticky top-0 z-10 px-4 py-3 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground"><Menu className="w-5 h-5" /></button>
            <div className="w-9" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-24">
          {/* Hero - blue gradient text like landing */}
          <div className="pt-4 pb-6 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={heroIdx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
                className="text-lg font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent leading-snug"
              >
                {HERO_PHRASES[heroIdx]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Priority: Call + Music */}
          <div className="space-y-3 mb-4">
            {PRIORITY_SERVICES.map((s, i) => (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(s.route)}
                className="w-full h-28 relative overflow-hidden rounded-2xl text-left"
                style={{ background: s.gradient }}
              >
                <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 150% 100% at 15% 25%, ${s.glow}, transparent 70%)` }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.06) 0%, transparent 40%)" }} />
                <div className="relative h-full flex items-center px-5 gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/80">{s.icon}</div>
                  <div>
                    <p className="text-base font-bold text-white">{s.title}</p>
                    <p className="text-xs text-white/50 mt-0.5">{s.description}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Tool cards with silk gradient backgrounds */}
          <div className="space-y-3">
            {TOOL_SERVICES.map((s, i) => {
              const silk = TOOL_SILK[s.id] || TOOL_SILK["voice-changer"];
              return (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + 0.05 * i }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(s.route)}
                  className="w-full h-24 relative overflow-hidden rounded-2xl text-left"
                  style={{ background: silk.bg }}
                >
                  <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 150% 100% at 15% 25%, ${silk.s1}, transparent 70%), radial-gradient(ellipse 130% 90% at 85% 75%, ${silk.s2}, transparent 65%)` }} />
                  <div className="absolute inset-0" style={{ background: `radial-gradient(circle 80px at 25% 75%, ${silk.s3}, transparent), linear-gradient(160deg, rgba(255,255,255,0.08) 0%, transparent 40%)` }} />
                  <div className="relative h-full flex items-center px-5 gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/80">{s.icon}</div>
                    <p className="text-sm font-bold text-white">{s.title}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Bottom Navigation - pill style like Images page */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-8 px-8 py-3 rounded-full bg-card/90 backdrop-blur-xl border border-border/30 shadow-lg">
            <button onClick={() => navigate("/voice")} className="flex flex-col items-center gap-0.5">
              <LayoutGrid className={`w-5 h-5 ${location.pathname === "/voice" ? "text-primary" : "text-muted-foreground"}`} strokeWidth={location.pathname === "/voice" ? 2.5 : 1.8} />
            </button>
            <button onClick={() => navigate("/voice/studio")} className="flex flex-col items-center gap-0.5">
              <Wand2 className={`w-5 h-5 ${location.pathname === "/voice/studio" ? "text-primary" : "text-muted-foreground"}`} strokeWidth={location.pathname === "/voice/studio" ? 2.5 : 1.8} />
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default VoicePage;
