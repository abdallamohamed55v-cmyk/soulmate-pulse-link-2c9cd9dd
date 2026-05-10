import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, PhoneOff, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import "./VoiceCallLoader.css";

const VoiceCallPage = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"idle" | "connecting" | "connected" | "ended">("idle");
  const [deepgramReady, setDeepgramReady] = useState<boolean | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [statusText, setStatusText] = useState("Tap to start call");
  const [liveTranscript, setLiveTranscript] = useState("");

  const sttWsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMutedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const conversationRef = useRef<{ role: string; content: string }[]>([]);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingAudioRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const interimRef = useRef("");
  const finalTranscriptRef = useRef("");

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // ─── Play queued TTS audio ───
  const playNextAudio = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingAudioRef.current = false;
      setStatusText("Listening...");
      return;
    }
    isPlayingAudioRef.current = true;
    const audioUrl = audioQueueRef.current.shift()!;
    try {
      const audio = new Audio(audioUrl);
      audio.onended = () => playNextAudio();
      audio.onerror = () => playNextAudio();
      await audio.play();
    } catch {
      playNextAudio();
    }
  }, []);

  // ─── Send transcript to our chat + TTS ───
  const processUserSpeech = useCallback(async (text: string) => {
    if (!text.trim() || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setStatusText("Thinking...");
    setLiveTranscript("");

    conversationRef.current.push({ role: "user", content: text.trim() });

    try {
      // 1. Get AI response from our chat function
      const chatResp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content: `You are Megsy, a smart, friendly AI voice assistant. Rules:
- Adapt your tone and language to the user automatically. If they speak Arabic, reply in Arabic. If English, reply in English.
- Be natural, warm, helpful, and concise — this is a voice conversation, keep responses short (1-3 sentences max).
- Never say you're an AI unless directly asked.
- Never use markdown, code blocks, or formatting — plain text only.
- Current year is 2026. Your creator is Megsy AI.`,
              },
              ...conversationRef.current.slice(-10),
            ],
            model: "google/gemini-2.5-flash-lite-preview-09-2025",
          }),
        }
      );

      if (!chatResp.ok || !chatResp.body) {
        throw new Error("Chat failed");
      }

      // Parse SSE stream to get full text
      let fullText = "";
      const reader = chatResp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) fullText += c;
          } catch {}
        }
      }

      if (!fullText.trim()) {
        fullText = "Sorry, I didn't catch that.";
      }

      conversationRef.current.push({ role: "assistant", content: fullText.trim() });

      // 2. Convert to speech via our TTS
      setStatusText("Speaking...");
      const { data: ttsData, error: ttsErr } = await supabase.functions.invoke("generate-voice", {
        body: {
          prompt: fullText.trim(),
          model_id: "tts-1-hd",
          settings: { voice: "nova", speed: 1.1 },
        },
      });

      if (ttsErr || !ttsData?.url) {
        console.error("TTS error:", ttsErr);
        setStatusText("Listening...");
        isProcessingRef.current = false;
        return;
      }

      // 3. Play audio
      audioQueueRef.current.push(ttsData.url);
      if (!isPlayingAudioRef.current) playNextAudio();
    } catch (err) {
      console.error("Process speech error:", err);
      setStatusText("Listening...");
    } finally {
      isProcessingRef.current = false;
    }
  }, [playNextAudio]);

  // ─── Check Deepgram availability on mount ───
  useEffect(() => {
    supabase.functions.invoke("deepgram-token", { body: { ttl_seconds: 10 } })
      .then(({ data, error }) => {
        setDeepgramReady(!error && !!data?.token);
      })
      .catch(() => setDeepgramReady(false));
  }, []);

  // ─── Start call: Deepgram STT WebSocket + mic ───
  const startCall = useCallback(async () => {
    if (deepgramReady === false) {
      toast.error("Voice service is temporarily unavailable. Please try again later.");
      return;
    }
    setPhase("connecting");
    setStatusText("Getting access...");

    try {
      // 1. Mic permission
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
        });
      } catch (micErr: any) {
        setPhase("idle");
        setStatusText(micErr.name === "NotAllowedError" ? "Microphone permission denied." : "Microphone not available");
        toast.error("Please allow microphone access");
        return;
      }
      mediaStreamRef.current = stream;

      // 2. Get Deepgram key
      setStatusText("Connecting...");
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke("deepgram-token", {
        body: { ttl_seconds: 60 },
      });
      if (tokenError || !tokenData?.token) {
        stream.getTracks().forEach(t => t.stop());
        setPhase("idle");
        setStatusText("Voice service unavailable. Please try again later.");
        toast.error("Could not connect to voice service — Deepgram key may be missing");
        return;
      }

      // 3. Deepgram STT WebSocket (listen-only, our own pipeline)
      setStatusText("Starting...");
      const sttUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=multi&smart_format=true&interim_results=true&utterance_end_ms=1500&endpointing=300&encoding=linear16&sample_rate=16000`;
      const sttWs = new WebSocket(sttUrl, ["token", tokenData.token]);
      sttWsRef.current = sttWs;

      sttWs.onopen = () => {
        setPhase("connected");
        setStatusText("Listening...");
        timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);

        // Send greeting
        conversationRef.current = [];
        processUserSpeech("Hello");

        // Audio capture → send raw PCM to Deepgram STT
        const audioCtx = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (isMutedRef.current || sttWs.readyState !== WebSocket.OPEN || isPlayingAudioRef.current) return;
          const input = e.inputBuffer.getChannelData(0);
          const buf = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            buf[i] = Math.max(-32768, Math.min(32767, Math.floor(input[i] * 32768)));
          }
          sttWs.send(buf.buffer);
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);
      };

      sttWs.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // Deepgram STT transcript result
          if (msg.type === "Results" && msg.channel?.alternatives?.[0]) {
            const alt = msg.channel.alternatives[0];
            const transcript = alt.transcript || "";

            if (msg.is_final && transcript) {
              finalTranscriptRef.current += " " + transcript;
              interimRef.current = "";
              setLiveTranscript(finalTranscriptRef.current.trim());

              // Reset silence timer
              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = setTimeout(() => {
                const full = finalTranscriptRef.current.trim();
                if (full && !isProcessingRef.current) {
                  finalTranscriptRef.current = "";
                  interimRef.current = "";
                  processUserSpeech(full);
                }
              }, 1500);
            } else if (transcript) {
              interimRef.current = transcript;
              setLiveTranscript((finalTranscriptRef.current + " " + transcript).trim());
            }
          }

          // UtteranceEnd event — user stopped speaking
          if (msg.type === "UtteranceEnd") {
            const full = finalTranscriptRef.current.trim();
            if (full && !isProcessingRef.current) {
              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
              finalTranscriptRef.current = "";
              interimRef.current = "";
              processUserSpeech(full);
            }
          }
        } catch {}
      };

      sttWs.onclose = () => {
        if (phase !== "ended") {
          setPhase("ended");
          setStatusText("Call ended");
        }
      };
      sttWs.onerror = () => {
        setPhase("ended");
        setStatusText("Connection lost");
      };
    } catch (err) {
      console.error("Call error:", err);
      setPhase("idle");
      setStatusText("Something went wrong. Try again.");
    }
  }, [processUserSpeech]);

  const endCall = () => {
    sttWsRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    processorRef.current?.disconnect();
    audioContextRef.current?.close().catch(() => {});
    if (timerRef.current) clearInterval(timerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setPhase("ended");
    navigate("/voice");
  };

  useEffect(() => {
    return () => {
      sttWsRef.current?.close();
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      processorRef.current?.disconnect();
      audioContextRef.current?.close().catch(() => {});
      if (timerRef.current) clearInterval(timerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="loader-wrapper">
          <div className="loader" />
          <span className="loader-letter" style={{ animationDelay: "0s" }}>M</span>
          <span className="loader-letter" style={{ animationDelay: "0.1s" }}>e</span>
          <span className="loader-letter" style={{ animationDelay: "0.2s" }}>g</span>
          <span className="loader-letter" style={{ animationDelay: "0.3s" }}>s</span>
          <span className="loader-letter" style={{ animationDelay: "0.4s" }}>y</span>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 text-sm text-muted-foreground text-center px-6"
        >
          {phase === "connected" ? formatTime(callDuration) : statusText}
        </motion.p>

        {phase === "connected" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-1 text-xs text-muted-foreground/60"
          >
            {statusText}
          </motion.p>
        )}

        <AnimatePresence>
          {liveTranscript && phase === "connected" && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 text-xs text-foreground/50 text-center px-8 max-w-xs italic"
            >
              "{liveTranscript}"
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="pb-12 flex items-center justify-center gap-8">
        {phase === "idle" ? (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={startCall}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-green-500 text-white"
          >
            <Phone className="w-6 h-6" />
          </motion.button>
        ) : phase === "ended" ? (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate("/voice")}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-secondary text-foreground"
          >
            <PhoneOff className="w-6 h-6" />
          </motion.button>
        ) : (
          <>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsMuted(!isMuted)}
              className={`w-14 h-14 flex items-center justify-center rounded-full transition-colors ${
                isMuted ? "bg-destructive/20 text-destructive" : "bg-secondary text-foreground"
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={endCall}
              className="w-16 h-16 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground"
            >
              <PhoneOff className="w-6 h-6" />
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceCallPage;
