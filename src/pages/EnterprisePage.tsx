import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Shield, Zap, Users, Server, Headphones, Lock, Building2, Star, BarChart3, FileText, Clock, Gem, Crown, Rocket, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";

const companySizes = ["1-10", "11-50", "51-200", "201-500", "500+"];
const needs = [
  "Image generation at scale",
  "Video generation at scale",
  "Custom AI models",
  "API access & webhooks",
  "Dedicated infrastructure",
  "SLA guarantees",
  "Priority support",
  "Custom integrations",
  "Data privacy & compliance",
  "Advanced analytics",
];

const features = [
  { icon: Gem, title: "Custom MC Allocation", desc: "Tailored credit allocation based on your organization's unique needs." },
  { icon: Zap, title: "Priority Speed Access", desc: "Maximum speed across all AI models with dedicated GPU allocation." },
  { icon: Server, title: "Dedicated Infrastructure", desc: "Isolated compute resources with guaranteed uptime and performance." },
  { icon: Shield, title: "SLA Guarantees", desc: "Contractual uptime and performance guarantees for mission-critical operations." },
  { icon: Rocket, title: "Custom API & Integrations", desc: "Seamless integration with your existing systems and workflows." },
  { icon: Lock, title: "Enterprise Security", desc: "SOC2-ready, GDPR compliance, and advanced encryption standards." },
  { icon: Globe, title: "Data Privacy & Compliance", desc: "Full data sovereignty with regulatory compliance for your industry." },
  { icon: Star, title: "Early Access to New Models", desc: "Be the first to test and deploy cutting-edge AI models." },
  { icon: BarChart3, title: "Advanced Analytics", desc: "Detailed usage analytics and reporting for your entire team." },
  { icon: Users, title: "Dedicated Account Manager", desc: "A personal point of contact to ensure your success." },
  { icon: Headphones, title: "24/7 Priority Support", desc: "Round-the-clock support with guaranteed response times." },
  { icon: Clock, title: "Priority Onboarding", desc: "Fast-track team onboarding with personalized training sessions." },
  { icon: FileText, title: "Monthly Business Reviews", desc: "Regular strategic reviews to optimize your AI usage." },
  { icon: Crown, title: "Volume Discounts", desc: "Exclusive pricing for high-volume enterprise needs." },
  { icon: Building2, title: "Custom Contract & Billing", desc: "Flexible contracts and invoicing to match your finance systems." },
];

const EnterpriseFormSection = () => {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleNeed = (need: string) => {
    setSelectedNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]
    );
  };

  const handleSubmit = async () => {
    if (!companyName || !contactName || !email) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      await supabase.from("contact_submissions").insert({
        name: contactName,
        email,
        message: `Company: ${companyName}\nSize: ${companySize}\nNeeds: ${selectedNeeds.join(", ")}\n\n${message}`,
        form_type: "enterprise",
        subject: `Enterprise Inquiry - ${companyName}`,
      });

      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-bot`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "notify_admin",
            message: `🏢 Enterprise Inquiry\n\nCompany: ${companyName}\nContact: ${contactName}\nEmail: ${email}\nSize: ${companySize}\nNeeds: ${selectedNeeds.join(", ")}\n\nMessage: ${message || "N/A"}`,
          }),
        });
      } catch { /* silent */ }

      toast.success("Your inquiry has been submitted. We'll get back to you soon.");
      navigate("/pricing");
    } catch {
      toast.error("Failed to submit. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wider">Company Name *</label>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/30 text-sm text-foreground outline-none focus:border-primary/30 transition-colors placeholder:text-muted-foreground/50" placeholder="Acme Inc." />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wider">Contact Name *</label>
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/30 text-sm text-foreground outline-none focus:border-primary/30 transition-colors placeholder:text-muted-foreground/50" placeholder="John Doe" />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wider">Business Email *</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/30 text-sm text-foreground outline-none focus:border-primary/30 transition-colors placeholder:text-muted-foreground/50" placeholder="john@company.com" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wider">Company Size</label>
        <div className="flex flex-wrap gap-2">
          {companySizes.map((size) => (
            <button key={size} onClick={() => setCompanySize(size)} className={`px-4 py-2.5 rounded-xl text-sm border transition-colors ${companySize === size ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : "border-border text-muted-foreground hover:border-cyan-500/20"}`}>
              {size}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wider">What do you need?</label>
        <div className="flex flex-wrap gap-2">
          {needs.map((need) => (
            <button key={need} onClick={() => toggleNeed(need)} className={`px-3 py-2 rounded-xl text-sm border transition-colors ${selectedNeeds.includes(need) ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : "border-border text-muted-foreground hover:border-cyan-500/20"}`}>
              {need}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wider">Additional Details</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/30 text-sm text-foreground outline-none focus:border-primary/30 transition-colors resize-none placeholder:text-muted-foreground/50" placeholder="Tell us about your use case..." />
      </div>
      <button onClick={handleSubmit} disabled={submitting || !companyName || !contactName || !email} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 shadow-lg shadow-cyan-500/20">
        <Send className="w-4 h-4" />
        {submitting ? "Submitting..." : "Submit Inquiry"}
      </button>
    </div>
  );
};

const EnterprisePage = () => {
  return (
    <div data-theme="dark" className="min-h-screen bg-background text-foreground">
      <LandingNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(6,182,212,0.06),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.04),transparent_50%)]" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-6">
              <Building2 className="w-3.5 h-3.5" />
              Enterprise
            </div>
            <h1 className="font-display text-[12vw] md:text-[5vw] font-black uppercase leading-[0.9] tracking-tighter">
              AI AT{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">ENTERPRISE</span>{" "}
              SCALE
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
              Custom MC allocation, dedicated infrastructure, priority processing, and enterprise-grade security for your organization.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-2xl font-bold text-foreground text-center mb-12"
          >
            Everything Your Enterprise Needs
          </motion.h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((h, i) => (
              <motion.div
                key={h.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border/50 bg-card/30 p-6 hover:border-cyan-500/20 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 flex items-center justify-center mb-4 group-hover:from-cyan-500/20 group-hover:to-indigo-500/20 transition-colors">
                  <h.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{h.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{h.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 md:py-24 border-t border-border/50">
        <div className="mx-auto max-w-2xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2 text-center">Get in Touch</h2>
            <p className="text-sm text-muted-foreground text-center mb-8">Our team will create a custom plan for your needs.</p>
            <EnterpriseFormSection />
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

export default EnterprisePage;
