import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ToolPageLayout, { VideoUploadBox, AudioUploadBox } from "@/components/ToolPageLayout";

const LipSyncPage = () => {
  const [video, setVideo] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!video || !audioData) { toast.error("Please upload both video and audio"); return; }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("video-tools", {
        body: { tool: "lip-sync", video, audio: audioData },
      });
      if (error) throw error;
      if (data?.url) setResultUrl(data.url);
      else throw new Error(data?.error || "Failed");
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setIsGenerating(false); }
  };

  return (
    <ToolPageLayout title="Lip Sync" cost={6} costLabel="6 MC per minute" toolId="lip-sync" onGenerate={handleGenerate} isGenerating={isGenerating} resultUrl={resultUrl} resultType="video">
      <VideoUploadBox label="Upload video" video={video} onUpload={setVideo} onClear={() => setVideo(null)} />
      <AudioUploadBox label="Upload audio" audioName={audioName} onUpload={(data, name) => { setAudioData(data); setAudioName(name); }} onClear={() => { setAudioData(null); setAudioName(null); }} />
    </ToolPageLayout>
  );
};
export default LipSyncPage;
