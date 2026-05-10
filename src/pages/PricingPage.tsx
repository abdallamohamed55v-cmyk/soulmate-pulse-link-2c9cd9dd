import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import GlowButton from "@/components/GlowButton";
import { goBackOr } from "@/lib/navigation";

type PlanTier = "starter" | "pro" | "elite" | "business";

const PRODUCT_MAP: Record<PlanTier, { monthly: string; yearly: string }> = {
  starter: {
    monthly: "c3483e63-7dbd-4214-bec2-894926f5590a",
    yearly: "729d9b3d-1acc-4d58-8a39-49ab63330674",
  },
  pro: {
    monthly: "8da537b0-7192-46cd-b38a-bbe341febdf7",
    yearly: "bcbd0c61-a5bd-4934-872a-7413324a330c",
  },
  elite: {
    monthly: "d212d1e6-4958-4329-a1f4-5b460886fc9d",
    yearly: "0b8f0aa3-57a7-4dd5-9ab3-ce68cebec7f6",
  },
  business: {
    monthly: "1fb17ce3-5bb4-473e-8c67-e50a8ce927dd",
    yearly: "39752b51-d4cd-4a03-9718-bb2b95f71084",
  },
};

interface PlanCardConfig {
  tier: PlanTier;
  name: string;
  label: string;
  bg: string;
  text: string;
  subText: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyCredits: string;
  yearlyCredits: string;
  features: string[];
  ctaBg: string;
  ctaText: string;
  ctaHover: string;
  bubbleColor: string;
  topBadge?: boolean;
  glow?: string;
}

const PLANS: PlanCardConfig[] = [
  {
    tier: "starter",
    name: "Starter",
    label: "BEST FOR BEGINNERS",
    bg: "#D1FAE5",
    text: "#1A1A1A",
    subText: "rgba(26,26,26,0.65)",
    monthlyPrice: 10,
    yearlyPrice: 99,
    monthlyCredits: "80 MC / month",
    yearlyCredits: "880 MC / year",
    features: [
      "All chat models",
      "50 images / month",
      "5 videos / month",
      "10 code builds / month",
      "Deploy & publish",
      "Standard support",
    ],
    ctaBg: "#000000",
    ctaText: "#FFFFFF",
    ctaHover: "#1f1f1f",
    bubbleColor: "rgba(255,255,255,0.7)",
  },
  {
    tier: "pro",
    name: "Pro",
    label: "PROFESSIONAL CHOICE",
    bg: "#2563EB",
    text: "#FFFFFF",
    subText: "rgba(255,255,255,0.75)",
    monthlyPrice: 29,
    yearlyPrice: 249,
    monthlyCredits: "280 MC / month",
    yearlyCredits: "2,480 MC / year",
    features: [
      "All AI models",
      "200 images / month",
      "20 videos / month",
      "40 code builds / month",
      "API access",
      "Priority support",
    ],
    ctaBg: "#FFFFFF",
    ctaText: "#2563EB",
    ctaHover: "#f3f4f6",
    bubbleColor: "rgba(255,255,255,0.35)",
  },
  {
    tier: "elite",
    name: "Elite",
    label: "MOST POPULAR",
    bg: "#7C3AED",
    text: "#FFFFFF",
    subText: "rgba(255,255,255,0.78)",
    monthlyPrice: 49,
    yearlyPrice: 499,
    monthlyCredits: "480 MC / month",
    yearlyCredits: "4,980 MC / year",
    features: [
      "All models (priority speed)",
      "500 images / month",
      "50 videos / month",
      "80 code builds / month",
      "API + webhooks",
      "Dedicated support",
    ],
    ctaBg: "#FFD700",
    ctaText: "#000000",
    ctaHover: "#ffdf33",
    bubbleColor: "rgba(255,215,0,0.35)",
    topBadge: true,
    glow: "0 0 60px rgba(124,58,237,0.55), 0 20px 50px -10px rgba(124,58,237,0.6)",
  },
  {
    tier: "business",
    name: "Business",
    label: "BEST VALUE",
    bg: "#D97706",
    text: "#FFFFFF",
    subText: "rgba(255,255,255,0.78)",
    monthlyPrice: 149,
    yearlyPrice: 1299,
    monthlyCredits: "1,480 MC / month",
    yearlyCredits: "12,980 MC / year",
    features: [
      "All models with priority speed",
      "2,000 images / month",
      "200 videos / month",
      "300 code builds / month",
      "Dedicated infrastructure",
      "SLA guarantees",
      "Dedicated account manager",
    ],
    ctaBg: "#FFFFFF",
    ctaText: "#D97706",
    ctaHover: "#FFF7ED",
    bubbleColor: "rgba(255,215,0,0.45)",
  },
];

const BUBBLES = Array.from({ length: 14 });

const ENTERPRISE_FEATURES: string[] = [
  "Custom MC Allocation",
  "All Models with Priority Speed",
  "Dedicated Infrastructure",
  "SLA Guarantees",
  "Custom API Access & Integrations",
  "Enterprise Security (SOC2-ready, GDPR & Advanced Encryption)",
  "Data Privacy & Compliance",
  "Early Access to New AI Models",
  "Advanced Analytics & Reporting",
  "Dedicated Account Manager",
  "24/7 Priority Support",
  "Priority Onboarding & Training",
  "Monthly Business Reviews",
  "Volume Discounts",
  "Custom Contract, Invoicing & Billing",
];

const PAYMENT_METHODS: { name: string; src: string }[] = [
  { name: "Visa",             src: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/visa.svg" },
  { name: "Mastercard",       src: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/mastercard.svg" },
  { name: "American Express", src: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/amex.svg" },
  { name: "Discover",         src: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/discover.svg" },
  { name: "Apple Pay",        src: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/apple-pay.svg" },
  { name: "UnionPay",         src: "https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/unionpay.svg" },
];

const PaymentIcons = () => (
  <div className="flex flex-wrap items-center justify-center gap-3">
    {PAYMENT_METHODS.map((p) => (
      <div
        key={p.name}
        title={p.name}
        className="h-10 w-16 rounded-lg border border-neutral-200 bg-white shadow-sm flex items-center justify-center px-2"
      >
        <img
          src={p.src}
          alt={p.name}
          loading="lazy"
          className="max-h-6 max-w-full object-contain"
        />
      </div>
    ))}
  </div>
);

const PricingPage = () => {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);

  const handleSubscribe = async (tier: PlanTier) => {
    // Hard double-click guard — block if ANY tier is already processing
    if (loadingTier) return;
    setLoadingTier(tier);

    const product_id = isYearly ? PRODUCT_MAP[tier].yearly : PRODUCT_MAP[tier].monthly;

    // Validate session and try to refresh if expired — prevents 502 from stale tokens
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      session = refreshed.session;
    }
    if (!session?.access_token) {
      setLoadingTier(null);
      await supabase.auth.signOut().catch(() => {});
      toast.error("Please sign in again to continue.");
      navigate("/auth?redirect=/pricing");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("polar-checkout", {
        body: { product_id, plan: tier },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) {
        // Auth issue → force re-login instead of showing a confusing gateway error
        const msg = (error as any)?.message?.toLowerCase?.() || "";
        if (msg.includes("unauthorized") || msg.includes("401") || msg.includes("jwt")) {
          await supabase.auth.signOut().catch(() => {});
          toast.error("Your session expired. Please sign in again.");
          navigate("/auth?redirect=/pricing");
          return;
        }
        throw error;
      }
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data?.error || "Checkout failed");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to open checkout. Please try again.");
      setLoadingTier(null);
    }
  };

  const handleStartEmpire = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    navigate(session ? "/chat" : "/auth?redirect=/chat");
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      {/* Bubble + utility CSS scoped to page */}
      <style>{`
        @keyframes pricing-bubble-rise {
          0%   { transform: translateY(0) scale(0.8); opacity: 0; }
          10%  { opacity: 0.9; }
          80%  { opacity: 0.6; }
          100% { transform: translateY(-180px) scale(1.1); opacity: 0; }
        }
        .pricing-bubble {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
          will-change: transform, opacity;
          animation: pricing-bubble-rise 5s ease-in-out infinite;
        }
        @keyframes gold-pulse {
          0%, 100% { box-shadow: 0 0 24px rgba(255,215,0,0.55), 0 0 60px rgba(255,215,0,0.25); }
          50%      { box-shadow: 0 0 38px rgba(255,215,0,0.85), 0 0 90px rgba(255,215,0,0.45); }
        }
      `}</style>

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-4 max-w-7xl mx-auto">
        <button
          onClick={() => goBackOr(navigate, "/")}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold tracking-tight">Pricing</h1>
      </div>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-8 sm:pt-14 pb-10 sm:pb-14 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="font-black tracking-tight leading-[1.05] text-foreground break-words"
          style={{ fontSize: "clamp(1.75rem, 6vw, 4.75rem)", letterSpacing: "-0.03em" }}
        >
          One AI Platform.
          <br />
          <span className="bg-gradient-to-r from-purple-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">
            Infinite Possibilities.
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mx-auto mt-5 max-w-2xl font-medium text-muted-foreground"
          style={{ fontSize: "clamp(0.95rem, 1.6vw, 1.125rem)" }}
        >
          Simple, transparent pricing. No hidden fees. Pay only for real usage across the entire AI ecosystem.
        </motion.p>

        {/* Toggle */}
        <div className="mt-8 inline-flex items-center gap-1 p-1 rounded-full bg-[#F1F5F9]">
          <button
            onClick={() => setIsYearly(false)}
            className={`px-5 sm:px-7 py-2.5 rounded-full text-sm transition-all ${
              !isYearly
                ? "bg-[#D1FAE5] text-black font-semibold shadow-sm"
                : "text-neutral-500 hover:text-neutral-800 font-medium"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={`inline-flex items-center gap-2 px-5 sm:px-7 py-2.5 rounded-full text-sm transition-all ${
              isYearly
                ? "bg-[#D1FAE5] text-black font-semibold shadow-sm"
                : "text-neutral-500 hover:text-neutral-800 font-medium"
            }`}
          >
            Yearly
            {isYearly && (
              <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border border-black/80 text-black bg-white whitespace-nowrap">
                20% off on yearly
              </span>
            )}
          </button>
        </div>
      </section>

      {/* Plans grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 items-stretch">
          {PLANS.map((p, i) => {
            const price = isYearly ? p.yearlyPrice : p.monthlyPrice;
            const credits = isYearly ? p.yearlyCredits : p.monthlyCredits;
            const isElite = p.tier === "elite";

            return (
              <motion.div
                key={p.tier}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: i * 0.07 }}
                className={`relative rounded-[24px] flex flex-col ${
                  isElite ? "lg:-translate-y-3 z-10" : ""
                }`}
                style={{
                  background: p.bg,
                  color: p.text,
                  boxShadow: p.glow ?? "0 12px 40px -12px rgba(0,0,0,0.12)",
                  minHeight: 540,
                }}
              >
                {/* MOST POPULAR badge above Elite */}
                {p.topBadge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <span
                      className="px-4 py-1 text-[11px] font-extrabold tracking-[0.2em] rounded-full text-black"
                      style={{
                        background: "#FFD700",
                        animation: "gold-pulse 2.4s ease-in-out infinite",
                      }}
                    >
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {/* Bubbles (small & subtle, clipped to card) */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[24px]">
                  {BUBBLES.map((_, b) => {
                    const size = 3 + ((b * 2) % 5); // 3px - 7px tiny bubbles
                    const left = (b * 13) % 95;
                    const delay = (b * 0.4) % 6;
                    return (
                      <span
                        key={b}
                        className="pricing-bubble"
                        style={{
                          width: size,
                          height: size,
                          left: `${left}%`,
                          bottom: `-${size}px`,
                          background: p.bubbleColor,
                          animationDelay: `${delay}s`,
                          animationDuration: `${5 + (b % 4)}s`,
                        }}
                      />
                    );
                  })}
                </div>

                {/* Content */}
                <div className="relative z-10 p-7 sm:p-8 flex flex-col flex-1">
                  {/* Label (glass frame) */}
                  {!p.topBadge && (
                    <span
                      className="self-start inline-block text-[10px] sm:text-[11px] font-bold tracking-[0.18em] px-3 py-1 rounded-full mb-5 backdrop-blur-md"
                      style={{
                        background: p.tier === "starter" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.18)",
                        border: p.tier === "starter" ? "1px solid rgba(0,0,0,0.15)" : "1px solid rgba(255,255,255,0.35)",
                        color: p.text,
                      }}
                    >
                      {p.label}
                    </span>
                  )}
                  {p.topBadge && <div className="h-6" />}

                  <h3
                    className="font-black"
                    style={{ fontSize: "clamp(1.5rem, 2.5vw, 1.875rem)" }}
                  >
                    {p.name}
                  </h3>

                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span
                      className="font-black leading-none"
                      style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)" }}
                    >
                      ${price}
                    </span>
                    <span className="text-sm font-medium" style={{ color: p.subText }}>
                      /{isYearly ? "year" : "month"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-semibold" style={{ color: p.subText }}>
                    {credits}
                  </p>

                  {/* CTA */}
                  <GlowButton
                    variant={p.tier as "starter" | "pro" | "elite" | "business"}
                    onClick={() => handleSubscribe(p.tier)}
                    disabled={loadingTier !== null}
                    className="mt-6 w-full"
                  >
                    {loadingTier === p.tier ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Get Started"
                    )}
                  </GlowButton>

                  {/* Features */}
                  <ul className="mt-6 space-y-2.5 flex-1">
                    {p.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2.5 text-sm"
                        style={{ color: p.subText }}
                      >
                        <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: p.text }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Enterprise — full width matte black */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-12 relative rounded-[28px] overflow-hidden p-8 sm:p-12"
          style={{
            background: "#0F0F0F",
            boxShadow: "0 30px 60px -20px rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="absolute inset-0 opacity-60 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at top right, rgba(255,215,0,0.12), transparent 55%), radial-gradient(ellipse at bottom left, rgba(255,215,0,0.08), transparent 60%)",
            }}
          />
          <div className="relative z-10 flex flex-col gap-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
              <div className="max-w-xl">
                <span className="inline-block text-[11px] font-bold tracking-[0.2em] px-3 py-1 rounded-full bg-white/5 border border-[#FFD700]/30 text-[#FFD700] mb-4">
                  ENTERPRISE
                </span>
                <h3
                  className="font-black text-white leading-tight"
                  style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)" }}
                >
                  Built for organizations <span className="text-[#FFD700]">at scale</span>.
                </h3>
                <p className="mt-4 text-white/65 text-base leading-relaxed">
                  Custom MC allocation, dedicated infrastructure, advanced security (SOC2, GDPR), SLA guarantees, and a dedicated account manager.
                </p>
              </div>
              <GlowButton
                variant="enterprise"
                onClick={() => navigate("/enterprise")}
                className="shrink-0"
              >
                Contact Sales
              </GlowButton>
            </div>

            {/* Enterprise full feature list */}
            <div>
              <h4 className="text-white font-bold text-sm tracking-[0.18em] uppercase mb-5">
                Enterprise Plan Features
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {ENTERPRISE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-white/80 text-sm leading-relaxed">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#FFD700]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-20 text-center">
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-black tracking-tight text-foreground"
          style={{ fontSize: "clamp(2rem, 5vw, 3.75rem)", letterSpacing: "-0.025em" }}
        >
          Ready to Own the Future?
        </motion.h3>
        <GlowButton
          variant="gold"
          onClick={handleStartEmpire}
          className="mt-8"
        >
          Start Your Empire Now
        </GlowButton>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col items-center gap-6">
          <PaymentIcons />
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <a
              href="https://terms.megsyai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </a>
            <span>|</span>
            <a
              href="https://privacy.megsyai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
            <span>|</span>
            <a
              href="/cookies"
              onClick={(e) => {
                e.preventDefault();
                navigate("/cookies");
              }}
              className="hover:text-foreground transition-colors"
            >
              Cookie Policy
            </a>
          </div>
          <p className="text-xs text-muted-foreground/70">© 2026 Megsy AI. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;
