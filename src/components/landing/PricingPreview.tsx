import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Check, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import FancyButton from "@/components/FancyButton";

const PRODUCT_IDS: Record<string, string> = {
  starter: "c3483e63-7dbd-4214-bec2-894926f5590a",
  pro: "8da537b0-7192-46cd-b38a-bbe341febdf7",
  elite: "d212d1e6-4958-4329-a1f4-5b460886fc9d",
  business: "1fb17ce3-5bb4-473e-8c67-e50a8ce927dd",
};

const plans = [
{
  name: "Starter",
  tier: "starter",
  price: "9",
  period: "/mo",
  yearlyNote: "or $89/yr — 880 MC",
  credits: "80 MC / month",
  description: "Great for getting started with AI creation",
  features: [
  "80 MC / month",
  "All chat models",
  "50 images / month",
  "5 videos / month",
  "10 code builds / month",
  "Deploy & publish",
  "Standard support"],

  highlight: false,
  cardBorder: "border-emerald-500/[0.12]",
  cardBg: "bg-gradient-to-b from-emerald-500/[0.06] to-transparent",
  checkColor: "text-emerald-400",
  nameColor: "text-emerald-400"
},
{
  name: "Pro",
  tier: "pro",
  price: "29",
  period: "/mo",
  yearlyNote: "or $249/yr — 2,480 MC",
  credits: "280 MC / month",
  description: "For creators who need more power",
  features: [
  "280 MC / month",
  "All AI models",
  "200 images / month",
  "20 videos / month",
  "40 code builds / month",
  "API access",
  "Priority support"],

  highlight: false,
  cardBorder: "border-violet-500/[0.12]",
  cardBg: "bg-gradient-to-b from-violet-500/[0.06] to-transparent",
  checkColor: "text-violet-400",
  nameColor: "text-violet-400"
},
{
  name: "Elite",
  tier: "elite",
  price: "49",
  period: "/mo",
  yearlyNote: "or $499/yr — 4,980 MC",
  credits: "480 MC / month",
  description: "Maximum power for serious professionals",
  features: [
  "480 MC / month",
  "All models (priority speed)",
  "500 images / month",
  "50 videos / month",
  "80 code builds / month",
  "API + webhooks",
  "Dedicated support"],

  highlight: true,
  cardBorder: "border-purple-500/30",
  cardBg: "bg-gradient-to-b from-purple-500/[0.12] to-purple-900/[0.06]",
  checkColor: "text-purple-400",
  nameColor: "text-purple-400"
}];


const PricingPreview = () => {
  const navigate = useNavigate();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleSubscribe = async (tier: string) => {
    const product_id = PRODUCT_IDS[tier];
    if (!product_id) {
      navigate("/pricing");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth?redirect=/pricing");
      return;
    }
    setLoadingTier(tier);
    try {
      const { data, error } = await supabase.functions.invoke("polar-checkout", {
        body: { product_id, plan: tier },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data?.error || "Checkout failed");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to open checkout");
      setLoadingTier(null);
    }
  };

  return (
    <section id="pricing" className="relative overflow-hidden py-16 md:py-40">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="mb-16 text-center">
          
          <h2 className="font-display text-[10vw] font-black uppercase tracking-tighter leading-[0.85] text-white md:text-[8vw]">
            SIMPLE{" "}
            <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">PRICING</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-xl text-white/40">
            Every MC is real value. No hidden fees.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan, i) =>
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: i * 0.12 }}
            className={`relative rounded-2xl border p-6 transition-all duration-300 hover:scale-[1.02] md:rounded-3xl md:p-9 ${plan.cardBorder} ${plan.cardBg} ${
            plan.highlight ? "shadow-xl shadow-purple-500/10 ring-1 ring-purple-500/20" : ""}`
            }>
            
              {plan.highlight &&
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-purple-500 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-purple-500/30">
                  Most Popular
                </div>
            }

              <h3 className={`text-lg font-bold ${plan.nameColor}`}>{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1 md:mt-3">
                <span className="text-4xl font-black text-white md:text-5xl">${plan.price}</span>
                <span className="text-base text-white/40">{plan.period}</span>
              </div>
              <p className="mt-1.5 text-xs text-white/25">{plan.yearlyNote}</p>
              <p className="mt-3 text-sm leading-relaxed text-white/40">{plan.description}</p>

              <ul className="mt-8 space-y-3">
                {plan.features.map((f) =>
              <li key={f} className="flex items-center gap-3 text-base text-white/60">
                    <Check size={16} className={`shrink-0 ${plan.checkColor}`} />
                    {f}
                  </li>
              )}
              </ul>

              <div className="mt-9">
                {plan.highlight ?
              <FancyButton onClick={() => handleSubscribe(plan.tier)} className="w-full py-3 text-base">
                    {loadingTier === plan.tier ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Get Started"}
                  </FancyButton> :

              <button
                onClick={() => handleSubscribe(plan.tier)}
                disabled={loadingTier === plan.tier}
                className="w-full rounded-xl border border-white/15 py-3 text-base font-medium text-white/70 transition-all hover:border-white/30 hover:text-white disabled:opacity-50">
                
                    {loadingTier === plan.tier ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Get Started"}
                  </button>
              }
              </div>
            </motion.div>
          )}
        </div>

        {/* Business + Enterprise row */}
        <div className="grid gap-6 md:grid-cols-2 mt-8">
          {/* Business $149 tier */}
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="relative rounded-2xl border border-rose-500/20 p-6 md:rounded-3xl md:p-9 bg-gradient-to-br from-rose-950/30 via-transparent to-pink-950/20">
            
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(244,63,94,0.06),transparent_50%)] rounded-2xl md:rounded-3xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                
                <h3 className="text-lg font-bold text-rose-400">Business</h3>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-black text-white md:text-5xl">$149</span>
                <span className="text-base text-white/40">/mo</span>
              </div>
              <p className="mt-1.5 text-xs text-white/25">or $1,299/yr — 12,980 MC</p>
              <p className="mt-3 text-sm leading-relaxed text-white/40">
                1,480 MC / month, dedicated infrastructure, SLA guarantees, and a dedicated account manager.
              </p>
              <button
                onClick={() => handleSubscribe("business")}
                disabled={loadingTier === "business"}
                className="mt-6 w-full rounded-xl border border-rose-500/20 bg-rose-500/10 px-8 py-3 text-base font-medium text-rose-300 transition-all hover:bg-rose-500/20 hover:border-rose-500/30 disabled:opacity-50">
                
                {loadingTier === "business" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Get Started"}
              </button>
            </div>
          </motion.div>

          {/* Enterprise — contact only */}
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="relative rounded-2xl border border-cyan-500/20 p-6 md:rounded-3xl md:p-9 bg-gradient-to-br from-cyan-950/30 via-transparent to-indigo-950/20">
            
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(6,182,212,0.06),transparent_50%)] rounded-2xl md:rounded-3xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-lg font-bold text-cyan-400">Enterprise</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/40 max-w-lg">
                Custom plans for large teams — dedicated infrastructure, advanced security, SLA, and everything your organization needs.
              </p>
              <button
                onClick={() => navigate("/enterprise")}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-8 py-3 text-base font-medium text-white transition-all hover:opacity-90 shadow-lg shadow-cyan-500/20">
                
                Contact Sales
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>);

};

export default PricingPreview;