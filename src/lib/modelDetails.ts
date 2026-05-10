// Centralized model details — descriptions, capabilities, modes, and requirements
// Image/Video models are now fully dynamic via admin bot. Only chat models are hardcoded.

export type ModelType = "chat" | "image" | "image-tool" | "video" | "video-i2v" | "video-avatar" | "video-effect" | "video-motion";

export interface ModelDetail {
  id: string;
  name: string;
  type: ModelType;
  credits: number;
  description: string;
  longDescription: string;
  icon: string;
  modes: string[];
  acceptsImages: boolean;
  requiresImage: boolean;
  maxImages: number;
  acceptedMimeTypes: string[];
  inputLabels?: string[];
  resolutions?: string[];
  notes?: string;
  provider: string;
  speed?: "fast" | "standard" | "slow";
  quality?: "standard" | "high" | "ultra";
  customization?: Record<string, any>;
  iconUrl?: string;
  badges?: string[];
  isFree?: boolean;
}

const MIME_IMG = ["image/jpeg", "image/png", "image/webp"];

export const FREE_MODEL_IDS = [
  "qwen-image-edit-plus",
  "flux2-klein-4b",
  "z-image-turbo-int8",
  "flux1-schnell",
  "ltx-2.3-22b",
  "ltx-2-19b",
];

export const ALL_MODEL_DETAILS: ModelDetail[] = [
  // ═══════════════════════════════════════════
  // CHAT MODELS — Megsy Tier System
  // ═══════════════════════════════════════════
  {
    id: "megsy-lite", name: "Megsy Lite", type: "chat", credits: 0,
    description: "Fast & free — Gemini 2.5 Flash Lite for everyday tasks.",
    longDescription: "Ultra-cheap, ultra-fast tier powered by Gemini 2.5 Flash Lite (primary) with auto-upgrade to Gemini 2.5 Flash for complex prompts. 1M context.",
    icon: "Zap", modes: ["text-to-text", "multimodal"], acceptsImages: false, requiresImage: false, maxImages: 0, acceptedMimeTypes: [],
    provider: "Megsy", speed: "fast", quality: "high", isFree: true,
    badges: ["FREE", "FAST"],
  },
  {
    id: "megsy-pro", name: "Megsy Pro", type: "chat", credits: 0,
    description: "Balanced — Gemini Flash + Kimi K2 (1T params) for hard tasks.",
    longDescription: "Pro tier: Gemini 2.5 Flash for daily chat, with auto-escalation to Kimi K2-0905 — a 1 Trillion parameter MoE model — when the task gets complex.",
    icon: "Brain", modes: ["text-to-text", "multimodal"], acceptsImages: false, requiresImage: false, maxImages: 0, acceptedMimeTypes: [],
    provider: "Megsy", speed: "fast", quality: "ultra",
    badges: ["1T", "BALANCED"],
  },
  {
    id: "megsy-max", name: "Megsy Max", type: "chat", credits: 0,
    description: "Strongest — Kimi K2 (1T) + K2 Thinking for deep reasoning.",
    longDescription: "Max tier: Kimi K2-0905 (1T MoE) for primary, escalating to Kimi K2 Thinking for the hardest reasoning, math, coding and analysis tasks. 262K context.",
    icon: "Sparkles", modes: ["text-to-text", "multimodal"], acceptsImages: false, requiresImage: false, maxImages: 0, acceptedMimeTypes: [],
    provider: "Megsy", speed: "standard", quality: "ultra",
    badges: ["1T", "THINKING"],
  },
  {
    id: "megsy-research", name: "Megsy Research", type: "chat", credits: 0,
    description: "Deep research — Qwen3-235B writer + Gemini 2.5 Pro analyst.",
    longDescription: "Two-stage research pipeline: Qwen3-235B (262K ctx, ultra-cheap output at $0.10/M) drafts long-form content, then Gemini 2.5 Pro synthesizes and refines. Built for academic depth at minimal cost.",
    icon: "BookOpen", modes: ["text-to-text"], acceptsImages: false, requiresImage: false, maxImages: 0, acceptedMimeTypes: [],
    provider: "Megsy", speed: "standard", quality: "ultra",
    badges: ["RESEARCH", "LONG-OUTPUT"],
  },
  // ═══════════════════════════════════════════
  // FREE IMAGE MODELS (deapi.ai — 1 MC each)
  // ═══════════════════════════════════════════
  {
    id: "flux2-klein-4b", name: "FLUX.2 Klein 4B BF16", type: "image", credits: 1,
    description: "Fast, lightweight image generation model. Free for all users.",
    longDescription: "FLUX.2 Klein 4B BF16 is a compact yet powerful text-to-image model from deapi.ai, optimized for speed and quality at a fraction of the cost.",
    icon: "Image", modes: ["text-to-image"], acceptsImages: false, requiresImage: false, maxImages: 0, acceptedMimeTypes: [],
    provider: "deapi", speed: "fast", quality: "standard", isFree: true,
    badges: ["FREE", "FAST"],
  },
  {
    id: "z-image-turbo-int8", name: "Z-Image-Turbo INT8", type: "image", credits: 1,
    description: "Ultra-fast turbo image generation. Free for all users.",
    longDescription: "Z-Image-Turbo INT8 delivers rapid image generation with optimized INT8 quantization for maximum speed.",
    icon: "Zap", modes: ["text-to-image"], acceptsImages: false, requiresImage: false, maxImages: 0, acceptedMimeTypes: [],
    provider: "deapi", speed: "fast", quality: "standard", isFree: true,
    badges: ["FREE", "FAST"],
  },
  {
    id: "flux1-schnell", name: "FLUX.1 schnell", type: "image", credits: 1,
    description: "Lightning-fast image generation. Free for all users.",
    longDescription: "FLUX.1 schnell is the fastest model in the FLUX family, delivering images in seconds with decent quality.",
    icon: "Zap", modes: ["text-to-image"], acceptsImages: false, requiresImage: false, maxImages: 0, acceptedMimeTypes: [],
    provider: "deapi", speed: "fast", quality: "standard", isFree: true,
    badges: ["FREE", "FAST"],
  },
  {
    id: "qwen-image-edit-plus", name: "Qwen Image Edit Plus", type: "image", credits: 1,
    description: "AI-powered image editing and transformation. Free for all users.",
    longDescription: "Qwen Image Edit Plus transforms your images using AI. Upload an image and describe how you want it changed.",
    icon: "Image", modes: ["image-to-image"], acceptsImages: true, requiresImage: true, maxImages: 1, acceptedMimeTypes: MIME_IMG,
    provider: "deapi", speed: "standard", quality: "high", isFree: true,
    badges: ["FREE", "IMG2IMG"],
  },
  // ═══════════════════════════════════════════
  // FREE VIDEO MODELS (deapi.ai — 1 MC each)
  // ═══════════════════════════════════════════
  {
    id: "ltx-2-19b", name: "LTX-2 19B Distilled FP8", type: "video", credits: 1,
    description: "Text-to-video generation. Free for all users.",
    longDescription: "LTX-2 19B Distilled FP8 generates videos from text prompts using a powerful 19B parameter model with FP8 optimization.",
    icon: "Video", modes: ["text-to-video"], acceptsImages: false, requiresImage: false, maxImages: 0, acceptedMimeTypes: [],
    provider: "deapi", speed: "standard", quality: "standard", isFree: true,
    badges: ["FREE"],
  },
  {
    id: "ltx-2.3-22b", name: "LTX-2.3 22B Distilled INT8", type: "video-i2v", credits: 1,
    description: "Image-to-video generation. Free for all users.",
    longDescription: "LTX-2.3 22B Distilled INT8 transforms your images into videos using a 22B parameter model with INT8 optimization.",
    icon: "Video", modes: ["image-to-video"], acceptsImages: true, requiresImage: true, maxImages: 1, acceptedMimeTypes: MIME_IMG,
    provider: "deapi", speed: "standard", quality: "standard", isFree: true,
    badges: ["FREE", "IMG2VID"],
  },
  // ═══════════════════════════════════════════
  // IMAGE & VIDEO MODELS — Added dynamically via admin bot
  // Use "➕ إضافة نموذج جديد" in the Telegram bot to add models
  // ═══════════════════════════════════════════
];

// Helper getters
export const getModelDetail = (id: string): ModelDetail | undefined =>
  ALL_MODEL_DETAILS.find(m => m.id === id);

export const getModelsByType = (type: ModelType): ModelDetail[] =>
  ALL_MODEL_DETAILS.filter(m => m.type === type);

export const getChatModels = () => getModelsByType("chat");
export const getImageGenerationModels = () => getModelsByType("image");
export const getImageToolModels = () => getModelsByType("image-tool");
export const getVideoGenerationModels = () => getModelsByType("video");
export const getVideoI2VModels = () => getModelsByType("video-i2v");
export const getVideoAvatarModels = () => getModelsByType("video-avatar");
