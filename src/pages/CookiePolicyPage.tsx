import { motion } from "framer-motion";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import SEOHead from "@/components/SEOHead";
import { Cookie, Shield, Settings, BarChart3, Globe, Scale, FileText, AlertTriangle } from "lucide-react";

const cookieTypes = [
  {
    icon: Shield,
    name: "Essential Cookies (Strictly Necessary)",
    required: true,
    legalBasis: "Legitimate Interest (Art. 6(1)(f) GDPR) — No consent required",
    description:
      "These cookies are essential for the platform to function and cannot be disabled. They handle core functionalities like authentication, session management, security (CSRF protection), load balancing, and storing your cookie consent preferences. Without these cookies, the Service cannot operate. Under GDPR Article 5(3) of the ePrivacy Directive, Egyptian Law No. 151 of 2020 (Personal Data Protection Law), and the California Consumer Privacy Act (CCPA), strictly necessary cookies are exempt from consent requirements.",
    examples: [
      "Session ID (sb-auth-token)",
      "Authentication state",
      "CSRF protection token",
      "Cookie consent preferences",
      "Load balancer affinity",
      "Security headers",
    ],
    retention: "Session or up to 30 days for persistent login",
  },
  {
    icon: BarChart3,
    name: "Analytics & Performance Cookies",
    required: false,
    legalBasis: "Consent (Art. 6(1)(a) GDPR)",
    description:
      "These cookies collect anonymized, aggregated data about how visitors interact with Megsy — such as which pages are visited most, how long users spend on features, and where errors occur. This data helps us improve the platform's performance and user experience. No personally identifiable information is collected through analytics cookies. You can opt in or out at any time through our cookie consent banner or browser settings.",
    examples: [
      "Page view counts",
      "Feature usage frequency",
      "Error and crash reports",
      "Performance metrics (load times)",
      "Navigation patterns",
      "Device/browser type (anonymized)",
    ],
    retention: "Up to 12 months",
  },
  {
    icon: Settings,
    name: "Preference / Functional Cookies",
    required: false,
    legalBasis: "Consent (Art. 6(1)(a) GDPR)",
    description:
      "These cookies remember your settings and preferences so you don't have to reconfigure them each visit. They personalize your experience by storing choices like theme, language, display layout, and notification settings. These cookies do not track you across other websites.",
    examples: [
      "Theme preference (dark/light)",
      "Language selection",
      "UI layout preferences",
      "Notification display settings",
      "Sidebar state",
      "Model preferences",
    ],
    retention: "Up to 12 months",
  },
];

const legalFrameworks = [
  {
    icon: Globe,
    region: "European Union — GDPR",
    description:
      "Under the General Data Protection Regulation (EU 2016/679) and the ePrivacy Directive (2002/58/EC), we obtain explicit, informed consent before placing non-essential cookies. You have the right to withdraw consent at any time. Essential cookies are placed under our legitimate interest to provide the Service. We do not transfer cookie data outside the EU/EEA without adequate safeguards (Standard Contractual Clauses).",
  },
  {
    icon: Scale,
    region: "Egypt — Law No. 151 of 2020",
    description:
      "In compliance with the Egyptian Personal Data Protection Law (Law No. 151 of 2020) and its Executive Regulations, we process cookie data as the Data Controller. We obtain consent for non-essential cookies and provide clear information about data processing purposes. Users have the right to access, rectify, and delete their cookie-related data. Our data processing complies with the requirements of the Egyptian Data Protection Center (EDPC).",
  },
  {
    icon: FileText,
    region: "United States — CCPA / CPRA",
    description:
      'Under the California Consumer Privacy Act (CCPA) as amended by the California Privacy Rights Act (CPRA), California residents have the right to know what personal information is collected via cookies, request deletion, and opt out of the "sale" or "sharing" of personal information. Megsy does not sell personal data collected through cookies. We do not use cookies for cross-context behavioral advertising. You may exercise your rights by contacting us at privacy@megsyai.com.',
  },
];

const CookiePolicyPage = () => (
  <div data-theme="dark" className="min-h-screen bg-background text-foreground">
    <SEOHead
      title="Cookie Policy"
      description="Understand how Megsy AI uses cookies. Compliant with GDPR (EU), Egyptian Law 151/2020, and CCPA/CPRA (US). Learn about cookie types and your rights."
      path="/cookies"
    />
    <LandingNavbar />

    {/* Hero */}
    <section className="relative flex min-h-[50vh] flex-col items-center justify-center overflow-hidden px-6 pt-24">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px]" />
      </div>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative z-10 text-center">
        <h1 className="font-display text-5xl font-black uppercase tracking-tight sm:text-6xl md:text-7xl">
          Cookie <span className="text-primary">Policy</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">Last updated: March 14, 2026</p>
      </motion.div>
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>

    <section className="mx-auto max-w-4xl px-6 pb-28">
      {/* What Are Cookies */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 rounded-2xl border border-white/[0.06] bg-card p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl bg-primary/10 p-2.5"><Cookie className="h-5 w-5 text-primary" /></div>
          <h2 className="text-xl font-bold text-foreground">What Are Cookies?</h2>
        </div>
        <p className="text-sm leading-[1.8] text-muted-foreground">
          Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and improve your experience. Megsy uses cookies responsibly and transparently. <strong className="text-foreground/70">We do not use third-party advertising cookies, tracking pixels, or cross-site tracking technologies.</strong> This policy explains what cookies we use, why we use them, and how you can control them — in full compliance with Egyptian, European, and American data protection laws.
        </p>
      </motion.div>

      {/* Data Controller */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 rounded-2xl border border-white/[0.06] bg-card p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl bg-primary/10 p-2.5"><AlertTriangle className="h-5 w-5 text-primary" /></div>
          <h2 className="text-xl font-bold text-foreground">Data Controller</h2>
        </div>
        <div className="text-sm leading-[1.8] text-muted-foreground space-y-2">
          <p><strong className="text-foreground/70">Controller:</strong> Megsy AI (operated by El Giza Digital Solutions)</p>
          <p><strong className="text-foreground/70">Registered in:</strong> Arab Republic of Egypt</p>
          <p><strong className="text-foreground/70">Data Protection Contact:</strong>{" "}
            <a href="mailto:privacy@megsyai.com" className="text-primary hover:underline">privacy@megsyai.com</a>
          </p>
          <p><strong className="text-foreground/70">Website:</strong> megsyai.com</p>
        </div>
      </motion.div>

      {/* Cookie Types */}
      <h2 className="mb-6 font-display text-2xl font-black uppercase text-foreground">Types of Cookies We Use</h2>
      <div className="space-y-6 mb-16">
        {cookieTypes.map((type, i) => (
          <motion.div
            key={type.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl border border-white/[0.06] bg-card p-8"
          >
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5"><type.icon className="h-5 w-5 text-primary" /></div>
                <h3 className="text-xl font-bold text-foreground">{type.name}</h3>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${type.required ? "bg-primary/20 text-primary" : "bg-white/[0.06] text-muted-foreground"}`}>
                {type.required ? "Required — Cannot Be Disabled" : "Optional — Consent Required"}
              </span>
            </div>
            <p className="text-sm leading-[1.8] text-muted-foreground mb-3">{type.description}</p>
            <p className="text-xs text-muted-foreground/70 mb-3"><strong>Legal Basis:</strong> {type.legalBasis}</p>
            <p className="text-xs text-muted-foreground/70 mb-4"><strong>Retention Period:</strong> {type.retention}</p>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 mb-2">Specific Cookies</p>
              <div className="flex flex-wrap gap-2">
                {type.examples.map((ex) => (
                  <span key={ex} className="rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-muted-foreground border border-white/[0.06]">
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Legal Frameworks */}
      <h2 className="mb-6 font-display text-2xl font-black uppercase text-foreground">Legal Compliance</h2>
      <div className="space-y-6 mb-16">
        {legalFrameworks.map((fw, i) => (
          <motion.div
            key={fw.region}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl border border-white/[0.06] bg-card p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-primary/10 p-2.5"><fw.icon className="h-5 w-5 text-primary" /></div>
              <h3 className="text-xl font-bold text-foreground">{fw.region}</h3>
            </div>
            <p className="text-sm leading-[1.8] text-muted-foreground">{fw.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Your Rights */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 rounded-2xl border border-white/[0.06] bg-card p-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Your Cookie Rights</h2>
        <div className="text-sm leading-[1.8] text-muted-foreground space-y-3">
          <p>Under applicable data protection laws, you have the right to:</p>
          <ul className="list-disc list-inside space-y-1.5 ml-2">
            <li><strong className="text-foreground/70">Accept or reject</strong> non-essential cookies through the consent banner on first visit</li>
            <li><strong className="text-foreground/70">Withdraw consent</strong> at any time by clearing your browser cookies or contacting us</li>
            <li><strong className="text-foreground/70">Access information</strong> about what cookie data we hold about you</li>
            <li><strong className="text-foreground/70">Request deletion</strong> of cookie-related data</li>
            <li><strong className="text-foreground/70">Opt out of analytics</strong> cookies without affecting your access to the Service</li>
            <li><strong className="text-foreground/70">Configure browser settings</strong> to block or delete cookies (note: blocking essential cookies will prevent the platform from functioning)</li>
          </ul>
        </div>
      </motion.div>

      {/* Managing Cookies */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 rounded-2xl border border-white/[0.06] bg-card p-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Managing Your Cookies</h2>
        <div className="text-sm leading-[1.8] text-muted-foreground space-y-3">
          <p>You can manage cookie preferences through multiple channels:</p>
          <ul className="list-disc list-inside space-y-1.5 ml-2">
            <li><strong className="text-foreground/70">Cookie Consent Banner:</strong> Appears on your first visit — accept or decline non-essential cookies</li>
            <li><strong className="text-foreground/70">Browser Settings:</strong> Most browsers (Chrome, Firefox, Safari, Edge) allow you to block or delete cookies via their privacy settings</li>
            <li><strong className="text-foreground/70">Clear Storage:</strong> You can clear all Megsy data by clearing your browser's local storage and cookies for megsyai.com</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground/60">
            Note: Disabling essential cookies will prevent authentication and core platform functionality. We recommend only disabling analytics and preference cookies if you wish to limit data collection.
          </p>
        </div>
      </motion.div>

      {/* Third Parties */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 rounded-2xl border border-white/[0.06] bg-card p-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Third-Party Cookies</h2>
        <p className="text-sm leading-[1.8] text-muted-foreground">
          Megsy does <strong className="text-foreground/70">not</strong> use third-party advertising or behavioral tracking cookies. We do not participate in ad networks or sell cookie data. Our infrastructure providers (Supabase for backend services) may set strictly necessary cookies for security and performance purposes — these are covered under our essential cookies category and are subject to the same data protection standards.
        </p>
      </motion.div>

      {/* Updates */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 rounded-2xl border border-white/[0.06] bg-card p-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Changes to This Policy</h2>
        <p className="text-sm leading-[1.8] text-muted-foreground">
          We may update this Cookie Policy from time to time to reflect changes in our practices, technology, or legal requirements. Material changes will be communicated through our cookie consent banner or via email to registered users. The "Last updated" date at the top of this page indicates when the policy was last revised. We encourage you to review this policy periodically.
        </p>
      </motion.div>

      {/* Contact */}
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="rounded-2xl border border-white/[0.06] bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Questions about cookies or data protection? Contact our Data Protection Officer at{" "}
          <a href="mailto:privacy@megsyai.com" className="text-primary hover:underline">privacy@megsyai.com</a>
        </p>
        <p className="text-xs text-muted-foreground/50 mt-3">
          For EU residents: You may lodge a complaint with your local supervisory authority.
          For Egyptian residents: You may contact the Egyptian Data Protection Center (EDPC).
          For California residents: You may contact the California Attorney General's office.
        </p>
      </motion.div>
    </section>

    <LandingFooter />
  </div>
);

export default CookiePolicyPage;
