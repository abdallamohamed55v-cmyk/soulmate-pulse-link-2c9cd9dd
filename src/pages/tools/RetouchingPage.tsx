import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ToolPageLayout, { ImageUploadBox } from "@/components/ToolPageLayout";

const RetouchingPage = () => {
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const processImage = (img: string) => {
    setImage(img);
    setIsGenerating(true);
    supabase.functions.invoke("image-tools", { body: { tool: "retouching", image: img } })
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
    <ToolPageLayout title="Retouching" cost={1} toolId="retouching" onGenerate={handleGenerate} isGenerating={isGenerating} resultUrl={resultUrl} autoProcess onFileSelected={processImage}>
      <ImageUploadBox label="Upload photo to retouch" image={image} onUpload={processImage} onClear={() => setImage(null)} />
    </ToolPageLayout>
  );
};
export default RetouchingPage;