import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: string;
  noindex?: boolean;
}

const SITE_URL = "https://megsyai.com";
const DEFAULT_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fae3cd77-3f99-4a10-8225-ba5e64510390/id-preview-b1f21eef--70a3240c-12ec-46ff-99ea-54f772181a95.lovable.app-1772787005803.png";

const SEOHead = ({ title, description, path, image, type = "website", noindex = false }: SEOHeadProps) => {
  const fullTitle = path === "/" ? "Megsy — All-in-One AI Creative Platform" : `${title} | Megsy AI`;
  const canonical = `${SITE_URL}${path}`;
  const ogImage = image || DEFAULT_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Megsy AI" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@MegsyAI" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

export default SEOHead;
