import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ToolPageLayout, { VideoUploadBox, ImageUploadBox } from "@/components/ToolPageLayout";

const VideoBgReplacerPage = () => {
  const [video, setVideo] = useState<string | null>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!video) { toast.error("Please upload a video"); return; }
    if (!bgImage) { toast.error("Please upload a background image"); return; }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("video-tools", {
        body: { tool: "video-bg-replacer", video, backgroundImage: bgImage },
      });
      if (error) throw error;
      if (data?.url) setResultUrl(data.url);
      else throw new Error(data?.error || "Failed");
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setIsGenerating(false); }
  };

  return (
    <ToolPageLayout title="Video BG Replacer" cost={3} costLabel="3 MC/sec" toolId="video-bg-replacer" onGenerate={handleGenerate} isGenerating={isGenerating} resultUrl={resultUrl} resultType="video" backTo="/videos">
      <VideoUploadBox label="Upload your video" video={video} onUpload={setVideo} onClear={() => setVideo(null)} />
      <ImageUploadBox label="Upload new background" image={bgImage} onUpload={setBgImage} onClear={() => setBgImage(null)} />
    </ToolPageLayout>
  );
};
export default VideoBgReplacerPage;
