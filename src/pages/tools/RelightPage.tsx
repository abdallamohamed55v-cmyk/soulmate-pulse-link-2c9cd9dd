import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ToolPageLayout, { ImageUploadBox } from "@/components/ToolPageLayout";

const RelightPage = () => {
  const [image, setImage] = useState<string | null>(null);
  const [lightColor, setLightColor] = useState("#ffffff");
  const [lightDirection, setLightDirection] = useState("left");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const DIRECTIONS = ["left", "right", "top", "bottom", "center"];
  const COLORS = ["#ffffff", "#ff6b6b", "#4ecdc4", "#45b7d1", "#f9ca24", "#6c5ce7", "#fd79a8"];

  const handleGenerate = async () => {
    if (!image) { toast.error("Please upload an image"); return; }
    setIsGenerating(true);
    try {
      const colorName = lightColor === "#ffffff" ? "white" : lightColor === "#ff6b6b" ? "warm red" : lightColor === "#4ecdc4" ? "teal" : lightColor === "#45b7d1" ? "cool blue" : lightColor === "#f9ca24" ? "warm yellow" : lightColor === "#6c5ce7" ? "purple" : lightColor === "#fd79a8" ? "pink" : lightColor;
      const { data, error } = await supabase.functions.invoke("image-tools", {
        body: { tool: "relight", image, color: lightColor, direction: lightDirection, prompt: `Relight this image with ${colorName} light from the ${lightDirection} side, creating dramatic professional studio lighting` },
      });
      if (error) throw error;
      if (data?.url) setResultUrl(data.url);
      else throw new Error(data?.error || "Failed");
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setIsGenerating(false); }
  };

  const handleFileSelected = (dataUrl: string) => {
    setImage(dataUrl);
  };

  return (
    <ToolPageLayout title="Relight" cost={1} toolId="relight" onGenerate={handleGenerate} isGenerating={isGenerating} resultUrl={resultUrl} onFileSelected={handleFileSelected}>
      <ImageUploadBox label="Upload image" image={image} onUpload={setImage} onClear={() => setImage(null)} />
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Light Color</p>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setLightColor(c)} className={`w-8 h-8 rounded-full border-2 transition-all ${lightColor === c ? 'border-primary scale-110' : 'border-border/50'}`} style={{ backgroundColor: c }} />
          ))}
          <input type="color" value={lightColor} onChange={(e) => setLightColor(e.target.value)} className="w-8 h-8 rounded-full cursor-pointer" />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Light Direction</p>
        <div className="flex gap-2 flex-wrap">
          {DIRECTIONS.map((d) => (
            <button key={d} onClick={() => setLightDirection(d)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${lightDirection === d ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>
    </ToolPageLayout>
  );
};
export default RelightPage;
