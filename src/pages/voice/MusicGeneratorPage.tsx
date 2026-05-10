import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUp, Play, Pause, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AppLayout from "@/layouts/AppLayout";
import { motion, AnimatePresence } from "framer-motion";

const HERO_TEXTS = [
  { line1: "CREATE", line2: "MUSIC" },
  { line1: "AI", line2: "COMPOSER" },
  { line1: "YOUR", line2: "SOUND" },
  { line1: "FEEL", line2: "THE BEAT" },
  { line1: "DREAM", line2: "IT UP" },
  { line1: "MAKE", line2: "MAGIC" },
  { line1: "DROP", line2: "THE MIC" },
  { line1: "VIBE", line2: "CHECK" },
  { line1: "PURE", line2: "MELODY" },
  { line1: "SONIC", line2: "WAVE" },
  { line1: "NEXT", line2: "HIT" },
  { line1: "FRESH", line2: "BEATS" },
];

const MusicGeneratorPage = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [songs, setSongs] = useState<any[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [playingSample, setPlayingSample] = useState(false);
  const sampleAudioRef = useRef<HTMLAudioElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % HERO_TEXTS.length), 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const loadSongs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("generated_songs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setSongs(data);
    };
    loadSongs();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in");

      // Step 1: Analyze prompt and generate lyrics + tags via AI
      toast.info("Analyzing your request...");
      let enhancedPrompt = prompt.trim();
      let songTitle = prompt.trim().slice(0, 50);
      let tags = "";

      try {
        const aiResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({
            messages: [{
              role: "user",
              content: `Analyze this music request and generate song details. Return ONLY a JSON object, no other text:
{"title": "short catchy title", "lyrics": "full song lyrics (4-8 lines)", "tags": "genre tags like: pop, arabic, emotional, female vocal", "enhanced_prompt": "detailed music description for AI generation"}

User request: "${prompt.trim()}"

Rules:
- Match the language of the request (Arabic → Arabic lyrics)
- Choose appropriate genre/style
- If they mention a singer's style, incorporate it in tags
- Keep lyrics poetic and natural
- Tags should be comma-separated music genres/moods`
            }],
            model: "google/gemini-2.5-flash-lite-preview-09-2025",
          }),
        });

        if (aiResp.ok && aiResp.body) {
          const reader = aiResp.body.getReader();
          const decoder = new TextDecoder();
          let aiContent = "";
          let buf = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let ni: number;
            while ((ni = buf.indexOf("\n")) !== -1) {
              let ln = buf.slice(0, ni); buf = buf.slice(ni + 1);
              if (ln.endsWith("\r")) ln = ln.slice(0, -1);
              if (!ln.startsWith("data: ")) continue;
              const js = ln.slice(6).trim();
              if (js === "[DONE]") break;
              try { const p = JSON.parse(js); const c = p.choices?.[0]?.delta?.content; if (c) aiContent += c; } catch {}
            }
          }

          // Parse JSON from AI response
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.title) songTitle = parsed.title;
            if (parsed.enhanced_prompt) enhancedPrompt = parsed.enhanced_prompt;
            if (parsed.tags) tags = parsed.tags;
            if (parsed.lyrics) enhancedPrompt = parsed.lyrics;
          }
        }
      } catch (aiErr) {
        console.error("AI enhance failed, using original prompt:", aiErr);
      }

      // Step 2: Generate music with enhanced data
      toast.info("Generating your track...");
      const { data, error } = await supabase.functions.invoke("generate-voice", {
        body: { 
          model_id: "suno_music", 
          prompt: enhancedPrompt, 
          type: "music",
          settings: { title: songTitle, tags: tags || undefined }
        },
      });
      if (error) throw error;

      if (data?.fallback || data?.error) {
        toast.error(data.error || "Music generation is temporarily unavailable.");
        setGenerating(false);
        return;
      }

      if (data?.status === "completed" && data?.url) {
        const song = await saveSong(user.id, prompt.trim(), data.url, songTitle);
        if (song) navigate(`/voice/music/${song.id}`);
        setPrompt("");
        setGenerating(false);
        return;
      }

      if (data?.task_id) {
        const taskId = data.task_id;
        const keyId = data.key_id;
        const placeholderSong = await saveSong(user.id, prompt.trim(), "", songTitle);
        if (placeholderSong) {
          navigate(`/voice/music/${placeholderSong.id}?task_id=${taskId}&key_id=${keyId}`);
        }
        setPrompt("");
        setGenerating(false);
        return;
      }

      toast.error("Music generation failed. Please try again.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed. Please try again.");
    }
    setGenerating(false);
  };

  const saveSong = async (userId: string, songPrompt: string, audioUrl: string, title?: string) => {
    const { data, error } = await supabase.from("generated_songs").insert({
      user_id: userId,
      prompt: songPrompt,
      audio_url: audioUrl || "pending",
      title: title || songPrompt.slice(0, 50),
      status: audioUrl ? "completed" : "generating",
    }).select().single();

    if (error) {
      console.error("Save song error:", error);
      return null;
    }
    setSongs(prev => [data, ...prev]);
    return data;
  };

  const toggleSample = () => {
    if (!sampleAudioRef.current) return;
    if (playingSample) {
      sampleAudioRef.current.pause();
    } else {
      sampleAudioRef.current.play();
    }
    setPlayingSample(!playingSample);
  };

  const current = HERO_TEXTS[heroIdx];

  return (
    <AppLayout onSelectConversation={() => {}} onNewChat={() => {}} activeConversationId={null}>
      <div className="h-full flex flex-col bg-black">
        {/* Header */}
        <div className="sticky top-0 z-10 px-4 py-3 bg-black/80 backdrop-blur-xl flex items-center gap-3">
          <button
            onClick={() => navigate("/voice")}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-foreground">Music</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Hero text */}
          <div className="pt-6 pb-6 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={heroIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h1 className="text-4xl font-black tracking-tight text-white leading-none">
                  {current.line1}
                </h1>
                <h1 className="text-4xl font-black tracking-tight leading-none mt-1 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                  {current.line2}
                </h1>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Input bar - bigger like code page */}
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => {
                setPrompt(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
              }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="Describe the music you want..."
              rows={2}
              className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-white placeholder:text-white/30 py-2 max-h-[160px] min-h-[56px]"
            />
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || generating}
              className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white transition-all ${
                prompt.trim()
                  ? "bg-gradient-to-r from-violet-500 to-fuchsia-500"
                  : "bg-transparent"
              } disabled:opacity-20`}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>

          {/* Songs list or sample */}
          <div className="mt-6 space-y-3">
            {songs.length > 0 ? (
              <>
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Your Tracks</p>
                {songs.map(song => (
                  <motion.button
                    key={song.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/voice/music/${song.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                      <img
                        src="/images/song-cover-default.png"
                        alt="cover"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{song.title}</p>
                      <p className="text-xs text-white/40 truncate">{song.prompt}</p>
                    </div>
                    <Play className="w-4 h-4 text-white/40 shrink-0" />
                  </motion.button>
                ))}
              </>
            ) : (
              <>
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium">For Example</p>
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  className="rounded-2xl overflow-hidden border border-white/10 bg-white/5"
                >
                  <div className="w-full h-48 overflow-hidden bg-gradient-to-br from-violet-600/30 via-fuchsia-500/20 to-pink-500/30 flex items-center justify-center">
                    <Music className="w-16 h-16 text-white/20" />
                  </div>
                  <div className="p-4 flex items-center gap-3">
                    <button
                      onClick={toggleSample}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shrink-0"
                    >
                      {playingSample ? (
                        <Pause className="w-4 h-4" fill="white" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" fill="white" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">Egypt — Beauty in Simplicity</p>
                      <p className="text-xs text-white/40">Sample Track · Megsy AI</p>
                    </div>
                  </div>
                </motion.div>
                <audio
                  ref={sampleAudioRef}
                  src="/audio/sample-track.mp3"
                  onEnded={() => setPlayingSample(false)}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MusicGeneratorPage;
