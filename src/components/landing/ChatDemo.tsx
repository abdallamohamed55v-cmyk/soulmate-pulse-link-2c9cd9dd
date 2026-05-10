import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  displayedContent?: string;
  isTyping?: boolean;
}

const conversation: { role: "user" | "assistant"; content: string; delay: number }[] = [
  { role: "user", content: "Hello Megsy! What can you do?", delay: 800 },
  { role: "assistant", content: "Hey! I can help you with a lot — send emails, search the web, write code, analyze files, summarize documents, and much more. Just ask!", delay: 400 },
  { role: "user", content: "Send an email to my team about the Q1 report", delay: 2000 },
  { role: "assistant", content: "Done! I've drafted and sent the Q1 report summary to your team (marketing@company.com). Subject: \"Q1 2026 Performance Report\". Want me to attach the spreadsheet too?", delay: 400 },
  { role: "user", content: "Search the web for the latest AI trends in 2026", delay: 2200 },
  { role: "assistant", content: "Here's what I found:\n\n1. Multimodal AI agents are now standard\n2. AI coding assistants write 70% of production code\n3. Real-time translation broke language barriers\n4. Autonomous research agents are mainstream\n\nWant me to create a summary document?", delay: 400 },
  { role: "user", content: "Summarize this PDF document for me", delay: 1800 },
  { role: "assistant", content: "Sure! Just upload the file and I'll give you a clear summary with key takeaways. I can also extract specific data or translate it to another language.", delay: 400 },
];

const CHAR_SPEED = 18; // ms per character

const ChatDemo = () => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentIndex >= conversation.length) {
      const timer = setTimeout(() => {
        setMessages([]);
        setCurrentIndex(0);
      }, 4000);
      return () => clearTimeout(timer);
    }

    const msg = conversation[currentIndex];

    if (msg.role === "user") {
      const timer = setTimeout(() => {
        setMessages((prev) => [...prev, { role: "user", content: msg.content }]);
        setCurrentIndex((i) => i + 1);
      }, msg.delay);
      return () => clearTimeout(timer);
    } else {
      // For assistant: add message with empty displayed content, then typewrite
      const timer = setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: msg.content, displayedContent: "", isTyping: true },
        ]);
      }, msg.delay);
      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  // Typewriter effect for the last assistant message
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant" || !lastMsg.isTyping) return;

    const fullContent = lastMsg.content;
    const currentLen = lastMsg.displayedContent?.length ?? 0;

    if (currentLen >= fullContent.length) {
      // Done typing
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, isTyping: false, displayedContent: fullContent } : m
        )
      );
      setCurrentIndex((i) => i + 1);
      return;
    }

    const timer = setTimeout(() => {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1
            ? { ...m, displayedContent: fullContent.slice(0, currentLen + 1) }
            : m
        )
      );
    }, CHAR_SPEED);

    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const renderContent = (msg: ChatMsg) => {
    const text = msg.role === "assistant" ? (msg.displayedContent ?? msg.content) : msg.content;
    return text.split("\n").map((line, li, arr) => (
      <span key={li}>
        {line}
        {li < arr.length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/30 bg-card/30 backdrop-blur-md">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: "none" }}>
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] text-sm leading-relaxed ${
                msg.role === "user"
                  ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2.5"
                  : "text-foreground/90"
              }`}
            >
              {renderContent(msg)}
              {msg.role === "assistant" && msg.isTyping && (
                <span className="inline-block w-[2px] h-4 bg-primary ml-0.5 animate-pulse align-middle" />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ChatDemo;
