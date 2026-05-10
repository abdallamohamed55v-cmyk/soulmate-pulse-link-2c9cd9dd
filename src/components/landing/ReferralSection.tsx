import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const steps = [
  { num: "01", title: "Create Your Account", desc: "Sign up for free and get your unique partner dashboard." },
  { num: "02", title: "Get Your Link", desc: "Copy your unique referral link that tracks clicks, signups, and conversions." },
  { num: "03", title: "Share Everywhere", desc: "Post on social media, blogs, YouTube, or send directly to friends." },
  { num: "04", title: "People Sign Up", desc: "When someone uses your link and subscribes, you earn commission." },
  { num: "05", title: "Get Paid", desc: "Withdraw your earnings anytime. No minimum, 24-hour payouts." },
];

const commissions = [
  { plan: "Starter", monthly: "$1.80", yearly: "$17.80" },
  { plan: "Pro", monthly: "$5.80", yearly: "$49.80" },
  { plan: "Elite", monthly: "$9.80", yearly: "$99.80" },
  { plan: "Business", monthly: "$29.80", yearly: "$259.80" },
];

const ReferralSection = () => {
  return (
    <section className="py-20 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Your Earnings,{" "}
            <span className="bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent">
              Your Rules
            </span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            20% commission on every subscription, forever. No caps, no expiry. Plus, referred users get 5% off.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h3 className="text-lg font-bold text-foreground mb-4">Commission Per Referral</h3>
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="grid grid-cols-3 bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <div className="px-4 py-3">Plan</div>
                <div className="px-4 py-3 text-center">Monthly</div>
                <div className="px-4 py-3 text-center">Yearly</div>
              </div>
              {commissions.map((c) => (
                <div key={c.plan} className="grid grid-cols-3 border-t border-border">
                  <div className="px-4 py-3.5 text-sm font-medium text-foreground">{c.plan}</div>
                  <div className="px-4 py-3.5 text-sm text-center bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent font-bold">{c.monthly}</div>
                  <div className="px-4 py-3.5 text-sm text-center bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent font-bold">{c.yearly}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">* You earn 20% of each subscription payment, recurring forever.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h3 className="text-lg font-bold text-foreground mb-4">How It Works</h3>
            <div className="space-y-4">
              {steps.map((step) => (
                <div key={step.num} className="flex gap-4 items-start">
                  <span className="text-xl font-bold bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent shrink-0 w-8">{step.num}</span>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{step.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
          <a
            href="https://referral.megsyai.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Join the Referral Program
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default ReferralSection;
