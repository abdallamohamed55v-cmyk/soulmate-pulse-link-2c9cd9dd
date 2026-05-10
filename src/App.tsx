import { useEffect, useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ErrorBoundary from "@/components/ErrorBoundary";
import OfflineBanner from "@/components/OfflineBanner";
import CookieConsent from "./components/CookieConsent";
import TranslationWrapper from "./components/TranslationWrapper";

// Critical pages — eagerly loaded
import AuthPage from "./pages/AuthPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import ChatPage from "./pages/ChatPage";
import ChatSettingsPage from "./pages/ChatSettingsPage";
import LandingPage from "./pages/LandingPage";

// Lazy-loaded pages
const ImagesPage = lazy(() => import("./pages/ImagesPage"));
const VideosPage = lazy(() => import("./pages/VideosPage"));
const FilesPage = lazy(() => import("./pages/FilesPage"));
const SitesPage = lazy(() => import("./pages/SitesPage"));
const SiteGeneratorPage = lazy(() => import("./pages/SiteGeneratorPage"));
const SiteDetailPage = lazy(() => import("./pages/SiteDetailPage"));
const PublicSitePage = lazy(() => import("./pages/PublicSitePage"));
const ProgrammingPage = lazy(() => import("./pages/ProgrammingPage"));
const CodeWorkspace = lazy(() => import("./pages/CodeWorkspace"));
const PreviewPage = lazy(() => import("./pages/PreviewPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const CustomizationPage = lazy(() => import("./pages/CustomizationPage"));
const ProfileSettingsPage = lazy(() => import("./pages/ProfileSettingsPage"));
const BillingPage = lazy(() => import("./pages/BillingPage"));
const BillingSuccessPage = lazy(() => import("./pages/BillingSuccessPage"));
const ReferralsPage = lazy(() => import("./pages/ReferralsPage"));
const LanguagePage = lazy(() => import("./pages/LanguagePage"));
const IntegrationsPage = lazy(() => import("./pages/IntegrationsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ChangeEmailPage = lazy(() => import("./pages/ChangeEmailPage"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));
const DeleteAccountPage = lazy(() => import("./pages/DeleteAccountPage"));
const WithdrawPage = lazy(() => import("./pages/WithdrawPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const NotificationSettingsPage = lazy(() => import("./pages/NotificationSettingsPage"));
const OAuthAuthorizePage = lazy(() => import("./pages/OAuthAuthorizePage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const SharedChatPage = lazy(() => import("./pages/SharedChatPage"));
const AcceptInvitePage = lazy(() => import("./pages/AcceptInvitePage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const ServiceImagesPage = lazy(() => import("./pages/services/ServiceImagesPage"));
const ServiceVideosPage = lazy(() => import("./pages/services/ServiceVideosPage"));
const ServiceChatPage = lazy(() => import("./pages/services/ServiceChatPage"));
const ServiceFilesPage = lazy(() => import("./pages/services/ServiceFilesPage"));
const ServiceCodePage = lazy(() => import("./pages/services/ServiceCodePage"));
const ImageStudioPage = lazy(() => import("./pages/ImageStudioPage"));
const VideoStudioPage = lazy(() => import("./pages/VideoStudioPage"));
const ImageAgentPage = lazy(() => import("./pages/ImageAgentPage"));
const VideoAgentPage = lazy(() => import("./pages/VideoAgentPage"));
const EgyptPage = lazy(() => import("./pages/EgyptPage"));
const ModelsPage = lazy(() => import("./pages/ModelsPage"));
const CookiePolicyPage = lazy(() => import("./pages/CookiePolicyPage"));
const CareersPage = lazy(() => import("./pages/CareersPage"));
const SecurityPage = lazy(() => import("./pages/SecurityPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const ChangelogPage = lazy(() => import("./pages/ChangelogPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const EnterprisePage = lazy(() => import("./pages/EnterprisePage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const AuthDocsPage = lazy(() => import("./pages/AuthDocsPage"));
const VoicePage = lazy(() => import("./pages/VoicePage"));
const VoiceChangerPage = lazy(() => import("./pages/voice/VoiceChangerPage"));
const CloneVoicePage = lazy(() => import("./pages/voice/CloneVoicePage"));
const TTSPage = lazy(() => import("./pages/voice/TTSPage"));
const VoiceCallPage = lazy(() => import("./pages/voice/VoiceCallPage"));
const MusicGeneratorPage = lazy(() => import("./pages/voice/MusicGeneratorPage"));
const MusicPlayerPage = lazy(() => import("./pages/voice/MusicPlayerPage"));
const NoiseRemoverPage = lazy(() => import("./pages/voice/NoiseRemoverPage"));
const VoiceTranslatePage = lazy(() => import("./pages/voice/VoiceTranslatePage"));
const VoiceStudioPage = lazy(() => import("./pages/voice/VoiceStudioPage"));
const VideoToTextPage = lazy(() => import("./pages/tools/VideoToTextPage"));
const AIPersonalizationPage = lazy(() => import("./pages/AIPersonalizationPage"));
const MemoryPage = lazy(() => import("./pages/MemoryPage"));
const ResearchPreviewPage = lazy(() => import("./pages/ResearchPreviewPage"));
const InpaintPage = lazy(() => import("./pages/tools/InpaintPage"));
const ClothesChangerPage = lazy(() => import("./pages/tools/ClothesChangerPage"));
const HeadshotPage = lazy(() => import("./pages/tools/HeadshotPage"));
const BgRemoverPage = lazy(() => import("./pages/tools/BgRemoverPage"));
const FaceSwapPage = lazy(() => import("./pages/tools/FaceSwapPage"));
const RelightPage = lazy(() => import("./pages/tools/RelightPage"));
const ColorizerPage = lazy(() => import("./pages/tools/ColorizerPage"));
const CharacterSwapPage = lazy(() => import("./pages/tools/CharacterSwapPage"));
const StoryboardPage = lazy(() => import("./pages/tools/StoryboardPage"));
const SketchToImagePage = lazy(() => import("./pages/tools/SketchToImagePage"));
const RetouchingPage = lazy(() => import("./pages/tools/RetouchingPage"));
const RemoverPage = lazy(() => import("./pages/tools/RemoverPage"));
const HairChangerPage = lazy(() => import("./pages/tools/HairChangerPage"));
const CartoonPage = lazy(() => import("./pages/tools/CartoonPage"));
const AvatarGeneratorPage = lazy(() => import("./pages/tools/AvatarGeneratorPage"));
const ProductPhotoPage = lazy(() => import("./pages/tools/ProductPhotoPage"));
const LogoGeneratorPage = lazy(() => import("./pages/tools/LogoGeneratorPage"));
const PerspectiveCorrectionPage = lazy(() => import("./pages/tools/PerspectiveCorrectionPage"));
const VideoSwapPage = lazy(() => import("./pages/tools/VideoSwapPage"));
const VideoUpscalePage = lazy(() => import("./pages/tools/VideoUpscalePage"));
const TalkingPhotoPage = lazy(() => import("./pages/tools/TalkingPhotoPage"));
const VideoExtenderPage = lazy(() => import("./pages/tools/VideoExtenderPage"));
const AutoCaptionPage = lazy(() => import("./pages/tools/AutoCaptionPage"));
const LipSyncPage = lazy(() => import("./pages/tools/LipSyncPage"));
const GreenScreenPage = lazy(() => import("./pages/tools/GreenScreenPage"));
const VideoColorizerPage = lazy(() => import("./pages/tools/VideoColorizerPage"));
const VideoWatermarkPage = lazy(() => import("./pages/tools/VideoWatermarkPage"));
const VideoBgReplacerPage = lazy(() => import("./pages/tools/VideoBgReplacerPage"));
const VideoIntroPage = lazy(() => import("./pages/tools/VideoIntroPage"));
const VideoDenoisePage = lazy(() => import("./pages/tools/VideoDenoisePage"));
const ThumbnailGeneratorPage = lazy(() => import("./pages/tools/ThumbnailGeneratorPage"));
const KaraokeSeparatorPage = lazy(() => import("./pages/voice/KaraokeSeparatorPage"));
const PodcastEditorPage = lazy(() => import("./pages/voice/PodcastEditorPage"));
const AudioRestorationPage = lazy(() => import("./pages/voice/AudioRestorationPage"));
const AudioTranscriptionPage = lazy(() => import("./pages/voice/AudioTranscriptionPage"));
const SkillsSettingsPage = lazy(() => import("./pages/SkillsSettingsPage"));
const SkillsNewPage = lazy(() => import("./pages/SkillsNewPage"));

const queryClient = new QueryClient();

const LazyFallback = () => <div className="h-screen bg-background" />;

// Scroll to top on every route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return null;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setAuthenticated(!!session);
        setLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setAuthenticated(!!session);
        setLoading(false);
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  if (loading) return <div className="h-screen bg-background" />;
  if (!authenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);
    else document.documentElement.setAttribute("data-theme", "light");
    const savedAccent = localStorage.getItem("accent");
    if (savedAccent) document.documentElement.style.setProperty("--primary", savedAccent);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id || null;
      const lastUserId = localStorage.getItem("megsy_last_user_id");

      if (userId && lastUserId && userId !== lastUserId) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("megsy_cache_")) keysToRemove.push(key);
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        queryClient.clear();
      }

      if (userId) localStorage.setItem("megsy_last_user_id", userId);

      if (event === "SIGNED_OUT") {
        localStorage.removeItem("megsy_last_user_id");
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("megsy_cache_")) keysToRemove.push(key);
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        queryClient.clear();
      }

      setCurrentUserId(userId);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <TranslationWrapper>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <OfflineBanner />
              <CookieConsent />
              <Suspense fallback={<LazyFallback />}>
                <Routes>
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/share/:shareId" element={<SharedChatPage />} />
                  <Route path="/invite/:token" element={<AcceptInvitePage />} />
                  <Route path="/chat" element={<ProtectedRoute><ChatPage key={currentUserId} /></ProtectedRoute>} />
                  <Route path="/chat/settings" element={<ProtectedRoute><ChatSettingsPage /></ProtectedRoute>} />
                  <Route path="/images" element={<ProtectedRoute><ImagesPage key={currentUserId} /></ProtectedRoute>} />
                  <Route path="/images/studio" element={<ProtectedRoute><ImageStudioPage key={currentUserId} /></ProtectedRoute>} />
                  <Route path="/images/agent" element={<ProtectedRoute><ImageAgentPage key={currentUserId} /></ProtectedRoute>} />
                  <Route path="/videos" element={<ProtectedRoute><VideosPage key={currentUserId} /></ProtectedRoute>} />
                  <Route path="/videos/studio" element={<ProtectedRoute><VideoStudioPage key={currentUserId} /></ProtectedRoute>} />
                  <Route path="/videos/agent" element={<ProtectedRoute><VideoAgentPage key={currentUserId} /></ProtectedRoute>} />
                  <Route path="/files" element={<ProtectedRoute><FilesPage key={currentUserId} /></ProtectedRoute>} />
                  <Route path="/sites" element={<ProtectedRoute><SitesPage key={currentUserId} /></ProtectedRoute>} />
                  <Route path="/sites/new" element={<ProtectedRoute><SiteGeneratorPage /></ProtectedRoute>} />
                  <Route path="/sites/:id" element={<ProtectedRoute><SiteDetailPage /></ProtectedRoute>} />
                  <Route path="/site/:slug" element={<PublicSitePage />} />
                  <Route path="/images/tools/inpaint" element={<ProtectedRoute><InpaintPage /></ProtectedRoute>} />
                  <Route path="/images/tools/clothes-changer" element={<ProtectedRoute><ClothesChangerPage /></ProtectedRoute>} />
                  <Route path="/images/tools/headshot" element={<ProtectedRoute><HeadshotPage /></ProtectedRoute>} />
                  <Route path="/images/tools/bg-remover" element={<ProtectedRoute><BgRemoverPage /></ProtectedRoute>} />
                  <Route path="/images/tools/face-swap" element={<ProtectedRoute><FaceSwapPage /></ProtectedRoute>} />
                  <Route path="/images/tools/relight" element={<ProtectedRoute><RelightPage /></ProtectedRoute>} />
                  <Route path="/images/tools/colorizer" element={<ProtectedRoute><ColorizerPage /></ProtectedRoute>} />
                  <Route path="/images/tools/character-swap" element={<ProtectedRoute><CharacterSwapPage /></ProtectedRoute>} />
                  <Route path="/images/tools/storyboard" element={<ProtectedRoute><StoryboardPage /></ProtectedRoute>} />
                  <Route path="/images/tools/sketch-to-image" element={<ProtectedRoute><SketchToImagePage /></ProtectedRoute>} />
                  <Route path="/images/tools/retouching" element={<ProtectedRoute><RetouchingPage /></ProtectedRoute>} />
                  <Route path="/images/tools/remover" element={<ProtectedRoute><RemoverPage /></ProtectedRoute>} />
                  <Route path="/images/tools/hair-changer" element={<ProtectedRoute><HairChangerPage /></ProtectedRoute>} />
                  <Route path="/images/tools/cartoon" element={<ProtectedRoute><CartoonPage /></ProtectedRoute>} />
                  <Route path="/images/tools/avatar-generator" element={<ProtectedRoute><AvatarGeneratorPage /></ProtectedRoute>} />
                  <Route path="/images/tools/product-photo" element={<ProtectedRoute><ProductPhotoPage /></ProtectedRoute>} />
                  <Route path="/images/tools/logo-generator" element={<ProtectedRoute><LogoGeneratorPage /></ProtectedRoute>} />
                  <Route path="/images/tools/perspective-correction" element={<ProtectedRoute><PerspectiveCorrectionPage /></ProtectedRoute>} />
                  <Route path="/videos/tools/swap-characters" element={<ProtectedRoute><VideoSwapPage /></ProtectedRoute>} />
                  <Route path="/videos/tools/upscale" element={<ProtectedRoute><VideoUpscalePage /></ProtectedRoute>} />
                  <Route path="/videos/tools/talking-photo" element={<ProtectedRoute><TalkingPhotoPage /></ProtectedRoute>} />
                  <Route path="/videos/tools/video-extender" element={<ProtectedRoute><VideoExtenderPage /></ProtectedRoute>} />
                  <Route path="/videos/tools/auto-caption" element={<ProtectedRoute><AutoCaptionPage /></ProtectedRoute>} />
                  <Route path="/videos/tools/lip-sync" element={<ProtectedRoute><LipSyncPage /></ProtectedRoute>} />
                  <Route path="/videos/tools/video-to-text" element={<ProtectedRoute><VideoToTextPage /></ProtectedRoute>} />
                  <Route path="/videos/tools/green-screen" element={<ProtectedRoute><GreenScreenPage /></ProtectedRoute>} />
                  <Route path="/videos/tools/video-colorizer" element={<ProtectedRoute><VideoColorizerPage /></ProtectedRoute>} />
                  <Route path="/videos/tools/video-watermark" element={<ProtectedRoute><VideoWatermarkPage /></ProtectedRoute>} />
                  <Route path="/videos/tools/video-bg-replacer" element={<ProtectedRoute><VideoBgReplacerPage /></ProtectedRoute>} />
                  <Route path="/videos/tools/video-intro" element={<ProtectedRoute><VideoIntroPage /></ProtectedRoute>} />
                  <Route path="/videos/tools/video-denoise" element={<ProtectedRoute><VideoDenoisePage /></ProtectedRoute>} />
                  <Route path="/videos/tools/thumbnail-generator" element={<ProtectedRoute><ThumbnailGeneratorPage /></ProtectedRoute>} />
                  <Route path="/voice" element={<ProtectedRoute><VoicePage key={currentUserId} /></ProtectedRoute>} />
                  <Route path="/voice/changer" element={<ProtectedRoute><VoiceChangerPage /></ProtectedRoute>} />
                  <Route path="/voice/clone" element={<ProtectedRoute><CloneVoicePage /></ProtectedRoute>} />
                  <Route path="/voice/tts" element={<ProtectedRoute><TTSPage /></ProtectedRoute>} />
                  <Route path="/voice/music" element={<ProtectedRoute><MusicGeneratorPage /></ProtectedRoute>} />
                  <Route path="/voice/music/:id" element={<ProtectedRoute><MusicPlayerPage /></ProtectedRoute>} />
                  <Route path="/voice/call" element={<ProtectedRoute><VoiceCallPage /></ProtectedRoute>} />
                  <Route path="/voice/noise-remover" element={<ProtectedRoute><NoiseRemoverPage /></ProtectedRoute>} />
                  <Route path="/voice/translate" element={<ProtectedRoute><VoiceTranslatePage /></ProtectedRoute>} />
                  <Route path="/voice/studio" element={<ProtectedRoute><VoiceStudioPage /></ProtectedRoute>} />
                  <Route path="/voice/karaoke-separator" element={<ProtectedRoute><KaraokeSeparatorPage /></ProtectedRoute>} />
                  <Route path="/voice/podcast-editor" element={<ProtectedRoute><PodcastEditorPage /></ProtectedRoute>} />
                  <Route path="/voice/audio-restoration" element={<ProtectedRoute><AudioRestorationPage /></ProtectedRoute>} />
                  <Route path="/voice/transcription" element={<ProtectedRoute><AudioTranscriptionPage /></ProtectedRoute>} />
                  {/* Old learning/shopping/research standalone pages removed — modes live inside /chat now */}
                  <Route path="/research/preview/:id" element={<ProtectedRoute><ResearchPreviewPage /></ProtectedRoute>} />
                  <Route path="/research/share/:token" element={<ResearchPreviewPage />} />
                  <Route path="/code" element={<ProtectedRoute><ProgrammingPage key={currentUserId} /></ProtectedRoute>} />
                  <Route path="/code/workspace" element={<ProtectedRoute><CodeWorkspace key={currentUserId} /></ProtectedRoute>} />
                  <Route path="/code/preview/:projectId" element={<ProtectedRoute><PreviewPage /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                  <Route path="/settings/customization" element={<ProtectedRoute><CustomizationPage /></ProtectedRoute>} />
                  <Route path="/settings/ai-personalization" element={<ProtectedRoute><AIPersonalizationPage /></ProtectedRoute>} />
                  <Route path="/settings/profile" element={<ProtectedRoute><ProfileSettingsPage /></ProtectedRoute>} />
                  <Route path="/settings/billing" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
                  <Route path="/billing/success" element={<BillingSuccessPage />} />
                  <Route path="/settings/referrals" element={<ProtectedRoute><ReferralsPage /></ProtectedRoute>} />
                  <Route path="/settings/language" element={<ProtectedRoute><LanguagePage /></ProtectedRoute>} />
                  <Route path="/settings/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
                  <Route path="/settings/memory" element={<ProtectedRoute><MemoryPage /></ProtectedRoute>} />
                  <Route path="/settings/skills" element={<ProtectedRoute><SkillsSettingsPage /></ProtectedRoute>} />
                  <Route path="/settings/skills/new" element={<ProtectedRoute><SkillsNewPage /></ProtectedRoute>} />
                  <Route path="/settings/change-email" element={<ProtectedRoute><ChangeEmailPage /></ProtectedRoute>} />
                  <Route path="/settings/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
                  <Route path="/settings/delete-account" element={<ProtectedRoute><DeleteAccountPage /></ProtectedRoute>} />
                  <Route path="/settings/withdraw" element={<ProtectedRoute><WithdrawPage /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                  <Route path="/settings/notifications" element={<ProtectedRoute><NotificationSettingsPage /></ProtectedRoute>} />
                  <Route path="/oauth/authorize" element={<OAuthAuthorizePage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/egypt" element={<EgyptPage />} />
                  <Route path="/apis" element={<PricingPage />} />
                  <Route path="/models" element={<ModelsPage />} />
                  <Route path="/cookies" element={<CookiePolicyPage />} />
                  <Route path="/support" element={<SupportPage />} />
                  <Route path="/careers" element={<CareersPage />} />
                  <Route path="/security" element={<SecurityPage />} />
                  <Route path="/blog" element={<BlogPage />} />
                  <Route path="/changelog" element={<ChangelogPage />} />
                  <Route path="/services/images" element={<ServiceImagesPage />} />
                  <Route path="/services/videos" element={<ServiceVideosPage />} />
                  <Route path="/services/chat" element={<ServiceChatPage />} />
                  <Route path="/services/files" element={<ServiceFilesPage />} />
                  <Route path="/services/code" element={<ServiceCodePage />} />
                  <Route path="/enterprise" element={<EnterprisePage />} />
                  <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
                  <Route path="/auth/docs" element={<AuthDocsPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </TranslationWrapper>
  );
};

export default App;
