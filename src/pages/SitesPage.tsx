import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Globe, Loader2, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Site {
  id: string;
  title: string;
  prompt: string;
  status: string;
  share_slug: string;
  is_public: boolean;
  created_at: string;
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("generated_sites")
      .select("id,title,prompt,status,share_slug,is_public,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setSites((data as Site[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("حذف هذا الموقع؟")) return;
    const { error } = await supabase.from("generated_sites").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setSites((s) => s.filter((x) => x.id !== id));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Globe className="w-8 h-8 text-primary" />
              مواقعي المولّدة
            </h1>
            <p className="text-muted-foreground mt-1">
              landing pages مولدة بالذكاء الاصطناعي
            </p>
          </div>
          <Link to="/sites/new">
            <Button size="lg">
              <Plus className="w-4 h-4 mr-2" />
              موقع جديد
            </Button>
          </Link>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : sites.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-2xl">
            <Globe className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">لا توجد مواقع بعد</h3>
            <p className="text-muted-foreground mb-6">
              اكتب فكرتك ودع الذكاء الاصطناعي يبني لك موقعاً متكاملاً
            </p>
            <Link to="/sites/new">
              <Button>ابدأ التوليد</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sites.map((s) => (
              <div
                key={s.id}
                className="group border rounded-2xl overflow-hidden bg-card hover:shadow-lg transition-shadow"
              >
                <Link to={`/sites/${s.id}`}>
                  <div className="aspect-video bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 flex items-center justify-center">
                    <Globe className="w-12 h-12 text-primary/40" />
                  </div>
                </Link>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold line-clamp-1 flex-1">{s.title}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        s.status === "completed"
                          ? "bg-green-500/10 text-green-600"
                          : s.status === "failed"
                          ? "bg-red-500/10 text-red-600"
                          : "bg-yellow-500/10 text-yellow-600"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {s.prompt}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Link to={`/sites/${s.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        فتح
                      </Button>
                    </Link>
                    {s.is_public && (
                      <a
                        href={`/site/${s.share_slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(s.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
