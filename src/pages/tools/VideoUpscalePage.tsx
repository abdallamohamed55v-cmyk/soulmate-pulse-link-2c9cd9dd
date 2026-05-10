import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ToolPageLayout, { VideoUploadBox } from "@/components/ToolPageLayout";

const VideoUpscalePage = () => {
  const [video, setVideo] = useState<string | null>(null);
  const [tier, setTier] = useState<'standard' | 'pro'>('standard');
  const [resolution, setResolution] = useState<'1080p' | '2K' | '4K'>('1080p');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const PRICING: Record<string, Record<string, number>> = {
    standard: { '1080p': 1, '2K': 1, '4K': 1 },
    pro: { '1080p': 1, '2K': 2, '4K': 3 },
  };
  const costPerSec = PRICING[tier][resolution];

  const handleGenerate = async () => {
    if (!video) { toast.error("Please upload a video"); return; }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("video-tools", {
        body: { tool: "upscale", video, tier, resolution },
      });
      if (error) throw error;
      if (data?.url) setResultUrl(data.url);
      else throw new Error(data?.error || "Failed");
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setIsGenerating(false); }
  };

  return (
    <ToolPageLayout title="Video Upscale" cost={costPerSec} costLabel={`${costPerSec} MC per second`} toolId="video-upscale" onGenerate={handleGenerate} isGenerating={isGenerating} resultUrl={resultUrl} resultType="video">
      <VideoUploadBox label="Upload video" video={video} onUpload={setVideo} onClear={() => setVideo(null)} />
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Quality Tier</p>
        <div className="flex gap-2">
          {(['standard', 'pro'] as const).map(t => (
            <button key={t} onClick={() => setTier(t)} className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${tier === t ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground'}`}>{t}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Resolution</p>
        <div className="flex gap-2">
          {(['1080p', '2K', '4K'] as const).map(r => (
            <button key={r} onClick={() => setResolution(r)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${resolution === r ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground'}`}>{r}</button>
          ))}
        </div>
      </div>
    </ToolPageLayout>
  );
};
export default VideoUpscalePage;
