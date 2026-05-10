import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ALL_MODEL_DETAILS, type ModelDetail } from "@/lib/modelDetails";

export function useDynamicModels() {
  const [models, setModels] = useState<ModelDetail[]>(ALL_MODEL_DETAILS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: memories } = await supabase
          .from("memories")
          .select("key, value")
          .or("key.eq.models_hidden,key.eq.models_added,key.like.model_config_%");

        if (!memories || memories.length === 0) {
          setLoading(false);
          return;
        }

        const hiddenRaw = memories.find(m => m.key === "models_hidden");
        const addedRaw = memories.find(m => m.key === "models_added");
        const hidden: string[] = hiddenRaw ? JSON.parse(hiddenRaw.value) : [];
        const added: Partial<ModelDetail>[] = addedRaw ? JSON.parse(addedRaw.value) : [];

        const overrides: Record<string, Record<string, string>> = {};
        memories.filter(m => m.key.startsWith("model_config_")).forEach(m => {
          const id = m.key.replace("model_config_", "");
          try { overrides[id] = JSON.parse(m.value); } catch { /* skip */ }
        });

        // Filter hidden
        let result = ALL_MODEL_DETAILS.filter(m => !hidden.includes(m.id));

        // Apply overrides
        const applyOv = (m: ModelDetail, ov?: Record<string, string>): ModelDetail => {
          if (!ov) return m;
          let customization: Record<string, any> | undefined;
          if (ov.customization) { try { customization = JSON.parse(ov.customization); } catch {} }
          return {
            ...m,
            ...(ov.name && { name: ov.name }),
            ...(ov.credits !== undefined && { credits: Number(ov.credits) }),
            ...(ov.description && { description: ov.description }),
            ...(ov.speed && { speed: ov.speed as ModelDetail["speed"] }),
            ...(ov.quality && { quality: ov.quality as ModelDetail["quality"] }),
            ...(ov.requiresImage !== undefined && { requiresImage: ov.requiresImage === "true" }),
            ...(ov.maxImages !== undefined && { maxImages: Number(ov.maxImages) }),
            ...(ov.type && { type: ov.type as ModelDetail["type"] }),
            ...(customization && { customization }),
            ...(ov.icon_url && { iconUrl: ov.icon_url }),
            ...(ov.badges && { badges: ov.badges.split(",").filter(Boolean) }),
          };
        };

        result = result.map(m => applyOv(m, overrides[m.id]));

        // Add new models
        if (added.length > 0) {
          const MIME_IMG = ["image/jpeg", "image/png", "image/webp"];
          const newModels: ModelDetail[] = added.map(a => ({
            id: a.id || "",
            name: a.name || a.id || "",
            type: (a.type || "image") as ModelDetail["type"],
            credits: a.credits ?? 0,
            description: a.description || "",
            longDescription: a.longDescription || a.description || "",
            icon: a.icon || "Image",
            modes: a.modes || ["text-to-image"],
            acceptsImages: a.acceptsImages ?? false,
            requiresImage: a.requiresImage ?? false,
            maxImages: a.maxImages ?? 0,
            acceptedMimeTypes: a.acceptedMimeTypes || (a.requiresImage ? MIME_IMG : []),
            provider: a.provider || "Megsy",
            speed: a.speed || "standard",
            quality: a.quality || "high",
          }));
          result = [...result, ...newModels.map(m => applyOv(m, overrides[m.id]))];
        }

        setModels(result);
      } catch (e) {
        console.error("Failed to load dynamic models:", e);
      }
      setLoading(false);
    };
    load();
  }, []);

  return { models, loading };
}
