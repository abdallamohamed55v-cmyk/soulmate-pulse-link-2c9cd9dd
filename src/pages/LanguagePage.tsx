import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { DesktopSettingsLayout } from "@/components/DesktopSettingsLayout";

const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "zh", name: "Chinese", native: "中文" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "hu", name: "Hungarian", native: "Magyar" },
  { code: "da", name: "Danish", native: "Dansk" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "he", name: "Hebrew", native: "עברית" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
];

const LanguagePage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [currentLang, setCurrentLang] = useState(localStorage.getItem("language") || "en");

  const handleSelect = (code: string) => {
    localStorage.setItem("language", code);
    setCurrentLang(code);
    window.dispatchEvent(new Event("languagechange-custom"));
  };

  const LanguageContent = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="max-w-lg"
    >
      <div className="rounded-xl bg-secondary/30 divide-y divide-border overflow-hidden">
        {LANGUAGES.map((lang) => {
          const isActive = currentLang === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className="notranslate w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors duration-150 hover:bg-muted/50"
            >
              <span className="text-sm font-medium text-foreground">{lang.name}</span>
              {isActive && <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
    </motion.div>
  );

  if (!isMobile) {
    return (
      <DesktopSettingsLayout title="Language" subtitle="Choose your preferred language">
        <LanguageContent />
      </DesktopSettingsLayout>
    );
  }

  return (
    <div className="h-[100dvh] bg-background overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/settings")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground">Language</h1>
        </div>
        <div className="px-4 pb-8">
          <LanguageContent />
        </div>
      </div>
    </div>
  );
};

export default LanguagePage;
