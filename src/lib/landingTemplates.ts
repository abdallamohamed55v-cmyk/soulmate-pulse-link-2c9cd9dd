/** Landing-page templates for the slide generator.
 *
 * Two categories:
 *   - "premium"  → in-house, hand-curated templates we maintain ourselves.
 *   - "standard" → templates originally sourced from an external library.
 */
export type LandingCategory = "premium" | "standard";

export interface LandingTemplate {
  id: string;
  name: string;
  description: string;
  folder: string;
  category: LandingCategory;
  /** path under /public — fetched by the browser before sending to the edge fn */
  path: string;
  /** real screenshot under /public/template-thumbs/ */
  preview: string;
}

const t = (
  id: string,
  name: string,
  description: string,
  folder: string,
  category: LandingCategory,
): LandingTemplate => ({
  id,
  name,
  description,
  folder,
  category,
  path: `/templates/${folder}/index.html`,
  preview: `/template-thumbs/${folder}.jpg`,
});

export const LANDING_TEMPLATES: LandingTemplate[] = [
  // ─── Premium (in-house) ───
  t("megsy-3d-portfolio", "Megsy 3D Atelier", "Cinematic 3D portfolio with neon UI", "remix-interactive-3d-portfolio", "premium"),
  t("megsy-graphic", "Megsy Color Lab", "Bold animated graphic-designer hero", "remix-animated-graphic-designer", "premium"),
  t("megsy-spider", "Megsy Comic Hero", "Comic-book cinematic landing page", "remix-cool-spiderman-website", "premium"),

  // ─── Standard (external) ───
  t("vanta-atelier", "Vanta Atelier", "Dark editorial digital studio", "remix-vanta-digital-atelier", "standard"),
  t("ai-builder", "AI Builder", "Modern SaaS landing for AI products", "remix-ai-website-builder-unlim", "standard"),
  t("game-launch", "Game Launch", "High-energy gaming launch page", "remix-game-landing-page-design", "standard"),
  t("neon-portfolio", "Neon Portfolio", "Neon designer portfolio", "remix-neon-portfolio-for-ui-de", "standard"),
  t("veloured", "Veloured", "Premium minimal modern landing", "remix-veloured-modern-landing-", "standard"),
  t("velammal", "Velammal", "Editorial corporate / institutional", "remix-velammal-engineering-col", "standard"),
  t("yash-verma", "Yash Verma", "Interactive personal brand", "remix-yash-verma-interactive-g", "standard"),
  t("forma", "Forma", "Ergonomic premium product page", "remix-forma-ergonomic-sofa", "standard"),
  t("abstract-vector", "Abstract Vector", "Abstract vector neon design", "remix-remix-abstract-vector-ne", "standard"),
  t("portfolio-3d", "3D Portfolio", "Interactive 3D portfolio website", "remix-3d-portfolio-website-bui", "standard"),
  t("documentary", "Documentary", "Documentary research storytelling", "remix-documentary-research-and", "standard"),
  t("fashion-ice", "Fashion Ice", "Editorial fashion with ice cubes", "remix-fashion-ice-cubes", "standard"),
  t("digital-marketplace", "Digital Marketplace", "Interactive 3D digital marketplace", "remix-interactive-3d-digital-m", "standard"),
  t("blob-landing", "Blob Landing", "Soft 3D blob landing page", "remix-landing-page-blobs", "standard"),
  t("landscape", "Landscape", "Architectural landscape design", "remix-landscape-design", "standard"),
  t("modern-ai", "Modern AI", "Modern visible AI website", "remix-modern-ai-visible-websit", "standard"),
  t("noodles", "Noodles Splash", "Playful noodles splash page", "remix-noodles-splash-page", "standard"),
  t("science-lab", "Science Lab", "Interactive science lab website", "remix-science-lab-website-with", "standard"),
];

export const DEFAULT_LANDING_TEMPLATE = LANDING_TEMPLATES[0].id;

export function findLandingTemplate(id?: string | null): LandingTemplate {
  return LANDING_TEMPLATES.find(x => x.id === id) || LANDING_TEMPLATES[0];
}
