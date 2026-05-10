type MsgContent = string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
type Msg = { role: "user" | "assistant"; content: MsgContent };

type BrowserPayload = {
  currentUrl?: string;
  liveUrl?: string;
  screenshotUrl?: string;
  currentStep?: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export async function streamChat({
  messages,
  model,
  tier,
  searchEnabled,
  deepResearch,
  chatMode,
  user_id,
  conversation_id,
  computerUseEnabled,
  activeAgent,
  selectedModel,
  activeSkill,
  availableSkills,
  onDelta,
  onDone,
  onError,
  onImages,
  onProducts,
  onStatus,
  onBrowser,
  onEvent,
  signal,
}: {
  messages: Msg[];
  model?: string;
  tier?: "lite" | "pro" | "max";
  searchEnabled?: boolean;
  deepResearch?: boolean;
  chatMode?: string;
  user_id?: string;
  conversation_id?: string;
  computerUseEnabled?: boolean;
  activeAgent?: string;
  selectedModel?: { id: string; cost: number };
  activeSkill?: { id?: string; name: string; instructions: string; enabled_tools?: string[]; preferred_model?: string | null } | null;
  availableSkills?: Array<{ id?: string; name: string; description: string; triggers?: string[]; source?: string }>;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError?: (error: string) => void;
  onImages?: (images: string[]) => void;
  onProducts?: (products: any[]) => void;
  onStatus?: (status: string) => void;
  onBrowser?: (browser: BrowserPayload) => void;
  onEvent?: (payload: { event: string; [k: string]: any }) => void;
  signal?: AbortSignal;
}) {
  try {
    let completed = false;
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, model, tier, searchEnabled, deepResearch, chatMode, user_id, conversation_id, computerUseEnabled, activeAgent, selectedModel, activeSkill, availableSkills }),
      signal,
    });

    if (resp.status === 429) {
      onError?.("Rate limit exceeded. Please wait a moment and try again.");
      onDone();
      return;
    }
    if (resp.status === 402) {
      onError?.("الرصيد غير كافٍ. يرجى شحن رصيدك للاستمرار.");
      onDone();
      return;
    }
    if (resp.status === 503) {
      onError?.("Service temporarily unavailable. Please try again in a moment.");
      onDone();
      return;
    }
    if (!resp.ok || !resp.body) {
      const errorText = await resp.text().catch(() => "");
      // Don't show generic connection error for server errors - show specific message
      const msg = resp.status >= 500 
        ? "AI service is temporarily busy. Please try again." 
        : (errorText || "Something went wrong. Please try again.");
      onError?.(msg);
      onDone();
      return;
    }

    const handlePayload = (parsed: any) => {
      if (parsed.event && typeof parsed.event === "string") onEvent?.(parsed);
      if (parsed.status && typeof parsed.status === "string") onStatus?.(parsed.status);
      if (parsed.images && Array.isArray(parsed.images)) onImages?.(parsed.images);
      if (parsed.products && Array.isArray(parsed.products)) onProducts?.(parsed.products);
      if (parsed.browser && typeof parsed.browser === "object") onBrowser?.(parsed.browser);
      const content = parsed.choices?.[0]?.delta?.content as string | undefined;
      if (content) onDelta(content);
    };

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    // Idle timeout: if NO bytes arrive for 35s we treat the connection as dead
    // and surface a friendly retry message instead of an infinite spinner.
    // Heartbeats from the server (`: keep-alive ...`) keep this alive even
    // during long tool flows.
    const IDLE_TIMEOUT_MS = 35_000;
    const idleAbort = new AbortController();
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const resetIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => idleAbort.abort(), IDLE_TIMEOUT_MS);
    };
    resetIdle();

    try {
      while (!streamDone) {
        const readPromise = reader.read();
        const idlePromise = new Promise<never>((_, reject) => {
          idleAbort.signal.addEventListener(
            "abort",
            () => reject(new Error("IDLE_TIMEOUT")),
            { once: true },
          );
        });
        const { done, value } = await Promise.race([readPromise, idlePromise]);
        if (done) break;
        resetIdle();
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            completed = true;
            streamDone = true;
            break;
          }

          try {
            handlePayload(JSON.parse(jsonStr));
          } catch {
            continue;
          }
        }
      }
    } finally {
      if (idleTimer) clearTimeout(idleTimer);
    }

    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") {
          completed = true;
          continue;
        }
        try {
          handlePayload(JSON.parse(jsonStr));
        } catch {
          continue;
        }
      }
    }

    if (!completed && deepResearch) {
      onError?.("Deep Research stopped before the report finished. Please try again.");
      return;
    }
    onDone();
  } catch (e: any) {
    if (e?.name === "AbortError") {
      onDone();
      return;
    }
    if (e?.message === "IDLE_TIMEOUT") {
      onError?.("الرد تأخر أكتر من اللازم. حاول تبعت الرسالة تاني — لو حصلت تاني، الخدمة بتعاني مؤقتًا.");
      onDone();
      return;
    }
    console.error("Stream error:", e);
    const isNetworkError = !navigator.onLine || e?.message?.includes("Failed to fetch") || e?.message?.includes("NetworkError") || e?.message?.includes("ERR_NETWORK");
    if (isNetworkError) {
      onError?.("Connection error. Please check your internet and try again.");
    } else {
      onError?.("Something went wrong. Please try again.");
    }
    onDone();
  }
}
