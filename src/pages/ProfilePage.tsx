import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, User, Camera, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ProfilePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"images" | "videos">("images");
  const [displayName, setDisplayName] = useState("User");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [maxCredits] = useState(100);
  const [stats, setStats] = useState({ images: 0, videos: 0, chats: 0 });
  const [mediaItems, setMediaItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    loadMedia();
  }, [activeTab]);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email || "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, credits")
      .eq("id", user.id)
      .single();

    if (profile) {
      setDisplayName(profile.display_name || user.email?.split("@")[0] || "User");
      setAvatarUrl(profile.avatar_url);
      setCredits(Number(profile.credits) || 0);
    }

    // Count stats
    const [chatCount, imageCount, videoCount] = await Promise.all([
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("mode", "chat").eq("user_id", user.id),
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("mode", "images").eq("user_id", user.id),
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("mode", "videos").eq("user_id", user.id),
    ]);

    setStats({
      chats: chatCount.count || 0,
      images: imageCount.count || 0,
      videos: videoCount.count || 0,
    });
    setLoading(false);
  };

  const loadMedia = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMediaItems([]); return; }
    const mode = activeTab === "images" ? "images" : "videos";
    const { data: convs } = await supabase
      .from("conversations")
      .select("id")
      .eq("mode", mode)
      .eq("user_id", user.id)
      .limit(50);

    if (!convs || convs.length === 0) {
      setMediaItems([]);
      return;
    }

    const convIds = convs.map(c => c.id);
    const { data: msgs } = await supabase
      .from("messages")
      .select("images")
      .in("conversation_id", convIds)
      .not("images", "is", null);

    const allMedia = msgs?.flatMap(m => m.images || []) || [];
    setMediaItems(allMedia);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); return; }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();

    await supabase.rpc("update_profile_safe", { p_user_id: user.id, p_avatar_url: url });
    setAvatarUrl(url);
    toast.success("Avatar updated");
  };

  const creditsPercent = maxCredits > 0 ? Math.min((credits / maxCredits) * 100, 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center px-4 md:px-6 h-14 border-b border-border">
        <button onClick={() => navigate("/chat")} className="text-muted-foreground hover:text-foreground transition-colors mr-3">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-display font-bold text-lg text-foreground">Profile</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-6 mb-8">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-foreground flex items-center justify-center text-background"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={avatarInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-semibold text-foreground">{displayName}</h2>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>

          <div className="glass-panel p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-foreground font-medium">Credits</span>
              <span className="text-sm text-muted-foreground">{credits.toFixed(0)} MC</span>
            </div>
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-foreground/70 rounded-full" style={{ width: `${creditsPercent}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div>
              <p className="font-display text-xl font-bold text-foreground">{stats.images}</p>
              <p className="text-xs text-muted-foreground">Images</p>
            </div>
            <div>
              <p className="font-display text-xl font-bold text-foreground">{stats.videos}</p>
              <p className="text-xs text-muted-foreground">Videos</p>
            </div>
            <div>
              <p className="font-display text-xl font-bold text-foreground">{stats.chats}</p>
              <p className="text-xs text-muted-foreground">Chats</p>
            </div>
          </div>

          <div className="flex border-b border-border mb-6">
            <button
              onClick={() => setActiveTab("images")}
              className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "images" ? "text-foreground border-foreground" : "text-muted-foreground border-transparent"
              }`}
            >
              Images
            </button>
            <button
              onClick={() => setActiveTab("videos")}
              className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "videos" ? "text-foreground border-foreground" : "text-muted-foreground border-transparent"
              }`}
            >
              Videos
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {mediaItems.length === 0 ? (
              <div className="col-span-3 flex flex-col items-center justify-center py-16">
                <p className="text-muted-foreground text-sm">No {activeTab} yet</p>
                <p className="text-xs text-muted-foreground mt-1">Your generated {activeTab} will appear here</p>
              </div>
            ) : (
              mediaItems.map((url, i) => (
                <div key={i} className="relative aspect-square group">
                  {activeTab === "images" ? (
                    <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <video src={url} className="w-full h-full object-cover rounded-lg" />
                  )}
                  <a
                    href={url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
                  >
                    <Download className="w-5 h-5 text-foreground" />
                  </a>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
