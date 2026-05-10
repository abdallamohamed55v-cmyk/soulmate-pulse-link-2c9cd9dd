import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

const galleryItems = [
  { src: "/showcase/model-1.jpg", label: "MEGSY V1", model: "megsy", desc: "Hyper-realistic portraits with cinematic depth" },
  { src: "/showcase/model-6.jpg", label: "NANO BANANA 2", model: "nano", desc: "Classical painting style with atmospheric lighting" },
  { src: "/showcase/model-2.jpg", label: "FLUX KONTEXT MAX", model: "flux", desc: "The world's leading AI image editing & generation model" },
  { src: "/showcase/model-3.jpg", label: "RECRAFT V4", model: "recraft", desc: "Precise vector art & design-ready illustrations", mobileOnly: true },
];

const HorizontalGallery = () => {
  const isMobile = useIsMobile();
  const items = isMobile ? galleryItems : galleryItems.filter(item => !item.mobileOnly);

  return (
    <section className="bg-background py-14 md:py-28">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-8 md:mb-12"
        >
          <h2 className="font-display text-3xl font-black uppercase tracking-tight text-foreground md:text-6xl">
            IMAGE <span className="text-primary">MODELS</span>
          </h2>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground md:text-base">
            Explore what each model can create — from hyper-real portraits to epic fantasy worlds.
          </p>
        </motion.div>

        {/* Grid layout */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative overflow-hidden rounded-2xl border border-border/30 aspect-[3/4]"
            >
              <img
                src={item.src}
                alt={item.label}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />

              {item.model === "megsy" && (
                <div className="absolute top-3 left-3 rounded-full bg-primary/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground backdrop-blur-sm md:text-xs">
                  Megsy Model
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                <h3 className="font-display text-sm font-black uppercase tracking-tight text-foreground md:text-lg">
                  {item.label}
                </h3>
                <p className="mt-1 hidden text-sm text-muted-foreground/70 md:block">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HorizontalGallery;
