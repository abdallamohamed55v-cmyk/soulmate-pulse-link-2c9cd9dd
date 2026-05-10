-- Voice templates table (for voice changer tool)
CREATE TABLE public.voice_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  preview_image_url TEXT,
  audio_file_url TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voice templates readable by all authenticated"
ON public.voice_templates FOR SELECT TO authenticated USING (true);

-- TTS voices table (for text-to-speech tool)
CREATE TABLE public.tts_voices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  preview_audio_url TEXT NOT NULL,
  voice_id TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tts_voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TTS voices readable by all authenticated"
ON public.tts_voices FOR SELECT TO authenticated USING (true);