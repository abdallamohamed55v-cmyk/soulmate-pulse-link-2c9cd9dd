import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ToolPageLayout, { VideoUploadBox } from "@/components/ToolPageLayout";

const VideoExtenderPage = () => {
  const [video, setVideo] = useState<string | null>(null);
  const [extraSeconds, setExtraSeconds] = useState(5);
  const [withAudio, setWithAudio] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const costPerSec = withAudio ? 5 : 3;
  const totalCost = extraSeconds * costPerSec;

  const handleGenerate = async () => {
    if (!video) { toast.error("Please upload a video"); return; }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("video-tools", {
        body: { tool: "video-extender", video, extraSeconds, withAudio },
      });
      if (error) throw error;
      if (data?.url) setResultUrl(data.url);
      else throw new Error(data?.error || "Failed");
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setIsGenerating(false); }
  };

  return (
    <ToolPageLayout title="Video Extender" cost={totalCost} costLabel={`${costPerSec} MC/sec × ${extraSeconds}s = ${totalCost} MC`} toolId="video-extender" onGenerate={handleGenerate} isGenerating={isGenerating} resultUrl={resultUrl} resultType="video">
      <VideoUploadBox label="Upload video" video={video} onUpload={setVideo} onClear={() => setVideo(null)} />
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Extra seconds: {extraSeconds}s</p>
        <input type="range" min={2} max={15} value={extraSeconds} onChange={(e) => setExtraSeconds(Number(e.target.value))} className="w-full" />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => setWithAudio(!withAudio)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${withAudio ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground'}`}>
          {withAudio ? '🔊 With Audio' : '🔇 No Audio'}
        </button>
        <span className="text-xs text-muted-foreground">{withAudio ? '5 MC/sec' : '3 MC/sec'}</span>
      </div>
    </ToolPageLayout>
  );
};
export default VideoExtenderPage;
