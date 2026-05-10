import { motion } from "framer-motion";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import SEOHead from "@/components/SEOHead";
import { Sparkles, Zap, Bug, Shield } from "lucide-react";

type EntryType = "feature" | "improvement" | "fix" | "security";
const typeConfig: Record<EntryType, {icon: typeof Sparkles;color: string;label: string;}> = {
  feature: { icon: Sparkles, color: "text-emerald-400 bg-emerald-500/10", label: "New" },
  improvement: { icon: Zap, color: "text-blue-400 bg-blue-500/10", label: "Improved" },
  fix: { icon: Bug, color: "text-orange-400 bg-orange-500/10", label: "Fixed" },
  security: { icon: Shield, color: "text-red-400 bg-red-500/10", label: "Security" }
};

const changelog = [
{
  version: "2.4.0",
  date: "March 14, 2026",
  entries: [
  { type: "feature" as EntryType, text: "Launched Megsy Models page — press-ready showcase of all Megsy AI models" },
  { type: "feature" as EntryType, text: "Added Terms of Service, Privacy Policy, Cookie Policy, Careers, Security, and Blog pages" },
  { type: "improvement" as EntryType, text: "Full SEO infrastructure with sitemap.xml, canonical URLs, and structured metadata" },
  { type: "improvement" as EntryType, text: "Updated navigation with links to all new pages" }]

},
{
  version: "2.3.0",
  date: "March 10, 2026",
  entries: [
  { type: "feature" as EntryType, text: "Per-model customization system for image and video generation settings" },
  { type: "improvement" as EntryType, text: "Simplified video UI — removed quality selector, focus on duration and aspect ratio" },
  { type: "improvement" as EntryType, text: "Redesigned showcase cards with glassmorphism hover effects" },
  { type: "fix" as EntryType, text: "Fixed model icon fallbacks in image and video input bars" }]

},
{
  version: "2.2.0",
  date: "March 5, 2026",
  entries: [
  { type: "feature" as EntryType, text: "Image Studio and Video Studio with dedicated editing interfaces" },
  { type: "feature" as EntryType, text: "AI Agent mode for automated image and video workflows" },
  { type: "improvement" as EntryType, text: "Landing page redesigned with cinematic hero and smooth scroll" },
  { type: "security" as EntryType, text: "Enhanced content protection — disabled right-click and text selection" }]

},
{
  version: "2.1.0",
  date: "February 25, 2026",
  entries: [
  { type: "feature" as EntryType, text: "Code Builder with live preview and deployment to Vercel" },
  { type: "feature" as EntryType, text: "File analysis with support for PDF, images, and documents" },
  { type: "improvement" as EntryType, text: "Referral system with earning tracking and withdrawals" },
  { type: "fix" as EntryType, text: "Fixed authentication flow edge cases with session persistence" }]

},
{
  version: "2.0.0",
  date: "February 15, 2026",
  entries: [
  { type: "feature" as EntryType, text: "Megsy 2.0 launch — unified platform for chat, images, videos, code, and files" },
  { type: "feature" as EntryType, text: "80+ AI models available through a single interface" },
  { type: "feature" as EntryType, text: "Credit-based billing system with transparent per-action pricing" },
  { type: "feature" as EntryType, text: "OAuth 2.0 provider for third-party integrations" },
  { type: "security" as EntryType, text: "Two-factor authentication support" }]

}];


const ChangelogPage = () =>
<div data-theme="dark" className="min-h-screen bg-background text-foreground">
    <SEOHead title="Changelog" description="See what's new in Megsy AI. Latest features, improvements, bug fixes, and security updates." path="/changelog" />
    <LandingNavbar />

    <section className="relative flex min-h-[50vh] flex-col items-center justify-center overflow-hidden px-6 pt-24">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px]" />
      </div>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative z-10 text-center">
        <h1 className="font-display text-5xl font-black uppercase tracking-tight sm:text-6xl md:text-7xl">
          Change<span className="text-primary">log</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">Track every update, feature, and fix.</p>
      </motion.div>
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>

    <section className="mx-auto max-w-3xl px-6 pb-28">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-white/[0.06] hidden md:block" />

        <div className="space-y-16">
          {changelog.map((release, ri) =>
        <motion.div key={release.version} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: ri * 0.05 }}>
              {/* Version header */}
              <div className="flex items-center gap-4 mb-6">
                

            
                <div>
                  <h2 className="text-2xl font-bold text-foreground">v{release.version}</h2>
                  <p className="text-sm text-muted-foreground">{release.date}</p>
                </div>
              </div>

              {/* Entries */}
              <div className="ml-0 md:ml-14 space-y-3">
                {release.entries.map((entry, ei) => {
              const cfg = typeConfig[entry.type];
              return (
                <div key={ei} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-card px-5 py-4">
                      <span className={`mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.color}`}>
                        
                        {cfg.label}
                      </span>
                      <span className="text-sm text-foreground/80">{entry.text}</span>
                    </div>);

            })}
              </div>
            </motion.div>
        )}
        </div>
      </div>
    </section>

    <LandingFooter />
  </div>;


export default ChangelogPage;