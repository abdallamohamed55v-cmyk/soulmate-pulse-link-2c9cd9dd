import { useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ToolPageLayout, { ImageUploadBox, AudioUploadBox } from "@/components/ToolPageLayout";

const TalkingPhotoPage = () => {
  const [image, setImage] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string | null>(null);
  const [script, setScript] = useState("");
  const [duration, setDuration] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const cost = duration * 1.5;

  const handleGenerate = async () => {
    if (!image) { toast.error("Please upload a photo"); return; }
    if (!script.trim() && !audioData) { toast.error("Please add a script or audio"); return; }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("video-tools", {
        body: { tool: "talking-photo", image, audio: audioData, script: script.trim(), duration },
      });
      if (error) throw error;
      if (data?.url) setResultUrl(data.url);
      else throw new Error(data?.error || "Failed");
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setIsGenerating(false); }
  };

  return (
    <ToolPageLayout title="Talking Photo" cost={cost} costLabel={`1.5 MC/sec · ${cost} MC total`} toolId="talking-photo" onGenerate={handleGenerate} isGenerating={isGenerating} resultUrl={resultUrl} resultType="video">
      <ImageUploadBox label="Upload photo (required)" image={image} onUpload={setImage} onClear={() => setImage(null)} />
      <AudioUploadBox label="Upload audio file" audioName={audioName} onUpload={(data, name) => { setAudioData(data); setAudioName(name); }} onClear={() => { setAudioData(null); setAudioName(null); }} />
      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder="Or type a script for the talking photo..."
        className="w-full rounded-2xl border border-border/50 bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Duration: {duration}s</p>
        <input type="range" min={3} max={30} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full" />
      </div>
    </ToolPageLayout>
  );
};
export default TalkingPhotoPage;
