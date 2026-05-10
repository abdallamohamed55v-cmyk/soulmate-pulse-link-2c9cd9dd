import { useState, useEffect } from "react";
import { ArrowLeft, CreditCard, TrendingUp, TrendingDown, Clock, Crown, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { DesktopSettingsLayout } from "@/components/DesktopSettingsLayout";
import visaBg from "@/assets/visa-bg.webp";
import FancyButton from "@/components/FancyButton";

const BillingPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState("Free");
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("credits, plan").eq("id", user.id).single();
        if (profile) {
          setCredits(Number(profile.credits) || 0);
          setPlan(profile.plan || "Free");
        }
        const { data: txns } = await supabase.
        from("credit_transactions").
        select("*").
        eq("user_id", user.id).
        order("created_at", { ascending: false }).
        limit(50);
        if (txns) setTransactions(txns);
      }
    };
    load();
  }, []);

  const totalSpent = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
  const totalEarned = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  const content =
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-lg mx-auto">
      {/* Card */}
      <div className="relative w-full aspect-[1.7/1] rounded-2xl overflow-hidden shadow-2xl group">
        <img src={visaBg} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/20 to-black/40" />
        <div className="relative z-10 flex flex-col justify-between h-full p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/50 text-[10px] uppercase tracking-[0.25em] font-medium">Balance</p>
              <p className="text-white text-4xl font-black tracking-tight mt-1">
                {credits.toLocaleString()} <span className="text-lg font-normal text-white/60">MC</span>
              </p>
            </div>
            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
          plan.toLowerCase() === 'free' ? 'bg-white/10 text-white/60' :
          plan.toLowerCase() === 'starter' ? 'bg-emerald-500/20 text-emerald-300' :
          plan.toLowerCase() === 'pro' ? 'bg-violet-500/20 text-violet-300' :
          plan.toLowerCase() === 'elite' ? 'bg-purple-500/20 text-purple-300' :
          'bg-rose-500/20 text-rose-300'}`
          }>
              {plan}
            </div>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-white text-xl font-black tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
              Megsy
            </p>
            <div className="flex">
              <div className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm" />
              <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm -ml-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <FancyButton onClick={() => navigate("/pricing")} className="!rounded-xl !py-3 w-full text-sm">
          Add MC
        </FancyButton>
        <button
        onClick={() => navigate("/settings/referrals")}
        className="py-3 rounded-xl text-sm font-medium text-foreground border border-border hover:bg-secondary/50 transition-colors">
        
          Earn MC
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card/50 p-4 text-center">
          
          <p className="text-xl font-bold text-foreground">{credits.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">MC Left</p>
        </div>
        <div className="rounded-xl border border-border bg-card/50 p-4 text-center">
          
          <p className="text-xl font-bold text-foreground">{totalSpent.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Spent</p>
        </div>
        <div className="rounded-xl border border-border bg-card/50 p-4 text-center">
          
          <p className="text-xl font-bold text-foreground">{totalEarned.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Earned</p>
        </div>
      </div>

      {/* Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Recent Activity</p>
          <p className="text-[11px] text-muted-foreground">{transactions.length} transactions</p>
        </div>
        {transactions.length === 0 ?
      <div className="text-center py-16 rounded-2xl border border-dashed border-border">
            <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Your MC history will appear here</p>
          </div> :

      <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
            {transactions.map((tx) => {
          const isDeduction = tx.amount > 0;
          return (
            <div key={tx.id} className="flex items-center gap-3 py-3.5 px-4 hover:bg-secondary/30 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isDeduction ? "bg-red-500/10" : "bg-emerald-500/10"}`
              }>
                    {isDeduction ?
                <TrendingDown className="w-3.5 h-3.5 text-red-400" /> :

                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{tx.description || tx.action_type}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${isDeduction ? "text-red-400" : "text-emerald-400"}`}>
                    {isDeduction ? "-" : "+"}{Math.abs(tx.amount)} MC
                  </span>
                </div>);

        })}
          </div>
      }
      </div>
    </motion.div>;


  if (!isMobile) {
    return (
      <DesktopSettingsLayout title="Billing" subtitle="Manage your MC balance and view transaction history">
        {content}
      </DesktopSettingsLayout>);

  }

  return (
    <div className="h-[100dvh] bg-background overflow-y-auto">
      <div className="max-w-lg mx-auto pb-12">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/settings")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground">Billing</h1>
        </div>
        <div className="px-4">{content}</div>
      </div>
    </div>);

};

export default BillingPage;