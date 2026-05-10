import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, Globe, Flag, Shield, BookOpen, Newspaper, History, Briefcase, HeartHandshake } from "lucide-react";
import { useNavigate } from "react-router-dom";

const links = [
  { icon: Globe, label: "About Megsy", desc: "Learn about the platform", path: "https://about.megsyai.com", external: true },
  { icon: Flag, label: "About Egypt", desc: "Our roots and vision", path: "/egypt" },
  { icon: BookOpen, label: "Models", desc: "AI models we support", path: "/models" },
  { icon: Shield, label: "Security", desc: "How we protect your data", path: "/security" },
  { icon: Newspaper, label: "Blog", desc: "Latest news and updates", path: "/blog" },
  { icon: History, label: "Changelog", desc: "What's new", path: "/changelog" },
  { icon: Briefcase, label: "Careers", desc: "Join our team", path: "/careers" },
  { icon: HeartHandshake, label: "Support", desc: "Get help", path: "/support" },
];

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/settings")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground">About</h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
          {links.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => item.external ? window.open(item.path, "_blank") : navigate(item.path)}
                className="w-full flex items-center gap-3 py-3.5 px-2 rounded-xl text-left hover:bg-muted/30 transition-colors"
              >
                <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
              </motion.button>
            );
          })}
        </motion.div>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-8">Megsy AI v1.0 - 2026</p>
      </div>
    </div>
  );
};

export default AboutPage;
