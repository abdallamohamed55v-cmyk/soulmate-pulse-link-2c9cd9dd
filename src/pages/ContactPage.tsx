import { useState, useEffect } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import Lenis from "lenis";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";

/* ── Schemas ── */
const supportSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  message: z.string().trim().min(1, "Please describe your issue").max(2000)
});

const enterpriseSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  workEmail: z.string().trim().email("Invalid email").max(255),
  company: z.string().trim().min(1, "Company name is required").max(200),
  country: z.string().trim().min(1, "Country is required"),
  companySize: z.string().trim().min(1, "Company size is required"),
  needs: z.string().trim().min(1, "Please tell us about your needs").max(2000)
});

type SupportData = z.infer<typeof supportSchema>;
type EnterpriseData = z.infer<typeof enterpriseSchema>;

const countries = [
"Egypt", "United States", "United Kingdom", "Germany", "France",
"Saudi Arabia", "UAE", "Canada", "Australia", "Japan", "India",
"Brazil", "South Korea", "Other"];


const companySizes = [
"1-10", "11-50", "51-200", "201-1000", "1000+"];


const ContactPage = () => {
  const [tab, setTab] = useState<"support" | "enterprise">("support");
  const [submitting, setSubmitting] = useState(false);

  // Lenis momentum scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  // Spring-based scroll progress for momentum feel
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 60, damping: 20, mass: 0.8 });
  const graphicY = useTransform(smoothProgress, [0, 1], [0, -80]);
  const graphicRotate = useTransform(smoothProgress, [0, 1], [0, -3]);

  const supportForm = useForm<SupportData>({ resolver: zodResolver(supportSchema) });
  const enterpriseForm = useForm<EnterpriseData>({ resolver: zodResolver(enterpriseSchema) });

  const onSupportSubmit = async (data: SupportData) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("contact_submissions").insert({
        name: data.username,
        email: data.email,
        message: data.message,
        form_type: "support"
      });
      if (error) throw error;
      toast.success("Request submitted successfully!");
      supportForm.reset();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onEnterpriseSubmit = async (data: EnterpriseData) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("contact_submissions").insert({
        name: `${data.firstName} ${data.lastName}`,
        email: data.workEmail,
        message: data.needs,
        subject: `Enterprise - ${data.company}`,
        form_type: "enterprise"
      });
      if (error) throw error;
      toast.success("Inquiry submitted successfully!");
      enterpriseForm.reset();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
  "w-full rounded-xl border border-white/10 bg-transparent px-5 py-4 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 selectable";

  return (
    <div data-theme="dark" className="min-h-screen bg-background text-foreground">
      <LandingNavbar />

      <section className="relative pt-28 pb-20 md:pt-36 md:pb-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-start gap-12 md:grid-cols-2 md:gap-16">
            {/* Left: Graphic with momentum parallax */}
            <motion.div
              style={{ y: graphicY, rotate: graphicRotate }}
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="sticky top-32">
              
              























              
            </motion.div>

            {/* Right: Form */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}>
              
              <h1 className="font-display mb-8 text-4xl font-black uppercase tracking-tight text-white md:text-5xl">
                REACH OUT TO OUR TEAM
              </h1>

              {/* Tab switcher */}
              <div className="mb-10 inline-flex items-center rounded-full bg-white/5 p-1">
                <button
                  onClick={() => setTab("support")}
                  className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-all ${
                  tab === "support" ?
                  "bg-emerald-500 text-black shadow-lg shadow-emerald-500/25" :
                  "text-white/50 hover:text-white/80"}`
                  }>
                  
                  Support and billing
                </button>
                <button
                  onClick={() => setTab("enterprise")}
                  className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-all ${
                  tab === "enterprise" ?
                  "bg-emerald-500 text-black shadow-lg shadow-emerald-500/25" :
                  "text-white/50 hover:text-white/80"}`
                  }>
                  
                  Enterprise sales
                </button>
              </div>

              {/* Support form */}
              {tab === "support" &&
              <motion.form
                key="support"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                onSubmit={supportForm.handleSubmit(onSupportSubmit)}
                className="space-y-5">
                
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <input
                      {...supportForm.register("username")}
                      placeholder="Your Megsy username *"
                      className={inputClass} />
                    
                      {supportForm.formState.errors.username &&
                    <p className="mt-1.5 text-xs text-red-400">{supportForm.formState.errors.username.message}</p>
                    }
                    </div>
                    <div>
                      <input
                      {...supportForm.register("email")}
                      placeholder="Email address *"
                      className={inputClass} />
                    
                      {supportForm.formState.errors.email &&
                    <p className="mt-1.5 text-xs text-red-400">{supportForm.formState.errors.email.message}</p>
                    }
                    </div>
                  </div>
                  <div>
                    <textarea
                    {...supportForm.register("message")}
                    placeholder="Describe your issue *"
                    rows={6}
                    className={`${inputClass} resize-none`} />
                  
                    {supportForm.formState.errors.message &&
                  <p className="mt-1.5 text-xs text-red-400">{supportForm.formState.errors.message.message}</p>
                  }
                  </div>
                  <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full border border-white/20 bg-white px-8 py-3 text-sm font-bold text-black transition-all hover:bg-white/90 disabled:opacity-50">
                  
                    {submitting ? "Submitting..." : "Submit Request"}
                  </button>
                  <p className="text-xs leading-relaxed text-white/25">
                    By submitting this form, I agree to receive updates and marketing communications from Megsy, as outlined in the{" "}
                    <a href="https://privacy.megsyai.com" target="_blank" rel="noopener noreferrer" className="text-white/40 underline hover:text-white/60">
                      Privacy & Cookie Policy
                    </a>.
                  </p>
                </motion.form>
              }

              {/* Enterprise form */}
              {tab === "enterprise" &&
              <motion.form
                key="enterprise"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                onSubmit={enterpriseForm.handleSubmit(onEnterpriseSubmit)}
                className="space-y-5">
                
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <input {...enterpriseForm.register("firstName")} placeholder="First Name *" className={inputClass} />
                      {enterpriseForm.formState.errors.firstName &&
                    <p className="mt-1.5 text-xs text-red-400">{enterpriseForm.formState.errors.firstName.message}</p>
                    }
                    </div>
                    <div>
                      <input {...enterpriseForm.register("lastName")} placeholder="Last Name *" className={inputClass} />
                      {enterpriseForm.formState.errors.lastName &&
                    <p className="mt-1.5 text-xs text-red-400">{enterpriseForm.formState.errors.lastName.message}</p>
                    }
                    </div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <input {...enterpriseForm.register("workEmail")} placeholder="Work Email *" className={inputClass} />
                      {enterpriseForm.formState.errors.workEmail &&
                    <p className="mt-1.5 text-xs text-red-400">{enterpriseForm.formState.errors.workEmail.message}</p>
                    }
                    </div>
                    <div>
                      <input {...enterpriseForm.register("company")} placeholder="Company Name *" className={inputClass} />
                      {enterpriseForm.formState.errors.company &&
                    <p className="mt-1.5 text-xs text-red-400">{enterpriseForm.formState.errors.company.message}</p>
                    }
                    </div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <select {...enterpriseForm.register("country")} className={`${inputClass} appearance-none`} defaultValue="">
                        <option value="" disabled className="bg-black text-white/30">Country *</option>
                        {countries.map((c) =>
                      <option key={c} value={c} className="bg-black text-white">{c}</option>
                      )}
                      </select>
                      {enterpriseForm.formState.errors.country &&
                    <p className="mt-1.5 text-xs text-red-400">{enterpriseForm.formState.errors.country.message}</p>
                    }
                    </div>
                    <div>
                      <select {...enterpriseForm.register("companySize")} className={`${inputClass} appearance-none`} defaultValue="">
                        <option value="" disabled className="bg-black text-white/30">Company size *</option>
                        {companySizes.map((s) =>
                      <option key={s} value={s} className="bg-black text-white">{s}</option>
                      )}
                      </select>
                      {enterpriseForm.formState.errors.companySize &&
                    <p className="mt-1.5 text-xs text-red-400">{enterpriseForm.formState.errors.companySize.message}</p>
                    }
                    </div>
                  </div>
                  <div>
                    <textarea
                    {...enterpriseForm.register("needs")}
                    placeholder="Tell us about your needs *"
                    rows={5}
                    className={`${inputClass} resize-none`} />
                  
                    {enterpriseForm.formState.errors.needs &&
                  <p className="mt-1.5 text-xs text-red-400">{enterpriseForm.formState.errors.needs.message}</p>
                  }
                  </div>
                  <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full border border-white/20 bg-white px-8 py-3 text-sm font-bold text-black transition-all hover:bg-white/90 disabled:opacity-50">
                  
                    {submitting ? "Submitting..." : "Submit Inquiry"}
                  </button>
                  <p className="text-xs leading-relaxed text-white/25">
                    By submitting this form, I agree to receive updates and marketing communications from Megsy, as outlined in the{" "}
                    <a href="https://privacy.megsyai.com" target="_blank" rel="noopener noreferrer" className="text-white/40 underline hover:text-white/60">
                      Privacy & Cookie Policy
                    </a>.
                  </p>
                </motion.form>
              }
            </motion.div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>);

};

export default ContactPage;