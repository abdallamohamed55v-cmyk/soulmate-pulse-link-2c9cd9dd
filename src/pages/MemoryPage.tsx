import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Trash2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { DesktopSettingsLayout } from "@/components/DesktopSettingsLayout";

interface MemoryEntry {
  id: string;
  title: string | null;
  summary: string;
  scope: string;
  created_at: string;
}

// Butterfly SVG component with CSS wing animation
const ButterflyIcon = () => (
  <svg width="60" height="60" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g className="butterfly-left-wing">
      <ellipse cx="30" cy="35" rx="25" ry="18" fill="hsl(var(--primary))" opacity="0.6" transform="rotate(-20, 30, 35)" />
      <ellipse cx="28" cy="55" rx="18" ry="14" fill="hsl(var(--primary))" opacity="0.4" transform="rotate(-10, 28, 55)" />
    </g>
    <g className="butterfly-right-wing">
      <ellipse cx="70" cy="35" rx="25" ry="18" fill="hsl(var(--primary))" opacity="0.6" transform="rotate(20, 70, 35)" />
      <ellipse cx="72" cy="55" rx="18" ry="14" fill="hsl(var(--primary))" opacity="0.4" transform="rotate(10, 72, 55)" />
    </g>
    <ellipse cx="50" cy="50" rx="3" ry="20" fill="hsl(var(--foreground))" opacity="0.5" />
    <line x1="50" y1="30" x2="40" y2="18" stroke="hsl(var(--foreground))" strokeWidth="1" opacity="0.4" />
    <line x1="50" y1="30" x2="60" y2="18" stroke="hsl(var(--foreground))" strokeWidth="1" opacity="0.4" />
    <circle cx="40" cy="18" r="2" fill="hsl(var(--foreground))" opacity="0.4" />
    <circle cx="60" cy="18" r="2" fill="hsl(var(--foreground))" opacity="0.4" />
  </svg>
);

const FloatingButterfly = ({ delay, duration, id }: { delay: number; duration: number; id: number }) => {
  const [touched, setTouched] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const startX = id === 0 ? 15 : 75;
  const startY = id === 0 ? 25 : 60;

  const handleTouch = () => {
    setTouched(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setTouched(false), 2500);
  };

  return (
    <motion.div
      className="fixed pointer-events-auto z-[5] cursor-pointer"
      style={{ left: `${startX}%`, top: `${startY}%` }}
      animate={{
        x: [0, 80, -60, 120, -40, 0],
        y: [0, -40, 60, -80, 30, 0],
        rotate: [0, 15, -10, 20, -15, 0],
      }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
      onClick={handleTouch}
      onTouchStart={handleTouch}
    >
      <ButterflyIcon />
      <AnimatePresence>
        {touched && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: -10, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-xl bg-primary/90 text-primary-foreground text-xs font-medium shadow-lg"
          >
            Don't touch me, you fool!
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const MemoryPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { loadMemories(); }, []);

  const loadMemories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_memory_entries")
        .select("id, title, summary, scope, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setMemories(data || []);
    } catch (e) {
      console.error("Failed to load memories:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOne = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("user_memory_entries").delete().eq("id", id);
      if (error) throw error;
      setMemories((prev) => prev.filter((m) => m.id !== id));
      toast.success("Memory deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear ALL memories? This cannot be undone.")) return;
    setIsClearing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("user_memory_entries").delete().eq("user_id", user.id);
      if (error) throw error;
      setMemories([]);
      toast.success("All memories cleared");
    } catch {
      toast.error("Failed to clear memories");
    } finally {
      setIsClearing(false);
    }
  };

  const content = (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Only 2 butterflies */}
      <FloatingButterfly delay={0} duration={20} id={0} />
      <FloatingButterfly delay={5} duration={25} id={1} />

      <style>{`
        .butterfly-left-wing { transform-origin: 50px 50px; animation: bfWingL 0.25s ease-in-out infinite alternate; }
        .butterfly-right-wing { transform-origin: 50px 50px; animation: bfWingR 0.3s ease-in-out infinite alternate; }
        @keyframes bfWingL { from { transform: rotateY(0deg); } to { transform: rotateY(50deg); } }
        @keyframes bfWingR { from { transform: rotateY(0deg); } to { transform: rotateY(-50deg); } }
      `}</style>

      <div className="relative z-10 max-w-lg mx-auto px-4 pb-20">
        <div className="flex items-center justify-between py-4">
          {isMobile && (
            <button onClick={() => navigate("/settings")} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-lg font-bold text-foreground flex-1 text-center">Memory</h1>
          <div className="w-9" />
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="p-4 rounded-2xl bg-muted/20 border border-border/20 mb-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Megsy remembers important details about you to provide better, more personalized responses. These memories are private and only visible to you.
            </p>
          </div>

          {memories.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isClearing}
              className="w-full mb-4 py-3 rounded-xl border border-destructive/20 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Clear all memories
            </button>
          )}

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-sm">No memories yet</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Megsy will remember important things from your conversations</p>
            </div>
          ) : (
            <div className="space-y-2">
              {memories.map((memory, i) => (
                <motion.div
                  key={memory.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-3 rounded-xl border border-border/20 bg-card/50 hover:bg-card/80 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {memory.title && <p className="text-xs font-semibold text-foreground mb-0.5 truncate">{memory.title}</p>}
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{memory.summary}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-muted-foreground/50 capitalize">{memory.scope}</span>
                        <span className="text-[10px] text-muted-foreground/30">{new Date(memory.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteOne(memory.id)}
                      disabled={deletingId === memory.id}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
                    >
                      {deletingId === memory.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );

  if (!isMobile) {
    return (
      <DesktopSettingsLayout title="Memory" subtitle="Your personalized AI memory">
        {content}
      </DesktopSettingsLayout>
    );
  }

  return content;
};

export default MemoryPage;
