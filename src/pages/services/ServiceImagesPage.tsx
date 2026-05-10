import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import FancyButton from "@/components/FancyButton";



// Scenarios for the demo - many models and unique images
const demoScenarios = [
  {
    userPrompt: "Create a majestic phoenix rising from flames with vibrant orange and gold colors",
    aiResponse: "Creating a stunning phoenix image with fiery colors and dynamic composition",
    image: "/api-showcase/showcase-1.png",
    model: "Flux Pro",
    size: "1024 x 1024"
  },
  {
    userPrompt: "Generate a futuristic cyberpunk cityscape at night with neon lights",
    aiResponse: "Generating a detailed cyberpunk city scene with atmospheric neon lighting",
    image: "/api-showcase/showcase-2.jpg",
    model: "SDXL Ultra",
    size: "1920 x 1080"
  },
  {
    userPrompt: "Design an elegant portrait of a woman in golden hour lighting",
    aiResponse: "Generating a beautiful portrait with warm cinematic golden hour aesthetics",
    image: "/api-showcase/showcase-3.jpg",
    model: "Midjourney v6",
    size: "1024 x 1536"
  },
  {
    userPrompt: "Create an abstract art piece with flowing geometric shapes and gradients",
    aiResponse: "Crafting an abstract composition with dynamic geometric elements",
    image: "/api-showcase/showcase-4.jpg",
    model: "DALL-E 3",
    size: "1024 x 1024"
  },
  {
    userPrompt: "A serene Japanese garden with cherry blossoms and a koi pond",
    aiResponse: "Creating a tranquil Japanese garden scene with delicate cherry blossoms",
    image: "/showcase/img-1.jpg",
    model: "Stable Diffusion 3",
    size: "1344 x 768"
  },
  {
    userPrompt: "Photorealistic portrait of a fashion model in studio lighting",
    aiResponse: "Generating a high-quality fashion portrait with professional studio lighting",
    image: "/showcase/model-1.jpg",
    model: "Leonardo AI",
    size: "1024 x 1536"
  },
  {
    userPrompt: "Futuristic space station orbiting a distant planet with nebula background",
    aiResponse: "Creating a detailed sci-fi space station with cosmic nebula backdrop",
    image: "/showcase/img-4.jpg",
    model: "Flux Dev",
    size: "1920 x 1080"
  },
  {
    userPrompt: "Minimalist black and white architectural photography",
    aiResponse: "Generating a clean minimalist architectural composition",
    image: "/showcase/model-2.jpg",
    model: "Ideogram 2.0",
    size: "1024 x 1024"
  },
  {
    userPrompt: "Fantasy dragon in a mystical forest with magical lighting",
    aiResponse: "Creating a majestic dragon scene with enchanted forest atmosphere",
    image: "/showcase/img-5.jpg",
    model: "Playground v2.5",
    size: "1024 x 1024"
  },
  {
    userPrompt: "Vintage car on a coastal road during sunset",
    aiResponse: "Generating a classic car scene with beautiful coastal sunset lighting",
    image: "/showcase/img-6.jpg",
    model: "Kandinsky 3",
    size: "1920 x 1080"
  },
  {
    userPrompt: "Portrait with dramatic rim lighting and dark background",
    aiResponse: "Creating a dramatic portrait with cinematic rim lighting effects",
    image: "/showcase/model-3.jpg",
    model: "Flux Pro Ultra",
    size: "1024 x 1536"
  },
  {
    userPrompt: "Underwater scene with colorful coral reef and tropical fish",
    aiResponse: "Generating a vibrant underwater coral reef ecosystem",
    image: "/showcase/img-3.jpg",
    model: "SDXL Turbo",
    size: "1344 x 768"
  },
];

const howItWorksSteps = [
  { 
    number: "1", 
    title: "Prompt or Upload", 
    desc: "Type a text prompt or start from an existing image.",
    bg: "bg-primary",
    textColor: "text-primary-foreground"
  },
  { 
    number: "2", 
    title: "Pick a Style", 
    desc: "Choose Auto for the best model match, or pick your own for full control.",
    bg: "bg-yellow-400",
    textColor: "text-black"
  },
  { 
    number: "3", 
    title: "Refine & Adjust", 
    desc: "Use advanced editing tools to polish your results perfectly.",
    bg: "bg-rose-500",
    textColor: "text-white"
  },
  { 
    number: "4", 
    title: "Export & Share", 
    desc: "Download in any format or share directly to your platforms.",
    bg: "bg-purple-500",
    textColor: "text-white"
  },
];

// LEFT side images
const leftImages = [
  { src: "/showcase/model-3.jpg", top: "20%", left: "3%", width: 200, height: 260, speedX: 15, speedY: 10, zIndex: 1 },
  { src: "/showcase/img-3.jpg", top: "38%", left: "6%", width: 260, height: 340, speedX: 25, speedY: 18, zIndex: 2 },
  { src: "/showcase/model-5.jpg", top: "60%", left: "12%", width: 220, height: 280, speedX: 35, speedY: 22, zIndex: 3 },
];

// RIGHT side images
const rightImages = [
  { src: "/showcase/img-6.jpg", top: "20%", right: "4%", width: 220, height: 290, speedX: 20, speedY: 12, zIndex: 1 },
  { src: "/showcase/model-4.jpg", top: "42%", right: "8%", width: 280, height: 200, speedX: 30, speedY: 20, zIndex: 2 },
  { src: "/showcase/model-6.jpg", top: "58%", right: "3%", width: 240, height: 320, speedX: 18, speedY: 25, zIndex: 3 },
];

type DemoPhase = 'idle' | 'typing-user' | 'typing-ai' | 'generating' | 'complete';

const ServiceImagesPage = () => {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);
  
  // Demo chat state
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [phase, setPhase] = useState<DemoPhase>('idle');
  const [typedUserText, setTypedUserText] = useState("");
  const [typedAiText, setTypedAiText] = useState("");
  const [showUserMessage, setShowUserMessage] = useState(false);
  const [showAiMessage, setShowAiMessage] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentScenario = demoScenarios[scenarioIndex];
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [typedUserText, typedAiText, phase, showImage, showUserMessage, showAiMessage]);

  // Type text character by character
  const typeText = useCallback((
    text: string, 
    setter: (val: string) => void, 
    onComplete: () => void,
    speed = 35
  ) => {
    let index = 0;
    const type = () => {
      if (index <= text.length) {
        setter(text.slice(0, index));
        index++;
        timeoutRef.current = setTimeout(type, speed + Math.random() * 25);
      } else {
        onComplete();
      }
    };
    type();
  }, []);

  // Start demo cycle
  const startDemo = useCallback(() => {
    // Reset state
    setTypedUserText("");
    setTypedAiText("");
    setShowUserMessage(false);
    setShowAiMessage(false);
    setShowImage(false);
    setPhase('typing-user');

    // Phase 1: Type user message in input
    typeText(currentScenario.userPrompt, setTypedUserText, () => {
      // Show user message bubble
      setShowUserMessage(true);
      
      timeoutRef.current = setTimeout(() => {
        // Phase 2: Type AI response
        setPhase('typing-ai');
        typeText(currentScenario.aiResponse, setTypedAiText, () => {
          setShowAiMessage(true);
          
          timeoutRef.current = setTimeout(() => {
            // Phase 3: Show loading
            setPhase('generating');
            
            timeoutRef.current = setTimeout(() => {
              // Phase 4: Show image
              setPhase('complete');
              setShowImage(true);
              
              // Wait and start next cycle
              timeoutRef.current = setTimeout(() => {
                setScenarioIndex(prev => (prev + 1) % demoScenarios.length);
              }, 4000);
            }, 2500);
          }, 800);
        }, 25);
      }, 600);
    }, 40);
  }, [currentScenario, typeText]);

  // Auto-start demo
  useEffect(() => {
    const timer = setTimeout(startDemo, 1000);
    return () => {
      clearTimeout(timer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [scenarioIndex]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
        const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
        setMousePosition({ x, y });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
        const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
        setMousePosition({ x, y });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div data-theme="dark" className="min-h-screen bg-background text-foreground">
      <LandingNavbar />

      {/* Hero */}
      <section 
        ref={heroRef}
        className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 pt-24"
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/8 blur-[100px]" />
        </div>

        {/* LEFT floating images */}
        {leftImages.map((img, i) => (
          <motion.div
            key={`left-${i}`}
            className="absolute overflow-hidden rounded-2xl pointer-events-none hidden lg:block shadow-2xl"
            style={{
              top: img.top,
              left: img.left,
              width: img.width,
              height: img.height,
              zIndex: img.zIndex,
            }}
            initial={{ opacity: 0, x: -60 }}
            animate={{ 
              opacity: 0.7, 
              x: mousePosition.x * img.speedX,
              y: mousePosition.y * img.speedY,
            }}
            transition={{ 
              opacity: { duration: 1.2, delay: i * 0.2 },
              x: { duration: 0.3 + i * 0.1, ease: "easeOut" },
              y: { duration: 0.3 + i * 0.1, ease: "easeOut" },
            }}
          >
            <img src={img.src} alt="" className="w-full h-full object-cover" />
          </motion.div>
        ))}

        {/* RIGHT floating images */}
        {rightImages.map((img, i) => (
          <motion.div
            key={`right-${i}`}
            className="absolute overflow-hidden rounded-2xl pointer-events-none hidden lg:block shadow-2xl"
            style={{
              top: img.top,
              right: img.right,
              width: img.width,
              height: img.height,
              zIndex: img.zIndex,
            }}
            initial={{ opacity: 0, x: 60 }}
            animate={{ 
              opacity: 0.7, 
              x: mousePosition.x * -img.speedX,
              y: mousePosition.y * img.speedY,
            }}
            transition={{ 
              opacity: { duration: 1.2, delay: i * 0.2 },
              x: { duration: 0.3 + i * 0.08, ease: "easeOut" },
              y: { duration: 0.3 + i * 0.08, ease: "easeOut" },
            }}
          >
            <img src={img.src} alt="" className="w-full h-full object-cover" />
          </motion.div>
        ))}

        {/* Center Content — no box, just clean text */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative z-10 mx-auto max-w-4xl text-center"
        >

          <h1 className="font-display text-5xl font-black uppercase leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
            <span className="block">Turn Words</span>
            <span className="block text-primary">Into Visuals</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Type a prompt. Get a stunning image. Remix it, upscale it, and export — all in one place.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <FancyButton onClick={() => navigate("/auth")} className="px-10 py-4 text-base sm:text-lg">
              Start Generating
            </FancyButton>
          </div>
        </motion.div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Why Creatives Choose Megsy */}
      <section className="mx-auto max-w-7xl px-6 py-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl lg:text-6xl">
            WHY CREATIVES CHOOSE
            <br />
            <span className="text-primary">MEGSY'S AI IMAGE GENERATOR</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Most AI tools promise fast results. But speed without quality creates more problems
            than it solves. Megsy is built for creatives who care about both craft and efficiency.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[280px]">
          {/* Card 1 - Green accent */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="relative rounded-2xl bg-primary p-6 flex flex-col justify-between lg:row-span-2"
          >
            <div className="w-16 h-16 flex items-center justify-center text-4xl font-black text-black">
              01
            </div>
            <div>
              <h3 className="text-2xl font-bold text-black">From idea to execution, effortlessly.</h3>
              <p className="mt-3 text-sm text-black/70">
                Megsy puts creative control in your hands, so you can refine and finish your work in one place, without jumping between tools.
              </p>
            </div>
          </motion.div>

          {/* Card 2 - Image with overlay */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="relative rounded-2xl overflow-hidden lg:col-span-2 lg:row-span-1"
          >
            <img src="/showcase/samurai.jpg" alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
            <div className="absolute bottom-0 left-0 p-6 z-10">
              <h3 className="text-xl font-bold text-white drop-shadow-lg">Endless creative possibilities.</h3>
              <p className="mt-2 text-sm text-white/90 max-w-sm drop-shadow-md">
                From hyperrealistic renders to abstract art. Create, iterate, and ship without creative limits.
              </p>
            </div>
          </motion.div>

          {/* Card 3 - Yellow accent */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="relative rounded-2xl bg-yellow-400 p-6 flex flex-col justify-between lg:row-span-2"
          >
            <div className="w-16 h-16 flex items-center justify-center text-4xl font-black text-black">
              AI
            </div>
            <div>
              <h3 className="text-2xl font-bold text-black">Brand-ready outputs.</h3>
              <p className="mt-3 text-sm text-black/70">
                Maintain visual consistency across campaigns. Perfect for teams who need cohesive brand imagery at scale.
              </p>
            </div>
          </motion.div>

          {/* Card 4 - Image with overlay */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="relative rounded-2xl overflow-hidden lg:col-span-2 lg:row-span-1"
          >
            <img src="/showcase/cyberpunk.jpg" alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
            <div className="absolute bottom-0 left-0 p-6 z-10">
              <h3 className="text-xl font-bold text-white drop-shadow-lg">Pro tools, zero complexity.</h3>
              <p className="mt-2 text-sm text-white/90 max-w-sm drop-shadow-md">
                AI Canvas, style transfer, and smart upscaling. Professional features made simple for every creator.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl lg:text-6xl">
            HOW MEGSY'S AI
            <br />
            <span className="text-primary">IMAGE GENERATOR WORKS</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Create with text or images, refine with pro features, and export visuals ready to share.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left - Steps */}
          <div className="flex flex-col gap-3">
            {howItWorksSteps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`${step.bg} rounded-2xl p-5 flex items-start gap-4 transition-transform hover:scale-[1.02]`}
              >
                <span className={`text-5xl font-black ${step.textColor} opacity-60`}>{step.number}</span>
                <div className="flex-1">
                  <h3 className={`text-lg font-bold ${step.textColor}`}>{step.title}</h3>
                  <p className={`text-sm ${step.textColor} opacity-80 mt-1`}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right - Chat Interface Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="relative"
          >
            <div className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden backdrop-blur-sm">
              {/* Chat Messages Area */}
              <div className="h-[400px] flex flex-col">
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
                  {/* User Message */}
                  <AnimatePresence>
                    {showUserMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex justify-end"
                      >
                        <div className="flex items-start gap-2 max-w-[85%]">
                          <div className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5">
                            <p className="text-sm text-primary-foreground">{currentScenario.userPrompt}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* AI Response */}
                  <AnimatePresence>
                    {(phase === 'typing-ai' || showAiMessage) && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex justify-start"
                      >
                        <div className="flex items-start gap-2 max-w-[85%]">
                          <div className="text-sm text-foreground/90">
                            {typedAiText}
                            {phase === 'typing-ai' && (
                              <motion.span
                                className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle"
                                animate={{ opacity: [1, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                              />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Loading State */}
                  <AnimatePresence>
                    {phase === 'generating' && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex justify-start"
                      >
                        <div className="rounded-2xl border border-border/30 bg-muted/30 p-4">
                            <div className="flex items-center gap-3">
                              <motion.div
                                className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                              <div>
                                <p className="text-sm font-medium">Creating your image...</p>
                                
                              </div>
                            </div>
                            {/* Progress bar */}
                            <motion.div className="mt-3 w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-primary rounded-full"
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 2.3, ease: "easeInOut" }}
                              />
                            </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Generated Image */}
                  <AnimatePresence>
                    {showImage && phase === 'complete' && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex justify-start"
                      >
                        <div className="space-y-2">
                            <div className="relative rounded-xl overflow-hidden border border-border/30 max-w-[280px]">
                              <img 
                                src={currentScenario.image} 
                                alt="Generated" 
                                className="w-full aspect-square object-cover"
                              />
                              <motion.div 
                                className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs flex items-center gap-1.5"
                                initial={{ y: -10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                              >
                                <span className="text-white/90">{currentScenario.model}</span>
                              </motion.div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Generated | {currentScenario.size}
                            </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      </section>

      

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-28 text-center">
        <h2 className="font-display text-4xl font-black uppercase md:text-6xl">
          Ready to Create?
        </h2>
        <p className="mt-6 text-lg text-muted-foreground">Join thousands of creators using Megsy Pro to bring their ideas to life.</p>
        <FancyButton onClick={() => navigate("/auth")} className="mt-10 text-lg px-12 py-4">
          Get Started Free
        </FancyButton>
      </section>

      <LandingFooter />
    </div>
  );
};

export default ServiceImagesPage;
