import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ToolPageLayout from "@/components/ToolPageLayout";

const STYLES = [
  { id: "minimal", label: "Minimal", desc: "Clean & simple" },
  { id: "bold", label: "Bold", desc: "Strong & impactful" },
  { id: "vintage", label: "Vintage", desc: "Retro & classic" },
  { id: "tech", label: "Tech", desc: "Modern & digital" },
  { id: "playful", label: "Playful", desc: "Fun & creative" },
  { id: "luxury", label: "Luxury", desc: "Premium & elegant" },
];

const LogoGeneratorPage = () => {
  const [brandName, setBrandName] = useState("");
  const [style, setStyle] = useState(STYLES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!brandName.trim()) { toast.error("Enter your brand name"); return; }
    setIsGenerating(true);
    try {
      const styleDesc = style.id === "minimal" ? "Clean lines, minimal elements, modern sans-serif typography" : style.id === "bold" ? "Strong typography, bold shapes, high contrast colors" : style.id === "vintage" ? "Retro typography, worn textures, classic color palette" : style.id === "tech" ? "Geometric shapes, gradient colors, modern futuristic font" : style.id === "playful" ? "Rounded shapes, vibrant colors, fun typography" : "Gold accents, serif font, premium sophisticated aesthetic";
      const prompt = `Design a professional logo for a brand called "${brandName}". Style direction: ${styleDesc}. White background, vector-style, scalable. Do NOT write the style name or any label text below or around the logo. The logo should contain ONLY the brand name "${brandName}" stylized as a logo.`;
      const { data, error } = await supabase.functions.invoke("image-tools", {
        body: { tool: "logo-generator", prompt },
      });
      if (error) throw error;
      if (data?.url) setResultUrl(data.url);
      else throw new Error(data?.error || "Failed");
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setIsGenerating(false); }
  };

  return (
    <ToolPageLayout title="AI Logo Generator" cost={2} toolId="logo-generator" onGenerate={handleGenerate} isGenerating={isGenerating} resultUrl={resultUrl} skipLanding>
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Brand Name</p>
        <input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Enter your brand name..." className="w-full px-4 py-3.5 rounded-xl bg-accent/30 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Style</p>
        <div className="grid grid-cols-3 gap-2">
          {STYLES.map(s => (
            <button key={s.id} onClick={() => setStyle(s)} className={`py-3 rounded-xl text-center transition-all ${style.id === s.id ? "bg-primary text-primary-foreground" : "bg-accent/40 text-muted-foreground hover:bg-accent"}`}>
              <p className="text-xs font-medium">{s.label}</p>
              <p className="text-[10px] opacity-70">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </ToolPageLayout>
  );
};
export default LogoGeneratorPage;
