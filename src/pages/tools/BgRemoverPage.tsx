import { useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ToolPageLayout, { ImageUploadBox } from "@/components/ToolPageLayout";

const BgRemoverPage = () => {
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const processImage = (img: string) => {
    setImage(img);
    setIsGenerating(true);
    supabase.functions.invoke("image-tools", { body: { tool: "bg-remover", image: img } })
      .then(({ data, error }) => {
        if (error) { toast.error("Failed"); setIsGenerating(false); return; }
        if (data?.url) setResultUrl(data.url);
        else toast.error(data?.error || "Failed");
        setIsGenerating(false);
      });
  };

  const handleGenerate = async () => {
    if (!image) { toast.error("Please upload an image"); return; }
    processImage(image);
  };

  return (
    <ToolPageLayout title="Background Remover" cost={0.5} toolId="bg-remover" onGenerate={handleGenerate} isGenerating={isGenerating} resultUrl={resultUrl} autoProcess onFileSelected={processImage}>
      <ImageUploadBox label="Upload image to remove background" image={image} onUpload={processImage} onClear={() => setImage(null)} />
    </ToolPageLayout>
  );
};
export default BgRemoverPage;