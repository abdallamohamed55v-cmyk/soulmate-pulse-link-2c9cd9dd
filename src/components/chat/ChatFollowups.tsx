import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

interface Props {
  userMessage: string;
  assistantReply: string;
  conversationId: string | null;
  messageId: string | null;
  onPick: (q: string) => void;
}

export function ChatFollowups({ userMessage, assistantReply, conversationId, messageId, onPick }: Props) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Followups disabled: edge function hits worker resource limit.
  // Component renders nothing anyway; skip the network call to avoid runtime errors.
  useEffect(() => {
    void userMessage; void assistantReply; void conversationId; void messageId;
  }, [assistantReply, userMessage, conversationId, messageId]);

  return null;
}
