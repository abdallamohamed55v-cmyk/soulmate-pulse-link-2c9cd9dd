import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, MoreHorizontal, RotateCw, Globe, Loader2, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const WEBLY_BASE = "https://wxphtsgezburjqoqiqqo.supabase.co/functions/v1";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const PreviewPage = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [search] = useSearchParams();
  const conversationId = search.get("conversation_id") || "";
  const webly = search.get("webly") || projectId || "";

  const [route, setRoute] = useState("/");
  const [iframeKey, setIframeKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [routesOpen, setRoutesOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [localHtml, setLocalHtml] = useState<string | null>(null);
  const [routes, setRoutes] = useState<string[]>(["/"]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const previewBase = `${WEBLY_BASE}/webly-site/${webly}`;
  const previewUrl = `${previewBase}${route.startsWith("/") ? route : "/" + route}`;
  const iframeSrc = localHtml ? `data:text/html;charset=utf-8,${encodeURIComponent(localHtml)}` : previewUrl;

  // Load HTML for current route + collect available routes from snapshot + read published URL
  useEffect(() => {
    if (!projectId) return;
    supabase
      .from("projects")
      .select("files_snapshot, status, preview_url")
      .eq("id", projectId)
      .maybeSingle()
      .then(({ data }) => {
        const files = (data as any)?.files_snapshot || {};
        const html =
          files[route] ||
          files[`/${route.replace(/^\/+/, "")}`] ||
          files["/index.html"] ||
          files["index.html"];
        setLocalHtml(typeof html === "string" ? html : null);

        const found = Object.keys(files)
          .filter((p) => /\.html?$/i.test(p))
          .map((p) => {
            let r = p.startsWith("/") ? p : "/" + p;
            r = r.replace(/index\.html?$/i, "");
            r = r.replace(/\.html?$/i, "");
            if (r === "") r = "/";
            return r;
          });
        setRoutes(Array.from(new Set(["/", ...found])));

        const status = (data as any)?.status;
        const url = (data as any)?.preview_url;
        if (status === "published" && typeof url === "string" && url.startsWith("http")) {
          setPublishedUrl(url);
        }
      });
  }, [projectId, route, iframeKey]);

  const handleRefresh = () => setIframeKey(k => k + 1);

  const handleBackToChat = () => {
    if (conversationId) navigate(`/code/workspace?conversation_id=${conversationId}&project_id=${projectId}`);
    else if (projectId) navigate(`/code/workspace?project_id=${projectId}`);
    else navigate("/code");
  };

  const handlePublish = async () => {
    if (!projectId) return;
    setPublishing(true);
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/webly-proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ action: "deploy", project_id: webly, project_row_id: projectId }),
      });
      const data = await r.json().catch(() => ({} as any));
      const url = data?.cloudflare_url || data?.url || data?.public_url;
      if (data?.ok && url) {
        setPublishedUrl(url);
        await supabase.from("projects").update({ status: "published", preview_url: url }).eq("id", projectId);
        toast.success(publishedUrl ? "Republished" : "Published");
      } else {
        toast.error("Publish failed. Try again.");
      }
    } catch {
      toast.error("Publish failed. Try again.");
    }
    setPublishing(false);
  };

  const pickRoute = (r: string) => {
    setRoute(r);
    setRoutesOpen(false);
    setIframeKey(k => k + 1);
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {webly || localHtml ? (
        <iframe
          ref={iframeRef}
          key={iframeKey}
          src={iframeSrc}
          className="absolute inset-0 w-full h-full bg-white border-0"
          title="Project preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-gradient-to-br from-background to-muted text-foreground">
          <div className="w-16 h-16 rounded-2xl bg-foreground/5 flex items-center justify-center mb-4">
            <Globe className="w-7 h-7 opacity-60" />
          </div>
          <h2 className="text-lg font-semibold mb-1">No preview yet</h2>
          <p className="text-sm text-muted-foreground max-w-xs">Start a build from chat — your live preview will appear here automatically.</p>
          <button onClick={handleBackToChat} className="mt-5 px-4 h-10 rounded-full bg-foreground text-background text-sm font-medium hover:scale-[1.02] transition-transform">Back to chat</button>
        </div>
      )}

      {/* Routes top bar — opens above when route input clicked */}
      <AnimatePresence>
        {routesOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setRoutesOpen(false)} />
            <motion.div
              initial={{ y: "-100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed top-0 inset-x-0 z-50 px-3 pt-3 pb-3 bg-foreground/95 backdrop-blur-2xl border-b border-background/10 max-h-[60vh] overflow-y-auto"
            >
              <p className="text-[10px] uppercase tracking-wider text-background/50 px-2 mb-2 font-semibold">Project routes</p>
              <div className="flex flex-wrap gap-2">
                {routes.map(r => (
                  <button
                    key={r}
                    onClick={() => pickRoute(r)}
                    className={`px-3 h-9 rounded-full text-xs font-mono transition-colors ${
                      r === route ? "bg-background text-foreground" : "bg-background/10 text-background hover:bg-background/20"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating bottom dock */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50 max-w-[calc(100vw-2rem)]">
        {/* Chat button */}
        <button
          onClick={handleBackToChat}
          className="shrink-0 h-11 w-11 rounded-full bg-foreground text-background shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
          title="Back to chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Route bar — clicking it opens the routes top sheet */}
        <button
          onClick={() => setRoutesOpen(true)}
          className="flex items-center gap-1.5 h-11 px-4 rounded-full bg-foreground/95 backdrop-blur-xl text-background shadow-2xl min-w-[160px]"
        >
          <Globe className="w-4 h-4 opacity-70" />
          <span className="text-xs font-mono truncate flex-1 text-left">{route}</span>
        </button>

        {/* Three dots menu */}
        <button
          onClick={() => setMenuOpen(true)}
          className="shrink-0 h-11 w-11 rounded-full bg-foreground/95 text-background backdrop-blur-xl shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom sheet: Publish + Refresh */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 z-[70] rounded-t-[28px] bg-card/95 backdrop-blur-2xl border-t border-border/60 px-5 pt-3 pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-foreground/20 mx-auto mb-4" />

              <button
                onClick={() => { setMenuOpen(false); handleRefresh(); }}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] text-foreground hover:bg-accent/40 transition-colors"
              >
                <RotateCw className="w-5 h-5" /> Refresh preview
              </button>

              <button
                onClick={handlePublish}
                disabled={publishing}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] text-foreground hover:bg-accent/40 transition-colors disabled:opacity-40"
              >
                {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : publishedUrl ? <RotateCw className="w-5 h-5" /> : <Check className="w-5 h-5 text-emerald-500" />}
                {publishing ? "Publishing..." : publishedUrl ? "Republish project" : "Publish project"}
              </button>

              {publishedUrl && (
                <a
                  href={publishedUrl} target="_blank" rel="noreferrer"
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-[14px] text-primary hover:bg-accent/40 transition-colors break-all"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span className="truncate">{publishedUrl.replace(/^https?:\/\//, "")}</span>
                </a>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PreviewPage;
