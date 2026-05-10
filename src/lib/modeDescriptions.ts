// Multi-language short descriptions shown under the hero title in
// Learning, Shopping, and Deep Research empty states.
type Mode = "learning" | "shopping" | "research";

const map: Record<Mode, Record<string, string>> = {
  learning: {
    en: "Ask anything. Learn faster.",
    ar: "اسأل أي شيء. تعلّم أسرع.",
    fr: "Demandez tout. Apprenez plus vite.",
    es: "Pregunta cualquier cosa. Aprende más rápido.",
  },
  shopping: {
    en: "Find the best deal in your currency.",
    ar: "اعثر على أفضل صفقة بعملتك.",
    fr: "Trouvez la meilleure offre dans votre devise.",
    es: "Encuentra la mejor oferta en tu moneda.",
  },
  research: {
    en: "Deep answers from across the web.",
    ar: "إجابات عميقة من جميع أنحاء الويب.",
    fr: "Réponses approfondies depuis tout le web.",
    es: "Respuestas profundas desde toda la web.",
  },
};

export const getModeDescription = (mode: Mode): string => {
  return map[mode].en;
};
