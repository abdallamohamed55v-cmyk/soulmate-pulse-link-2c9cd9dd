import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import LiveSitePreview from "@/components/LiveSitePreview";

export default function PublicSitePage() {
  const { slug } = useParams();
  const [jsx, setJsx] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("generated_sites")
        .select("jsx_code,title,is_public")
        .eq("share_slug", slug!)
        .eq("is_public", true)
        .maybeSingle();
      if (!data) {
        setNotFound(true);
        return;
      }
      if (data.title) document.title = data.title;
      setJsx(data.jsx_code || "");
    })();
  }, [slug]);

  if (notFound)
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">الموقع غير متاح</h1>
          <p className="text-muted-foreground">قد يكون قد حُذف أو لم يُنشر بعد.</p>
        </div>
      </div>
    );
  if (jsx === null)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );

  return (
    <div className="fixed inset-0">
      <LiveSitePreview jsx={jsx} />
    </div>
  );
}
