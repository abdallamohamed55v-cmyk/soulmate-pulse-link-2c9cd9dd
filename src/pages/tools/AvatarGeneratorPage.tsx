import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ToolPageLayout, { ImageUploadBox } from "@/components/ToolPageLayout";

const STYLES = [
  { id: "3d", label: "3D Avatar", prompt: "as a stylized 3D animated character, Pixar-style" },
  { id: "cartoon", label: "Cartoon", prompt: "as a cartoon illustration character, vibrant colors" },
  { id: "anime", label: "Anime", prompt: "as an anime character, Japanese manga style" },
  { id: "pixel", label: "Pixel Art", prompt: "as pixel art retro game character, 16-bit style" },
  { id: "watercolor", label: "Watercolor", prompt: "as a beautiful watercolor painting portrait" },
  { id: "pop-art", label: "Pop Art", prompt: "as a pop art portrait, Andy Warhol style, bold colors" },
];

const AvatarGeneratorPage = () => {
  const [image, setImage] = useState<string | null>(null);
  const [style, setStyle] = useState(STYLES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!image) { toast.error("Please upload a photo"); return; }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("image-tools", {
        body: { tool: "avatar-generator", image, prompt: style.prompt },
      });
      if (error) throw error;
      if (data?.url) setResultUrl(data.url);
      else throw new Error(data?.error || "Failed");
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setIsGenerating(false); }
  };

  return (
    <ToolPageLayout title="AI Avatar Generator" cost={3} toolId="avatar-generator" onGenerate={handleGenerate} isGenerating={isGenerating} resultUrl={resultUrl}>
      <ImageUploadBox label="Upload your photo" image={image} onUpload={setImage} onClear={() => setImage(null)} />
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Choose Style</p>
        <div className="grid grid-cols-3 gap-2">
          {STYLES.map(s => (
            <button key={s.id} onClick={() => setStyle(s)} className={`py-3 rounded-xl text-xs font-medium transition-all ${style.id === s.id ? "bg-primary text-primary-foreground" : "bg-accent/40 text-muted-foreground hover:bg-accent"}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </ToolPageLayout>
  );
};
export default AvatarGeneratorPage;
