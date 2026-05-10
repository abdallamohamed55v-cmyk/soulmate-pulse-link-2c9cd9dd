import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ToolPageLayout, { ImageUploadBox } from "@/components/ToolPageLayout";

const SketchToImagePage = () => {
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const processImage = (img: string) => {
    setImage(img);
    setIsGenerating(true);
    supabase.functions.invoke("image-tools", { body: { tool: "sketch-to-image", image: img } })
      .then(({ data, error }) => {
        if (error) { toast.error("Failed"); setIsGenerating(false); return; }
        if (data?.url) setResultUrl(data.url);
        else toast.error(data?.error || "Failed");
        setIsGenerating(false);
      });
  };

  const handleGenerate = async () => {
    if (!image) { toast.error("Please upload a sketch"); return; }
    processImage(image);
  };

  return (
    <ToolPageLayout title="Sketch to Image" cost={1} toolId="sketch-to-image" onGenerate={handleGenerate} isGenerating={isGenerating} resultUrl={resultUrl} autoProcess onFileSelected={processImage}>
      <ImageUploadBox label="Upload your sketch" image={image} onUpload={processImage} onClear={() => setImage(null)} />
    </ToolPageLayout>
  );
};
export default SketchToImagePage;