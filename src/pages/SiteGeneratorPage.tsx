import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Eye, Code2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import LiveSitePreview from "@/components/LiveSitePreview";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function SiteGeneratorPage() {
  const [searchParams] = useSearchParams();
  const [prompt, setPrompt] = useState(searchParams.get("prompt") || "");
  const [streaming, setStreaming] = useState(false);
  const [code, setCode] = useState("");
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const navigate = useNavigate();
  const codeRef = useRef<HTMLPreElement>(null);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    const p = searchParams.get("prompt");
    if (p && !autoStartedRef.current) {
      autoStartedRef.current = true;
      setTimeout(() => generate(), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => {
    if (!prompt.trim()) return toast.error("اكتب فكرتك أولاً");
    setStreaming(true);
    setCode("");

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("سجل الدخول أولاً");

      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-site`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok || !res.body) {
        const t = await res.text();
        throw new Error(t || "فشل التوليد");
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      let siteId = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const p = JSON.parse(data);
            if (p.siteId && !p.done) siteId = p.siteId;
            if (p.delta) {
              acc += p.delta;
              setCode(acc);
              if (codeRef.current)
                codeRef.current.scrollTop = codeRef.current.scrollHeight;
            }
            if (p.done && p.siteId) {
              toast.success("تم التوليد!");
              setTimeout(() => navigate(`/sites/${p.siteId}`), 600);
            }
            if (p.error) throw new Error(p.error);
          } catch {
            /* partial */
          }
        }
      }
    } catch (e) {
      toast.error(String((e as Error).message || e));
    } finally {
      setStreaming(false);
    }
  };

  // Strip markdown fences for live preview
  const previewCode = code.replace(/```(?:jsx?|tsx?|javascript)?\s*/g, "").replace(/```\s*$/g, "");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b p-4 flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-primary" />
        <h1 className="text-lg font-semibold">مولّد المواقع بالذكاء الاصطناعي</h1>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
        {/* Left: input + code stream */}
        <div className="border-l flex flex-col p-4 gap-3 overflow-hidden">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="مثال: موقع لتطبيق إدارة المهام مع خاصية الذكاء الاصطناعي، تصميم عصري، RTL عربي..."
            className="min-h-[120px] resize-none text-base"
            disabled={streaming}
          />
          <Button onClick={generate} disabled={streaming} size="lg">
            {streaming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> جاري التوليد...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" /> ولّد الموقع
              </>
            )}
          </Button>

          <div className="flex gap-2 text-sm">
            <button
              onClick={() => setTab("preview")}
              className={`px-3 py-1 rounded ${tab === "preview" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              <Eye className="w-3 h-3 inline mr-1" /> معاينة
            </button>
            <button
              onClick={() => setTab("code")}
              className={`px-3 py-1 rounded ${tab === "code" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              <Code2 className="w-3 h-3 inline mr-1" /> الكود
            </button>
          </div>

          <pre
            ref={codeRef}
            className="flex-1 bg-zinc-950 text-zinc-100 text-xs p-3 rounded-lg overflow-auto font-mono whitespace-pre-wrap"
            dir="ltr"
          >
            {code || "// الكود سيظهر هنا أثناء التوليد..."}
          </pre>
        </div>

        {/* Right: live preview */}
        <div className="bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
          <LiveSitePreview jsx={previewCode} />
        </div>
      </div>
    </div>
  );
}
