import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Share2, Globe, Lock, Copy } from "lucide-react";
import LiveSitePreview from "@/components/LiveSitePreview";
import { toast } from "sonner";

interface Site {
  id: string;
  title: string;
  jsx_code: string | null;
  share_slug: string;
  is_public: boolean;
  status: string;
}

export default function SiteDetailPage() {
  const { id } = useParams();
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("generated_sites")
      .select("id,title,jsx_code,share_slug,is_public,status")
      .eq("id", id!)
      .single();
    if (error) toast.error(error.message);
    setSite(data as Site);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  const togglePublic = async () => {
    if (!site) return;
    const { error } = await supabase
      .from("generated_sites")
      .update({ is_public: !site.is_public })
      .eq("id", site.id);
    if (error) return toast.error(error.message);
    setSite({ ...site, is_public: !site.is_public });
    toast.success(!site.is_public ? "تم النشر للعموم" : "أصبح خاصاً");
  };

  const copyLink = () => {
    if (!site) return;
    const url = `${window.location.origin}/site/${site.share_slug}`;
    navigator.clipboard.writeText(url);
    toast.success("تم نسخ الرابط");
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  if (!site) return <div className="p-8">غير موجود</div>;

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b p-3 flex items-center justify-between gap-3 bg-background">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/sites">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="font-semibold truncate">{site.title}</h1>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              site.status === "completed"
                ? "bg-green-500/10 text-green-600"
                : "bg-yellow-500/10 text-yellow-600"
            }`}
          >
            {site.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={togglePublic}>
            {site.is_public ? (
              <>
                <Globe className="w-4 h-4 mr-1" /> عام
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-1" /> خاص
              </>
            )}
          </Button>
          {site.is_public && (
            <>
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="w-4 h-4 mr-1" /> نسخ الرابط
              </Button>
              <a href={`/site/${site.share_slug}`} target="_blank" rel="noreferrer">
                <Button size="sm">
                  <Share2 className="w-4 h-4 mr-1" /> فتح
                </Button>
              </a>
            </>
          )}
        </div>
      </header>
      <div className="flex-1 bg-zinc-100 dark:bg-zinc-900">
        <LiveSitePreview jsx={site.jsx_code || ""} />
      </div>
    </div>
  );
}
