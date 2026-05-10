import { motion } from "framer-motion";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import SEOHead from "@/components/SEOHead";
import { BookOpen, Bell } from "lucide-react";
import FancyButton from "@/components/FancyButton";

const BlogPage = () => (
  <div data-theme="dark" className="min-h-screen bg-background text-foreground">
    <SEOHead title="Blog" description="Stay updated with the latest news, tutorials, and insights from the Megsy AI team." path="/blog" />
    <LandingNavbar />

    <section className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-6 pt-24">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px]" />
      </div>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative z-10 mx-auto max-w-3xl text-center">
        <div className="mx-auto mb-8 inline-flex rounded-2xl bg-primary/10 p-5">
          <BookOpen className="h-10 w-10 text-primary" />
        </div>
        <h1 className="font-display text-5xl font-black uppercase tracking-tight sm:text-6xl md:text-7xl">
          <span className="text-primary">Blog</span>
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground">
          We're preparing something great. Tutorials, product updates, AI insights, and creative inspiration — all coming soon.
        </p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-12 rounded-2xl border border-white/[0.06] bg-card p-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Get Notified</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Be the first to know when we publish new content.</p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
            <FancyButton className="text-sm whitespace-nowrap">Subscribe</FancyButton>
          </div>
        </motion.div>
      </motion.div>
    </section>

    <LandingFooter />
  </div>
);

export default BlogPage;
