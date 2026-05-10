import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Lenis from "lenis";
import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import HorizontalGallery from "@/components/landing/HorizontalGallery";
import StatsMarquee from "@/components/landing/StatsMarquee";
import StickyFeatureTabs from "@/components/landing/StickyFeatureTabs";
import ParallaxShowcase from "@/components/landing/ParallaxShowcase";
import ModelsMarquee from "@/components/landing/ModelsMarquee";
import ShowcaseGallery from "@/components/landing/ShowcaseGallery";
import HowItWorks from "@/components/landing/HowItWorks";
import PricingPreview from "@/components/landing/PricingPreview";
import FAQSection from "@/components/landing/FAQSection";
import CTASection from "@/components/landing/CTASection";
import LandingFooter from "@/components/landing/LandingFooter";
import ReferralBanner from "@/components/landing/ReferralBanner";
import ReferralSection from "@/components/landing/ReferralSection";

const LandingPage = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/chat", { replace: true });
      } else {
        setReady(true);
      }
    });
  }, [navigate]);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  if (!ready) return <div className="min-h-screen bg-background" />;

  return (
    <div data-theme="dark" className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <LandingNavbar />
      <HeroSection />
      <StatsMarquee />
      <ReferralBanner />
      <HorizontalGallery />
      <StickyFeatureTabs />
      <ParallaxShowcase />
      <ShowcaseGallery />
      <ModelsMarquee />
      <HowItWorks />
      <PricingPreview />
      <ReferralSection />
      <FAQSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
