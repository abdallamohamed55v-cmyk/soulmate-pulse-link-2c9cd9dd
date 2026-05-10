import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import FancyButton from "@/components/FancyButton";

const heroVideos = [
  { src: "/hero/video-1.mp4", rotate: -6, y: 40 },
  { src: "/hero/video-2.mp4", rotate: -3, y: 15 },
  { src: "/hero/video-4.mp4", rotate: 0, y: 0, center: true },
  { src: "/hero/video-3.mp4", rotate: 3, y: 15 },
  { src: "/hero/bear.mp4", rotate: 6, y: 40 },
];

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative flex min-h-[85vh] flex-col items-center overflow-hidden bg-background pt-20 pb-0 md:min-h-screen md:pt-24">
      <div className="relative z-30 mx-auto w-full px-4 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="font-display text-[8vw] uppercase leading-[1] tracking-tight text-foreground md:text-[5.5vw]"
        >
          YOUR WEBSITE. YOUR VIDEO.{" "}
          <span className="text-primary">READY NOW.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground md:mt-6 md:text-lg"
        >
          Tell Megsy what you need — a website, a video, stunning images, or production-ready code.
          Get it in seconds, not days. One prompt. Done.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row md:mt-8 md:gap-4"
        >
          <FancyButton onClick={() => navigate("/auth")} className="px-8 py-3 text-sm md:px-10 md:py-4 md:text-base">
            Start Creating — It's Free
          </FancyButton>
          <FancyButton onClick={() => window.open("https://api.megsyai.com", "_blank")} className="px-8 py-3 text-sm md:px-10 md:py-4 md:text-base">
            API Platform
          </FancyButton>
        </motion.div>
      </div>

      <div className="relative z-0 mt-8 flex w-full max-w-[1500px] items-end justify-center gap-2 px-4 pb-4 md:mt-10 md:gap-5">
        {heroVideos.map((vid, i) => {
          const isEdge = Math.abs(vid.rotate) > 3;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 100, rotate: vid.rotate }}
              animate={{ opacity: 1, y: vid.y, rotate: vid.rotate }}
              transition={{ duration: 0.7, delay: 0.45 + i * 0.1, ease: "easeOut" }}
              className={`relative overflow-hidden rounded-xl border border-border/30 shadow-2xl md:rounded-2xl ${
                isEdge ? "hidden md:block" : ""
              } ${
                vid.center
                  ? "w-[34%] md:w-[20%] z-[3]"
                  : Math.abs(vid.rotate) <= 3
                  ? "w-[30%] md:w-[18%] z-[2]"
                  : "w-[15%] z-[1]"
              }`}
              style={{ aspectRatio: "3/4" }}
            >
              <video src={vid.src} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" />
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default HeroSection;
