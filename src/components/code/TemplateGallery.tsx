import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Sparkles } from "lucide-react";
import registry from "@/lib/codeTemplatesRegistry.json";

interface TemplateMeta { slug: string; name: string }

const TPL: TemplateMeta[] = registry as TemplateMeta[];

// Cohesive gradient backdrops keyed off template slug.
function gradientFor(slug: string) {
  const palettes = [
    "linear-gradient(135deg,#1e3a5f 0%,#2563eb 60%,#1e40af 100%)",
    "linear-gradient(135deg,#5f1e3a 0%,#e11d48 60%,#9f1239 100%)",
    "linear-gradient(135deg,#3a1e5f 0%,#7c3aed 60%,#6d28d9 100%)",
    "linear-gradient(135deg,#1e4a4a 0%,#0d9488 60%,#0f766e 100%)",
    "linear-gradient(135deg,#5f4a1e 0%,#eab308 60%,#ca8a04 100%)",
    "linear-gradient(135deg,#1e2a5f 0%,#4f46e5 60%,#4338ca 100%)",
    "linear-gradient(135deg,#5f1e4a 0%,#d946ef 60%,#a21caf 100%)",
    "linear-gradient(135deg,#1e5f2a 0%,#16a34a 60%,#15803d 100%)",
    "linear-gradient(135deg,#3a1e1e 0%,#ef4444 60%,#dc2626 100%)",
    "linear-gradient(135deg,#1e3a3a 0%,#14b8a6 60%,#0d9488 100%)",
  ];
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
}

interface Props {
  onPreview: (slug: string, name: string) => void;
  onUse: (slug: string, name: string) => void;
}

const TemplateGallery = ({ onPreview, onUse }: Props) => {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Premium Templates
          </h3>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Tap a template to preview, or remix it into your own project.
          </p>
        </div>
        <span className="text-xs text-muted-foreground/60">{TPL.length}</span>
      </div>
      <div className="overflow-x-auto -mx-5 px-5 sm:-mx-8 sm:px-8 scrollbar-hide">
        <div className="flex min-w-max gap-3 pb-2">
          {TPL.map((t, idx) => (
            <TemplateCard
              key={t.slug}
              tpl={t}
              idx={idx}
              onPreview={() => onPreview(t.slug, t.name)}
              onUse={() => onUse(t.slug, t.name)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const TemplateCard = ({
  tpl, idx, onPreview, onUse,
}: { tpl: TemplateMeta; idx: number; onPreview: () => void; onUse: () => void }) => {
  const [hover, setHover] = useState(false);
  const url = `/templates/${tpl.slug}/index.html`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.03, 0.4) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative w-72 sm:w-80 shrink-0 rounded-2xl overflow-hidden border border-border/60 bg-card group"
      style={{ background: gradientFor(tpl.slug) }}
    >
      <div className="relative h-44 w-full overflow-hidden bg-black/40">
        {/* Live mini preview via scaled iframe (loads on hover/visibility) */}
        <div
          aria-hidden
          className="absolute inset-0 origin-top-left pointer-events-none"
          style={{ transform: "scale(0.25)", width: "1280px", height: "720px" }}
        >
          <iframe
            src={url}
            title={tpl.name}
            sandbox="allow-scripts allow-same-origin"
            scrolling="no"
            className="w-[1280px] h-[720px] border-0 bg-white"
            loading="lazy"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      </div>
      <div className="px-4 py-3 space-y-3 bg-black/60 backdrop-blur-md">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/60">Megsy template</p>
          <p className="text-sm font-bold text-white truncate mt-0.5">{tpl.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPreview}
            className="flex-1 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
          <button
            onClick={onUse}
            className="flex-1 h-9 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-bold flex items-center justify-center gap-1.5 transition"
          >
            <Sparkles className="h-3.5 w-3.5" /> Use
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default TemplateGallery;
