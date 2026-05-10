import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ToolPageLayout, { ImageUploadBox } from "@/components/ToolPageLayout";

const SCENES = [
  { id: "studio", label: "Studio", prompt: "on a clean white studio backdrop with professional lighting" },
  { id: "marble", label: "Marble", prompt: "on an elegant marble surface with soft shadows" },
  { id: "nature", label: "Nature", prompt: "in an outdoor natural setting with greenery and soft sunlight" },
  { id: "lifestyle", label: "Lifestyle", prompt: "in a modern lifestyle setting, cozy home environment" },
  { id: "gradient", label: "Gradient", prompt: "on a smooth gradient background, floating product shot" },
  { id: "dark", label: "Dark Luxury", prompt: "on a dark luxury surface with dramatic rim lighting" },
];

const ProductPhotoPage = () => {
  const [image, setImage] = useState<string | null>(null);
  const [scene, setScene] = useState(SCENES[0]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!image) { toast.error("Please upload a product image"); return; }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("image-tools", {
        body: { tool: "product-photo", image, prompt: customPrompt || scene.prompt },
      });
      if (error) throw error;
      if (data?.url) setResultUrl(data.url);
      else throw new Error(data?.error || "Failed");
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setIsGenerating(false); }
  };

  return (
    <ToolPageLayout title="Product Photography" cost={2} toolId="product-photo" onGenerate={handleGenerate} isGenerating={isGenerating} resultUrl={resultUrl}>
      <ImageUploadBox label="Upload product image" image={image} onUpload={setImage} onClear={() => setImage(null)} />
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Scene</p>
        <div className="grid grid-cols-3 gap-2">
          {SCENES.map(s => (
            <button key={s.id} onClick={() => { setScene(s); setCustomPrompt(""); }} className={`py-3 rounded-xl text-xs font-medium transition-all ${scene.id === s.id && !customPrompt ? "bg-primary text-primary-foreground" : "bg-accent/40 text-muted-foreground hover:bg-accent"}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <input value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="Or describe a custom scene..." className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
    </ToolPageLayout>
  );
};
export default ProductPhotoPage;
