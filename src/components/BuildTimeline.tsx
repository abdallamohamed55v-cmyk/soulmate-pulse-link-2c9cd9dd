import { Check, Loader2, Circle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type BuildStepStatus = "pending" | "running" | "done" | "error";

export interface BuildStep {
  id: string;
  label: string;
  status: BuildStepStatus;
  detail?: string;
}

const statusIcon = (status: BuildStepStatus) => {
  switch (status) {
    case "done":
      return <Check className="w-4 h-4 text-primary" />;
    case "running":
      return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
    case "error":
      return <Circle className="w-4 h-4 text-destructive fill-destructive" />;
    default:
      return <Circle className="w-4 h-4 text-muted-foreground/30" />;
  }
};

interface BuildTimelineProps {
  steps: BuildStep[];
  title?: string;
}

const BuildTimeline = ({ steps, title }: BuildTimelineProps) => {
  const [expanded, setExpanded] = useState(true);
  const doneCount = steps.filter(s => s.status === "done").length;
  const allDone = doneCount === steps.length && steps.length > 0;
  const isRunning = steps.some(s => s.status === "running");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {allDone ? (
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-3 h-3 text-primary" />
            </div>
          ) : isRunning ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : null}
          <p className="text-sm font-medium text-foreground">{title || "Building project"}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          {expanded ? "Hide details" : "Show details"}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Steps */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5">
              {steps.map((step, i) => (
                <div
                  key={step.id}
                  className="flex items-center gap-3 py-1.5"
                >
                  {/* Connector line */}
                  <div className="relative flex flex-col items-center">
                    {statusIcon(step.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${step.status === "done" ? "text-muted-foreground" : step.status === "running" ? "text-foreground font-medium" : "text-muted-foreground/50"}`}>
                      {step.label}
                    </p>
                    {step.detail && step.status === "running" && (
                      <p className="text-[11px] text-muted-foreground/70 truncate">{step.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview button when done */}
      {allDone && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-2 pt-1">
            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
              <Check className="w-3 h-3 text-primary" />
            </div>
            <span className="text-sm text-foreground font-medium">Build complete</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default BuildTimeline;
