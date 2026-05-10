import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ToolPageLayout from "@/components/ToolPageLayout";

const StoryboardPage = () => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error("Please enter a prompt"); return; }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("image-tools", {
        body: { tool: "storyboard", prompt: prompt.trim() },
      });
      if (error) throw error;
      if (data?.url) setResultUrl(data.url);
      else throw new Error(data?.error || "Failed");
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setIsGenerating(false); }
  };

  return (
    <ToolPageLayout title="Storyboard" cost={1} toolId="storyboard" onGenerate={handleGenerate} isGenerating={isGenerating} resultUrl={resultUrl}>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your storyboard scene..."
        className="w-full rounded-2xl border border-border/50 bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </ToolPageLayout>
  );
};
export default StoryboardPage;
