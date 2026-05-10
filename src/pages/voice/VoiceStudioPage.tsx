import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Play, Pause, Disc3, LayoutGrid, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/layouts/AppLayout";

const VoiceStudioPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [songs, setSongs] = useState<any[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("generated_songs")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      if (data) setSongs(data);
    };
    load();
  }, []);

  const togglePlay = (song: any) => {
    if (!audioRef.current) return;
    if (playingId === song.id) {
      audioRef.current.pause();
      setPlayingId(null);
    } else {
      audioRef.current.src = song.audio_url;
      audioRef.current.play();
      setPlayingId(song.id);
    }
  };

  return (
    <AppLayout onSelectConversation={() => {}} onNewChat={() => {}} activeConversationId={null}>
      <div className="h-full flex flex-col bg-background">
        <div className="sticky top-0 z-10 px-4 py-3 bg-background/80 backdrop-blur-xl flex items-center gap-3">
          <h1 className="text-base font-bold text-foreground">Voice Studio</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-24">
          {songs.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
              <Disc3 className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No generated audio yet</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Your generated voices and music will appear here</p>
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              {songs.map(song => (
                <motion.button
                  key={song.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => song.audio_url !== "pending" ? togglePlay(song) : navigate(`/voice/music/${song.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/20 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    {playingId === song.id ? (
                      <Pause className="w-4 h-4 text-primary" />
                    ) : (
                      <Play className="w-4 h-4 text-primary ml-0.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{song.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{song.prompt}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Navigation - same pill style */}
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

        <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />
      </div>
    </AppLayout>
  );
};

export default VoiceStudioPage;
