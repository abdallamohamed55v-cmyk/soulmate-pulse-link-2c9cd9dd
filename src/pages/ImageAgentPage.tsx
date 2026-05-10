import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUp, X, Sparkles, Loader2, Instagram, Facebook } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import AppLayout from "@/layouts/AppLayout";
import ChatMessage from "@/components/ChatMessage";
import { streamChat } from "@/lib/streamChat";
import ConnectorsDialog from "@/components/ConnectorsDialog";

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const SYSTEM_PROMPT = `You are Megsy Image Agent — an AI assistant specialized in helping users create the best AI-generated images. You help with:
- Choosing the right image model (FLUX, GPT Image, Ideogram, Recraft, etc.)
- Writing effective prompts with proper style, composition, and detail
- Optimizing settings like aspect ratio, style, and quality
- Social media optimization for Instagram, Facebook, and LinkedIn
Be creative, helpful, and concise. Suggest specific prompts when asked.`;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const ImageAgentPage = () => {
  const navigate = useNavigate();
  const { userId } = useCredits();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "" };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);

    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    await streamChat({
      messages: [{ role: "user" as const, content: SYSTEM_PROMPT }, ...history],
      model: "google/gemini-2.5-flash",
      onDelta: (delta) => {
        setMessages(prev => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last.role === "assistant") last.content += delta;
          return copy;
        });
      },
      onDone: () => setIsStreaming(false),
      onError: (err) => {
        setMessages(prev => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last.role === "assistant") last.content = `Error: ${err}`;
          return copy;
        });
        setIsStreaming(false);
      },
    });
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col bg-background">
        <ConnectorsDialog open={connectorsOpen} onOpenChange={setConnectorsOpen} onNavigateIntegrations={() => { setConnectorsOpen(false); navigate("/settings/integrations"); }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/images")} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-accent transition-colors"><X className="w-4 h-4" /></button>
            <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /><h1 className="text-sm font-bold text-foreground">Image Agent</h1></div>
          </div>
          {/* Social buttons */}
          <div className="flex items-center gap-1.5">
            {[
              { icon: Instagram, label: "Instagram", color: "hover:text-pink-500" },
              { icon: Facebook, label: "Facebook", color: "hover:text-blue-600" },
              { icon: LinkedInIcon, label: "LinkedIn", color: "hover:text-blue-700", isCustom: true },
            ].map(({ icon: Icon, label, color, isCustom }) => (
              <button
                key={label}
                onClick={() => setConnectorsOpen(true)}
                className={`p-2 rounded-lg text-muted-foreground ${color} hover:bg-accent transition-all`}
                title={`Connect ${label}`}
              >
                {isCustom ? <Icon /> : <Icon className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-1">Image Agent</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                I can help you write better prompts, choose the right model, and optimize your images for social media.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              isStreaming={isStreaming && msg.id === messages[messages.length - 1]?.id && msg.role === "assistant"}
              isThinking={isStreaming && msg.role === "assistant" && !msg.content}
            />
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask about prompts, models, or social media optimization..."
              rows={1}
              className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none resize-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50 max-h-32"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="shrink-0 w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:bg-primary/90 transition-colors"
            >
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ImageAgentPage;
