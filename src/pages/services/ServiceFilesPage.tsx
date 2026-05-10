import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import FancyButton from "@/components/FancyButton";

const stats = [
  { value: "20+", label: "File Formats" },
  { value: "500MB", label: "Max File Size" },
  { value: "100+", label: "Pages Per Doc" },
  { value: "30+", label: "Languages" },
];

const supportedFormats = [
  { ext: "PDF", desc: "Academic papers, reports, contracts" },
  { ext: "DOCX", desc: "Word documents, proposals" },
  { ext: "XLSX", desc: "Spreadsheets, financial data" },
  { ext: "PPTX", desc: "Presentations, slide decks" },
  { ext: "CSV", desc: "Data files, databases" },
  { ext: "TXT", desc: "Plain text, code files" },
  { ext: "JPG", desc: "Images with text (OCR)" },
  { ext: "PNG", desc: "Screenshots, diagrams" },
];

const useCases = [
  { title: "Research Analysis", desc: "Upload academic papers and get instant summaries, key findings, methodology breakdowns, and citation extraction. Perfect for literature reviews.", bg: "bg-primary", textColor: "text-primary-foreground" },
  { title: "Contract Review", desc: "Analyze legal documents for key clauses, obligations, deadlines, and potential risks. Get plain-language explanations of complex legal terms.", bg: "bg-yellow-400", textColor: "text-black" },
  { title: "Financial Reports", desc: "Extract data from financial statements, identify trends, and get AI-powered insights on revenue, expenses, and projections.", bg: "bg-rose-500", textColor: "text-white" },
  { title: "Data Extraction", desc: "Pull tables, charts, and structured data from any document. Export to CSV or use directly in your workflow.", bg: "bg-purple-500", textColor: "text-white" },
];

const features = [
  { title: "Smart Document Analysis", desc: "Megsy Pro reads and understands your documents at a deep level — not just keywords, but context, relationships, and nuances across hundreds of pages." },
  { title: "Question & Answer", desc: "Ask specific questions about your uploaded documents and get precise answers with exact page references and citations." },
  { title: "Multi-Document Comparison", desc: "Upload multiple documents and ask the AI to compare, contrast, and find differences or similarities between them." },
  { title: "Automatic Summarization", desc: "Get concise executive summaries of lengthy documents in seconds. Choose summary length from brief to comprehensive." },
  { title: "Data Table Extraction", desc: "Automatically detect and extract tables from PDFs and images. Download as structured CSV or use in conversation." },
  { title: "Multi-Language Support", desc: "Analyze documents in 30+ languages and get responses in your preferred language. Perfect for international teams." },
];

const howItWorks = [
  { number: "1", title: "Upload Your File", desc: "Drag and drop or select any supported document format.", bg: "bg-primary", textColor: "text-primary-foreground" },
  { number: "2", title: "AI Processes", desc: "Megsy Pro reads, OCRs, and understands your document.", bg: "bg-yellow-400", textColor: "text-black" },
  { number: "3", title: "Ask Questions", desc: "Chat naturally about your document's content.", bg: "bg-rose-500", textColor: "text-white" },
  { number: "4", title: "Export Results", desc: "Download summaries, extracted data, or share insights.", bg: "bg-purple-500", textColor: "text-white" },
];

const faqs = [
  { q: "What file types are supported?", a: "We support PDF, DOCX, XLSX, PPTX, CSV, TXT, and image files (JPG, PNG) with OCR text extraction. More formats are being added regularly." },
  { q: "What's the maximum file size?", a: "You can upload files up to 500MB. Documents up to 100+ pages are fully analyzed. For very large documents, processing may take a few seconds longer." },
  { q: "Is my data secure?", a: "Absolutely. All uploads are encrypted, processed in isolated environments, and can be deleted at any time. We never share or train on your documents." },
  { q: "Can I analyze multiple files at once?", a: "Yes! Upload multiple documents and ask Megsy to compare, cross-reference, or find information across all of them simultaneously." },
  { q: "Does it support scanned documents?", a: "Yes. Our OCR engine extracts text from scanned PDFs and images with high accuracy, supporting multiple languages and complex layouts." },
];

const ServiceFilesPage = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div data-theme="dark" className="min-h-screen bg-background text-foreground">
      <LandingNavbar />

      {/* ── HERO ── */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 pt-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-orange-500/8 blur-[100px]" />
        </div>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="relative z-10 mx-auto max-w-4xl text-center">
          <h1 className="font-display text-5xl font-black uppercase leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
            <span className="block">Analyze Files</span>
            <span className="block text-primary">With AI</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Upload any document and let Megsy Pro analyze, summarize, and extract insights. From research papers to financial reports — understand everything faster.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <FancyButton onClick={() => navigate("/auth")} className="px-10 py-4 text-base sm:text-lg">
              Try File Analysis Free
            </FancyButton>
          </div>
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── STATS ── */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="text-center">
              <p className="font-display text-4xl font-black text-primary md:text-5xl">{s.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── SUPPORTED FORMATS ── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl lg:text-6xl">
            SUPPORTS <span className="text-primary">EVERY FORMAT</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {supportedFormats.map((f, i) => (
            <motion.div key={f.ext} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-center hover:border-primary/20 hover:bg-primary/[0.03] transition-colors">
              <p className="font-display text-2xl font-black text-primary">{f.ext}</p>
              <p className="mt-2 text-xs text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── USE CASES (Bento) ── */}
      <section className="mx-auto max-w-7xl px-6 py-28">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl lg:text-6xl">
            POWERFUL <span className="text-primary">USE CASES</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4">
          {useCases.map((uc, i) => (
            <motion.div key={uc.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className={`${uc.bg} rounded-2xl p-8 flex flex-col justify-between min-h-[240px]`}>
              <span className={`text-5xl font-black ${uc.textColor} opacity-40`}>0{i + 1}</span>
              <div>
                <h3 className={`text-2xl font-bold ${uc.textColor}`}>{uc.title}</h3>
                <p className={`mt-3 text-sm ${uc.textColor} opacity-80`}>{uc.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl lg:text-6xl">
            EVERYTHING YOU <span className="text-primary">NEED</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 hover:border-primary/20 hover:bg-primary/[0.03] transition-colors">
              <h3 className="text-lg font-bold text-foreground">{f.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl lg:text-6xl">HOW IT <span className="text-primary">WORKS</span></h2>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {howItWorks.map((step, i) => (
            <motion.div key={step.number} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className={`${step.bg} rounded-2xl p-6 flex flex-col justify-between min-h-[200px]`}>
              <span className={`text-5xl font-black ${step.textColor} opacity-60`}>{step.number}</span>
              <div>
                <h3 className={`text-lg font-bold ${step.textColor}`}>{step.title}</h3>
                <p className={`text-sm ${step.textColor} opacity-80 mt-1`}>{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl">FAQ</h2>
        </motion.div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                <span className="font-semibold text-foreground pr-4">{faq.q}</span>
                <span className={`text-muted-foreground transition-transform ${openFaq === i ? "rotate-45" : ""}`}>+</span>
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-5xl px-6 py-28 text-center">
        <h2 className="font-display text-4xl font-black uppercase md:text-6xl">Ready to Analyze?</h2>
        <p className="mt-6 text-lg text-muted-foreground">Upload your first document and see Megsy Pro in action.</p>
        <FancyButton onClick={() => navigate("/auth")} className="mt-10 text-lg px-12 py-4">Get Started Free</FancyButton>
      </section>

      <LandingFooter />
    </div>
  );
};

export default ServiceFilesPage;
