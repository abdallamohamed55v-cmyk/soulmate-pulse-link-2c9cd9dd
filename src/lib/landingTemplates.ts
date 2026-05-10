/** Landing-page templates for the slide generator.
 *
 * Each template is a self-contained HTML file (no missing module imports).
 * Thumbnails are real screenshots captured from the rendered page.
 *
 * The AI takes the raw HTML, then rewrites the content (text, sections,
 * image slots, sizing) to fit the user brief without breaking the design.
 */
export interface LandingTemplate {
  id: string;
  name: string;
  description: string;
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
): LandingTemplate => ({
  id,
  name,
  description,
  path: `/templates/${folder}/index.html`,
  preview: `/template-thumbs/${folder}.jpg`,
});

export const LANDING_TEMPLATES: LandingTemplate[] = [
  t("vanta-atelier", "Vanta Atelier", "Dark editorial digital studio", "remix-vanta-digital-atelier"),
  t("ai-builder", "AI Builder", "Modern SaaS landing for AI products", "remix-ai-website-builder-unlim"),
  t("game-launch", "Game Launch", "High-energy gaming launch page", "remix-game-landing-page-design"),
  t("neon-portfolio", "Neon Portfolio", "Neon designer portfolio", "remix-neon-portfolio-for-ui-de"),
  t("veloured", "Veloured", "Premium minimal modern landing", "remix-veloured-modern-landing-"),
  t("velammal", "Velammal", "Editorial corporate / institutional", "remix-velammal-engineering-col"),
  t("yash-verma", "Yash Verma", "Interactive personal brand", "remix-yash-verma-interactive-g"),
  t("forma", "Forma", "Ergonomic premium product page", "remix-forma-ergonomic-sofa"),
  t("abstract-vector", "Abstract Vector", "Abstract vector neon design", "remix-remix-abstract-vector-ne"),
  // ─── New templates ───
  t("portfolio-3d", "3D Portfolio", "Interactive 3D portfolio website", "remix-3d-portfolio-website-bui"),
  t("documentary", "Documentary", "Documentary research storytelling", "remix-documentary-research-and"),
  t("fashion-ice", "Fashion Ice", "Editorial fashion with ice cubes", "remix-fashion-ice-cubes"),
  t("digital-marketplace", "Digital Marketplace", "Interactive 3D digital marketplace", "remix-interactive-3d-digital-m"),
  t("blob-landing", "Blob Landing", "Soft 3D blob landing page", "remix-landing-page-blobs"),
  t("landscape", "Landscape", "Architectural landscape design", "remix-landscape-design"),
  t("modern-ai", "Modern AI", "Modern visible AI website", "remix-modern-ai-visible-websit"),
  t("noodles", "Noodles Splash", "Playful noodles splash page", "remix-noodles-splash-page"),
  t("science-lab", "Science Lab", "Interactive science lab website", "remix-science-lab-website-with"),
];

export const DEFAULT_LANDING_TEMPLATE = LANDING_TEMPLATES[0].id;

export function findLandingTemplate(id?: string | null): LandingTemplate {
  return LANDING_TEMPLATES.find(x => x.id === id) || LANDING_TEMPLATES[0];
}
