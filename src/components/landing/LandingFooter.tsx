import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const footerLinks = {
  Create: [
    { label: "AI Chat", href: "/services/chat" },
    { label: "Image Generation", href: "/services/images" },
    { label: "Video Generation", href: "/services/videos" },
    { label: "Code Builder", href: "/services/code" },
    { label: "File Analysis", href: "/services/files" },
  ],
  Product: [
    { label: "Models", href: "/models" },
    { label: "Pricing", href: "/pricing" },
    { label: "Changelog", href: "/changelog" },
    { label: "Blog", href: "/blog" },
  ],
  Company: [
    { label: "Careers", href: "/careers" },
    { label: "Security", href: "/security" },
    { label: "Support", href: "/support" },
    { label: "Contact", href: "/contact" },
    { label: "Egypt 🇪🇬", href: "/egypt" },
  ],
  Legal: [
    { label: "Terms of Service", href: "https://terms.megsyai.com", external: true },
    { label: "Privacy Policy", href: "https://privacy.megsyai.com", external: true },
    { label: "Cookie Policy", href: "/cookies" },
  ],
};

const socialLinks = [
  {
    label: "X",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
];

const LandingFooter = () => {
  const navigate = useNavigate();

  return (
    <footer className="border-t border-white/[0.06] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-10 md:py-16">
        {/* Top: Social icons row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex items-center gap-5 md:mb-14 md:gap-6"
        >
          {socialLinks.map((s) => (
            <a
              key={s.label}
              href={s.href}
              aria-label={s.label}
              className="text-white/40 transition-colors hover:text-white"
            >
              {s.icon}
            </a>
          ))}
        </motion.div>

        {/* Main grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="grid grid-cols-2 gap-10 md:grid-cols-6"
        >
          {/* Brand column */}
          <div className="col-span-2">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="text-lg font-bold text-white">Megsy</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-white/25">
              The all-in-one AI creative platform. Chat, generate images & videos, build code, and deploy — all powered by 80+ AI models in one unified interface.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links], colIdx) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 + colIdx * 0.08 }}
            >
              <h4 className="mb-5 text-sm font-bold text-white">{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-white/30 transition-colors hover:text-white/60"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <a
                        href={link.href}
                        onClick={(e) => {
                          if (link.href.startsWith("/")) {
                            e.preventDefault();
                            navigate(link.href);
                          }
                        }}
                        className="text-sm text-white/30 transition-colors hover:text-white/60"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        {/* Giant brand name */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-16 overflow-hidden"
        >
          <h2 className="font-display text-[18vw] font-black uppercase leading-[0.85] tracking-tighter text-purple-500/20 md:text-[12vw]">
            MEGSY
          </h2>
        </motion.div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-6 md:flex-row"
        >
          <div className="flex flex-wrap items-center gap-4 text-xs text-white/20">
            <a href="https://terms.megsyai.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/40 transition-colors">Terms of Service</a>
            <span>|</span>
            <a href="https://privacy.megsyai.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/40 transition-colors">Privacy Policy</a>
            <span>|</span>
            <a href="/cookies" onClick={(e) => { e.preventDefault(); navigate("/cookies"); }} className="hover:text-white/40 transition-colors">Cookie Policy</a>
          </div>
          <p className="text-xs text-white/20">© 2026 Megsy AI. All Rights Reserved.</p>
        </motion.div>
      </div>
    </footer>
  );
};

export default LandingFooter;
