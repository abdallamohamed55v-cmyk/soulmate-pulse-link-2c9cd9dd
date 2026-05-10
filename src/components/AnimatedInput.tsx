import { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from "react";
import { Plus, ArrowUp, Square, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MentionDropdown from "./MentionDropdown";
import ModelPickerDropdown from "./ModelPickerDropdown";
import type { AgentDef, AgentModel } from "@/lib/agentRegistry";
import { getAgentById } from "@/lib/agentRegistry";
import { TypingAnimation } from "@/components/ui/typing-animation";

interface SmartQuestion {
  title: string;
  options: string[];
  allowText?: boolean;
}

interface AnimatedInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onCancel?: () => void;
  onPlusClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholders?: string[];
  pendingQuestions?: SmartQuestion[];
  onQuestionAnswer?: (answer: string) => void;
  onQuestionSkip?: () => void;
  activeAgent?: string | null;
  onAgentSelect?: (agent: AgentDef) => void;
  onAgentRemove?: () => void;
  mentionCategories?: string[];
  selectedModel?: AgentModel | null;
  onModelSelect?: (model: AgentModel) => void;
  onModelRemove?: () => void;
  accentMode?: "learn" | null;
}

const DEFAULT_PLACEHOLDERS = [
  "Ask Megsy ?",
  "What's on your mind?",
  "Ask anything...",
];

const AnimatedInput = ({ value, onChange, onSend, onCancel, onPlusClick, disabled, isLoading, placeholders, pendingQuestions, onQuestionAnswer, onQuestionSkip, activeAgent, onAgentSelect, onAgentRemove, mentionCategories, selectedModel, onModelSelect, onModelRemove, accentMode }: AnimatedInputProps) => {
  const deferredValue = useDeferredValue(value);
  const items = useMemo(() => placeholders && placeholders.length > 0 ? placeholders : DEFAULT_PLACEHOLDERS, [placeholders]);
  const [placeholderIndex, setPlaceholderIndex] = useState(() => Math.floor(Math.random() * items.length));
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionInput, setQuestionInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const placeholderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placeholderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const valueRef = useRef(value);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [modelQuery, setModelQuery] = useState("");
  const [lastSelectedAgent, setLastSelectedAgent] = useState<AgentDef | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const hasQuestions = !!pendingQuestions?.length;
  const safeQuestionIndex = hasQuestions ? Math.min(questionIndex, pendingQuestions!.length - 1) : 0;
  const currentQuestion = hasQuestions ? pendingQuestions![safeQuestionIndex] : null;

  // Get models for active agent OR last selected agent
  const activeAgentModels = useMemo(() => {
    if (lastSelectedAgent?.models?.length) return lastSelectedAgent.models;
    if (!activeAgent) return [];
    const agent = getAgentById(activeAgent);
    return agent?.models || [];
  }, [activeAgent, lastSelectedAgent]);

  // Static placeholder that quietly rotates every few seconds (no per-char typing,
  // which previously caused 20fps re-renders and a "reloading" feel while typing/streaming).
  useEffect(() => {
    setDisplayedPlaceholder(items[placeholderIndex] || DEFAULT_PLACEHOLDERS[0]);
  }, [placeholderIndex, items]);

  useEffect(() => {
    if (value) return; // pause rotation while user is typing
    const id = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(id);
  }, [value, items]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && (mentionOpen || modelPickerOpen)) {
      setMentionOpen(false);
      setModelPickerOpen(false);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (mentionOpen || modelPickerOpen) { setMentionOpen(false); setModelPickerOpen(false); return; }
      if (value.trim() && !disabled && !isLoading) onSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newVal.slice(0, cursorPos);

    // Check for # model picker (when agent with models is selected)
    if ((activeAgent || lastSelectedAgent) && activeAgentModels.length > 0) {
      const hashMatch = textBeforeCursor.match(/#(\w*)$/);
      if (hashMatch) {
        setModelPickerOpen(true);
        setModelQuery(hashMatch[1]);
        setMentionOpen(false);
        return;
      }
    }

    // Check for @ mention
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionOpen(true);
      setMentionQuery(atMatch[1]);
      setModelPickerOpen(false);
    } else {
      setMentionOpen(false);
      setMentionQuery("");
      if (!textBeforeCursor.match(/#(\w*)$/)) {
        setModelPickerOpen(false);
        setModelQuery("");
      }
    }
  };

  const handleMentionSelect = (agent: AgentDef) => {
    const cursorPos = textareaRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const cleanedBefore = textBeforeCursor.replace(/@\w*$/, "");
    const textAfter = value.slice(cursorPos);
    // Keep @agent visible in input
    const agentTag = `@${agent.label} `;
    const newVal = cleanedBefore + agentTag + textAfter;
    onChange(newVal);
    setMentionOpen(false);
    setMentionQuery("");
    setLastSelectedAgent(agent);
    onAgentSelect?.(agent);

    // Auto-open model picker if agent has models
    if (agent.models && agent.models.length > 0) {
      setTimeout(() => {
        // Insert # and open model picker
        const pos = (cleanedBefore + agentTag).length;
        onChange(cleanedBefore + agentTag + "#" + textAfter);
        setModelPickerOpen(true);
        setModelQuery("");
      }, 50);
    }
  };

  const handleModelSelect = (model: AgentModel) => {
    // Replace #query with #model-label and keep it visible
    const cursorPos = textareaRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const cleanedBefore = textBeforeCursor.replace(/#\w*$/, "");
    const textAfter = value.slice(cursorPos);
    const modelTag = `#${model.label} `;
    onChange(cleanedBefore + modelTag + textAfter);
    setModelPickerOpen(false);
    setModelQuery("");
    onModelSelect?.(model);
  };

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      const maxH = typeof window !== "undefined" && window.innerWidth < 768 ? 120 : 160;
      el.style.height = Math.min(el.scrollHeight, maxH) + "px";
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  useEffect(() => {
    setQuestionIndex(0);
    setQuestionInput("");
  }, [pendingQuestions]);

  const moveToNextQuestion = () => {
    if (!pendingQuestions?.length) return;
    if (safeQuestionIndex < pendingQuestions.length - 1) {
      setQuestionIndex((prev) => prev + 1);
    } else {
      setQuestionIndex(0);
    }
    setQuestionInput("");
  };

  const handleQuestionSelect = (option: string) => {
    onQuestionAnswer?.(option);
    moveToNextQuestion();
  };

  const handleQuestionTextSend = () => {
    if (!questionInput.trim()) return;
    onQuestionAnswer?.(questionInput.trim());
    moveToNextQuestion();
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {mentionOpen && (
          <MentionDropdown
            query={mentionQuery}
            onSelect={handleMentionSelect}
            onClose={() => setMentionOpen(false)}
            visible={mentionOpen}
            categories={mentionCategories}
          />
        )}
        {modelPickerOpen && activeAgentModels.length > 0 && (
          <ModelPickerDropdown
            models={activeAgentModels}
            query={modelQuery}
            onSelect={handleModelSelect}
            onClose={() => setModelPickerOpen(false)}
          />
        )}
      </AnimatePresence>
      <div className="liquid-glass-input rounded-2xl overflow-hidden">
        <AnimatePresence>
          {hasQuestions && currentQuestion && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-border/30 bg-secondary/15"
            >
              <div className="p-3.5">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <p className="text-sm font-medium text-foreground">{currentQuestion.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground">{safeQuestionIndex + 1}/{pendingQuestions!.length}</span>
                    <button onClick={onQuestionSkip} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors" aria-label="Skip smart question">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentQuestion.options.map((opt, i) => (
                    <motion.button
                      key={`${opt}-${i}`}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleQuestionSelect(opt)}
                      className="px-3 py-1.5 rounded-full border border-border/40 bg-background/60 text-xs text-foreground hover:bg-accent/40 hover:border-primary/30 transition-colors"
                    >
                      {opt}
                    </motion.button>
                  ))}
                </div>
                {currentQuestion.allowText && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      autoComplete="off"
                      dir="auto"
                      value={questionInput}
                      onChange={(e) => setQuestionInput(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") { e.preventDefault(); handleQuestionTextSend(); }
                      }}
                      placeholder="Type your answer..."
                      className="flex-1 bg-transparent border-none px-1 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
                    />
                    <button
                      onClick={handleQuestionTextSend}
                      disabled={!questionInput.trim()}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-30 transition-opacity"
                      aria-label="Send question answer"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex items-end gap-2 pl-2.5 pr-2.5 py-3">
          <motion.button
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            type="button"
            onClick={onPlusClick}
            className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-colors ${
              accentMode === "learn"
                ? "text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:bg-accent/40"
                : "text-foreground/85 hover:text-foreground hover:bg-accent/40"
            }`}
            aria-label="Open attachments"
          >
            <Plus className="w-[22px] h-[22px]" strokeWidth={2} />
          </motion.button>

          <div className="flex-1 min-w-0">
            <div className="relative flex items-center min-h-[48px]">
              {!value && displayedPlaceholder && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 flex items-center px-1 py-2.5 text-[1rem] text-muted-foreground/60 leading-relaxed overflow-hidden"
                >
                  <TypingAnimation
                    key={displayedPlaceholder}
                    duration={55}
                    showCursor={false}
                    className="truncate"
                  >
                    {displayedPlaceholder}
                  </TypingAnimation>
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder=""
                rows={1}
                className="relative flex-1 w-full min-w-0 bg-transparent border-none outline-none resize-none text-[1rem] text-foreground py-2.5 px-1 leading-relaxed"
                style={{ minHeight: "48px" }}
              />
            </div>
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            {isLoading ? (
              <motion.button
                key="stop"
                initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6, rotate: 90 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
                whileTap={{ scale: 0.9 }}
                onClick={onCancel}
                className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-foreground text-background hover:opacity-90 transition-opacity"
                aria-label="Stop generation"
              >
                <Square className="w-4 h-4" fill="currentColor" />
              </motion.button>
            ) : value.trim() ? (
              <motion.button
                key="send"
                initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6, rotate: 90 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
                whileTap={{ scale: 0.9 }}
                onClick={onSend}
                disabled={disabled}
                className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40"
                aria-label="Send message"
              >
                <ArrowUp className="w-[20px] h-[20px]" strokeWidth={2.5} />
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AnimatedInput;
