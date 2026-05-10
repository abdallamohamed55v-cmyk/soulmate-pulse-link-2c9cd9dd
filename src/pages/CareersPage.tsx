import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import FancyButton from "@/components/FancyButton";
import SEOHead from "@/components/SEOHead";
import { Rocket, Heart, Globe, Zap, Code, Palette, Shield, Users, Send } from "lucide-react";

const values = [
  { icon: Rocket, title: "Move Fast", desc: "We ship weekly. Speed and quality aren't mutually exclusive." },
  { icon: Heart, title: "User Obsession", desc: "Every decision starts with 'How does this help creators?'" },
  { icon: Globe, title: "Global First", desc: "We build for the world. 30+ languages, diverse perspectives." },
  { icon: Zap, title: "AI Native", desc: "We don't just use AI — we live and breathe it every day." },
];

const benefits = [
  "Competitive salary & equity",
  "Remote-first culture",
  "Unlimited PTO",
  "Learning & development budget",
  "Latest hardware & tools",
  "Health & wellness benefits",
  "Team retreats",
  "Early access to cutting-edge AI",
];

const openRoles = [
  { title: "Senior ML Engineer", team: "AI Research", location: "Remote", type: "Full-time" },
  { title: "Full-Stack Developer", team: "Platform", location: "Remote / Cairo", type: "Full-time" },
  { title: "Product Designer", team: "Design", location: "Remote", type: "Full-time" },
  { title: "DevOps Engineer", team: "Infrastructure", location: "Remote", type: "Full-time" },
  { title: "Growth Marketing Lead", team: "Marketing", location: "Remote", type: "Full-time" },
  { title: "Community Manager", team: "Community", location: "Remote", type: "Part-time" },
];

const teamIcons: Record<string, typeof Code> = { "AI Research": Code, Platform: Code, Design: Palette, Infrastructure: Shield, Marketing: Rocket, Community: Users };

const applicationSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().min(6, "Phone number is required").max(20),
  position: z.string().trim().min(1, "Select a position"),
  experience: z.string().trim().min(1, "Select experience level"),
  skills: z.string().trim().min(5, "List your key skills").max(500),
  linkedin: z.string().trim().url("Enter a valid URL").max(300).or(z.string().max(0)),
  coverLetter: z.string().trim().min(20, "Cover letter must be at least 20 characters").max(3000),
});
type ApplicationData = z.infer<typeof applicationSchema>;

const experienceLevels = ["0-1 years", "1-3 years", "3-5 years", "5-10 years", "10+ years"];

const CareersPage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ApplicationData>({ resolver: zodResolver(applicationSchema), defaultValues: { linkedin: "" } });

  const onSubmit = async (data: ApplicationData) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("contact_submissions").insert({
        name: data.fullName,
        email: data.email,
        message: `Position: ${data.position}\nExperience: ${data.experience}\nPhone: ${data.phone}\nSkills: ${data.skills}\nLinkedIn: ${data.linkedin || "N/A"}\n\nCover Letter:\n${data.coverLetter}`,
        subject: `Career Application: ${data.position}`,
        form_type: "career",
      });
      if (error) throw error;
      toast.success("Application submitted successfully! We'll be in touch.");
      form.reset();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-transparent px-5 py-4 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30 selectable";

  return (
    <div data-theme="dark" className="min-h-screen bg-background text-foreground">
      <SEOHead title="Careers" description="Join the Megsy AI team. We're building the future of AI-powered creativity. Explore open roles and apply directly." path="/careers" />
      <LandingNavbar />

      {/* Hero */}
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-6 pt-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full bg-primary/6 blur-[150px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-rose-500/5 blur-[120px]" />
        </div>
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative z-10 mx-auto max-w-4xl text-center">
          <h1 className="font-display text-5xl font-black uppercase leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
            <span className="block">Build The</span>
            <span className="block text-primary">Future of AI</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            We're a small, ambitious team building the world's most powerful AI creative platform. Join us and shape how millions create.
          </p>
          <div className="mt-10">
            <FancyButton onClick={() => document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" })} className="text-base">
              Apply Now
            </FancyButton>
          </div>
        </motion.div>
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Values */}
      <section className="mx-auto max-w-7xl px-6 py-28">
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 text-center font-display text-4xl font-black uppercase md:text-5xl">
          Our <span className="text-primary">Values</span>
        </motion.h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <motion.div key={v.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="rounded-2xl border border-white/[0.06] bg-card p-8">
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3"><v.icon className="h-6 w-6 text-primary" /></div>
              <h3 className="mb-2 text-lg font-bold text-foreground">{v.title}</h3>
              <p className="text-sm text-muted-foreground">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t border-white/[0.06] py-28">
        <div className="mx-auto max-w-5xl px-6">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 text-center font-display text-4xl font-black uppercase md:text-5xl">
            Perks & <span className="text-primary">Benefits</span>
          </motion.h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b, i) => (
              <motion.div key={b} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-card px-5 py-4">
                <Zap className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm font-medium text-foreground">{b}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Roles */}
      <section id="roles" className="border-t border-white/[0.06] py-28">
        <div className="mx-auto max-w-4xl px-6">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 text-center font-display text-4xl font-black uppercase md:text-5xl">
            Open <span className="text-primary">Roles</span>
          </motion.h2>
          <div className="space-y-4">
            {openRoles.map((role, i) => {
              const Icon = teamIcons[role.team] || Code;
              return (
                <motion.button
                  key={role.title}
                  onClick={() => { form.setValue("position", role.title); document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" }); }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="group w-full flex items-center justify-between rounded-2xl border border-white/[0.06] bg-card p-6 transition-all hover:border-primary/30 hover:bg-card/80 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-primary/10 p-2.5"><Icon className="h-5 w-5 text-primary" /></div>
                    <div>
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{role.title}</h3>
                      <p className="text-sm text-muted-foreground">{role.team}</p>
                    </div>
                  </div>
                  <div className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
                    <span>{role.location}</span>
                    <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs">{role.type}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="border-t border-white/[0.06] py-28">
        <div className="mx-auto max-w-3xl px-6">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-4 text-center font-display text-4xl font-black uppercase md:text-5xl">
            Apply <span className="text-primary">Now</span>
          </motion.h2>
          <p className="text-center text-muted-foreground mb-12">Fill out the form below and we'll get back to you within 5 business days.</p>

          <motion.form
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 rounded-2xl border border-white/[0.06] bg-card p-8"
          >
            {/* Name & Email */}
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Full Name *</label>
                <input {...form.register("fullName")} placeholder="John Doe" className={inputClass} />
                {form.formState.errors.fullName && <p className="mt-1.5 text-xs text-red-400">{form.formState.errors.fullName.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Email *</label>
                <input {...form.register("email")} placeholder="john@example.com" className={inputClass} />
                {form.formState.errors.email && <p className="mt-1.5 text-xs text-red-400">{form.formState.errors.email.message}</p>}
              </div>
            </div>

            {/* Phone & Position */}
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Phone *</label>
                <input {...form.register("phone")} placeholder="+20 xxx xxx xxxx" className={inputClass} />
                {form.formState.errors.phone && <p className="mt-1.5 text-xs text-red-400">{form.formState.errors.phone.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Position *</label>
                <select {...form.register("position")} className={`${inputClass} appearance-none`} defaultValue="">
                  <option value="" disabled className="bg-black text-white/30">Select a role</option>
                  {openRoles.map(r => <option key={r.title} value={r.title} className="bg-black text-white">{r.title}</option>)}
                  <option value="General Application" className="bg-black text-white">General Application</option>
                </select>
                {form.formState.errors.position && <p className="mt-1.5 text-xs text-red-400">{form.formState.errors.position.message}</p>}
              </div>
            </div>

            {/* Experience & LinkedIn */}
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Experience *</label>
                <select {...form.register("experience")} className={`${inputClass} appearance-none`} defaultValue="">
                  <option value="" disabled className="bg-black text-white/30">Select experience</option>
                  {experienceLevels.map(e => <option key={e} value={e} className="bg-black text-white">{e}</option>)}
                </select>
                {form.formState.errors.experience && <p className="mt-1.5 text-xs text-red-400">{form.formState.errors.experience.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">LinkedIn / Portfolio URL</label>
                <input {...form.register("linkedin")} placeholder="https://linkedin.com/in/..." className={inputClass} />
                {form.formState.errors.linkedin && <p className="mt-1.5 text-xs text-red-400">{form.formState.errors.linkedin.message}</p>}
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Key Skills *</label>
              <input {...form.register("skills")} placeholder="React, TypeScript, Python, Machine Learning, etc." className={inputClass} />
              {form.formState.errors.skills && <p className="mt-1.5 text-xs text-red-400">{form.formState.errors.skills.message}</p>}
            </div>

            {/* Cover Letter */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Cover Letter *</label>
              <textarea {...form.register("coverLetter")} placeholder="Tell us why you'd be a great fit for this role and what excites you about Megsy AI..." rows={6} className={`${inputClass} resize-none`} />
              {form.formState.errors.coverLetter && <p className="mt-1.5 text-xs text-red-400">{form.formState.errors.coverLetter.message}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-8 py-4 text-sm font-bold transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Submitting..." : "Submit Application"}
            </button>

            <p className="text-xs text-center text-muted-foreground/50">
              Your data will be processed in accordance with our{" "}
              <a href="https://privacy.megsyai.com" target="_blank" rel="noopener noreferrer" className="text-primary/60 hover:underline">Privacy Policy</a>.
              We'll only use your information for recruitment purposes.
            </p>
          </motion.form>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

export default CareersPage;
