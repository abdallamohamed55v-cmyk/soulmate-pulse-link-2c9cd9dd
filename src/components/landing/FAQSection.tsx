import { motion } from "framer-motion";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What is Megsy?",
    a: "Megsy is an all-in-one AI creative platform that brings together 80+ AI models for chat, image generation, video creation, code building, and professional image tools — all in a single unified interface.",
  },
  {
    q: "How does the MC credit system work?",
    a: "MC (Megsy Credits) is the platform's currency. Each AI operation costs a specific amount of MC — chat is free, while image and video generation costs vary by model. Code builds cost 5 MC. You can get MC by subscribing to one of our plans (Starter, Pro, or Elite).",
  },
  {
    q: "What plans are available?",
    a: "We offer three plans: Starter ($25/mo or $199/yr — 250 MC), Pro ($49/mo or $499/yr — 500 MC, API access, social publishing), and Elite ($149/mo or $1,299/yr — 1,500 MC, unlimited features, webhooks, dedicated support). All plans include image & video generation, code generation, and GitHub sync.",
  },
  {
    q: "Can I use Megsy for commercial projects?",
    a: "Yes. All content generated on Megsy is yours to use commercially across all paid plans.",
  },
  {
    q: "What image and video formats are supported?",
    a: "Images can be generated and exported in PNG, JPEG, and WebP formats. Videos support MP4 and WebM formats with varying lengths depending on the model used.",
  },
  {
    q: "How do referrals work?",
    a: "Share your unique referral link (megsyai.com/ref/YOUR_CODE) with friends. You earn a 20% lifetime commission on every referred user's spending. Earnings can be withdrawn via PayPal or Bank Transfer with a minimum payout of $20.",
  },
  {
    q: "Is there an API available?",
    a: "API access is available for paid plan subscribers. You can integrate image generation, video creation, chat, and other tools programmatically into your own applications.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="relative overflow-hidden py-16 md:py-40">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="mb-16 text-center"
        >
          <h2 className="font-display text-[10vw] font-black uppercase leading-[0.85] tracking-tighter text-white md:text-[8vw]">
            FA<span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">Qs</span>
          </h2>
          <p className="mt-4 text-xl text-white/40">Everything you need to know about Megsy.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-2xl border border-white/10 bg-white/[0.02] px-7 transition-colors hover:bg-white/[0.04] data-[state=open]:border-purple-500/30"
              >
                <AccordionTrigger className="py-4 text-left text-base font-bold text-white hover:no-underline md:py-6 md:text-lg">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-base leading-relaxed text-white/50">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
