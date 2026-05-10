import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

type Step = "email" | "password" | "otp-signup" | "set-password" | "otp-2fa" | "forgot-password" | "otp-reset" | "reset-password";

const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [verifiedResetCode, setVerifiedResetCode] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [userExists, setUserExists] = useState(false);
  const [has2FA, setHas2FA] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const redirectUrl = searchParams.get("redirect");

  const startCountdown = () => {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCheckEmail = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-email", { body: { email: normalizedEmail } });
      if (error) throw new Error(error.message);
      if (data.exists) {
        setUserExists(true);
        setHas2FA(data.two_factor_enabled);
        setStep("password");
      } else {
        setUserExists(false);
        await sendOTP(normalizedEmail);
        setStep("otp-signup");
      }
    } catch (e: any) {
      toast.error(e.message || "Could not check email");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendOTP = async (targetEmail?: string) => {
    const normalizedEmail = (targetEmail || email).trim().toLowerCase();
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("otp", { body: { action: "send", email: normalizedEmail } });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to send code");
      toast.success("Verification code sent to your email");
      startCountdown();
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (e: any) {
      toast.error(e.message || "Could not send code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!password) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw error;
      if (has2FA) {
        await sendOTP();
        setStep("otp-2fa");
      } else {
        toast.success("Welcome back!");
        if (redirectUrl) window.location.href = redirectUrl; else navigate("/chat");
      }
    } catch (e: any) {
      toast.error(e.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newValues = [...otpValues];
    newValues[index] = value.slice(-1);
    setOtpValues(newValues);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (newValues.every((v) => v !== "") && newValues.join("").length === 6) {
      handleVerifyOTP(newValues.join(""));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newValues = pasted.split("");
      setOtpValues(newValues);
      handleVerifyOTP(pasted);
    }
  };

  const handleVerifyOTP = async (code: string) => {
    setIsSubmitting(true);
    try {
      if (step === "otp-2fa") {
        const { data, error } = await supabase.functions.invoke("otp", { body: { action: "verify-2fa", email: email.trim().toLowerCase(), code } });
        if (error) throw new Error(error.message);
        if (!data?.success) throw new Error(data?.error || "Invalid code");
        toast.success("Welcome back!");
        if (redirectUrl) window.location.href = redirectUrl; else navigate("/chat");
      } else if (step === "otp-reset") {
        const { data, error } = await supabase.functions.invoke("otp", { body: { action: "verify-reset", email: email.trim().toLowerCase(), code } });
        if (error) throw new Error(error.message);
        if (!data?.success) throw new Error(data?.error || "Invalid code");
        setVerifiedResetCode(code);
        setStep("reset-password");
      } else {
        const { data, error } = await supabase.functions.invoke("otp", { body: { action: "verify-only", email: email.trim().toLowerCase(), code } });
        if (error) throw new Error(error.message);
        if (!data?.success) throw new Error(data?.error || "Invalid code");
        setStep("set-password");
      }
    } catch (e: any) {
      toast.error(e.message || "Verification failed");
      setOtpValues(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!newPassword || newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("signup", { body: { email: email.trim().toLowerCase(), password: newPassword } });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Could not create account");
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
      if (verifyError) throw verifyError;
      toast.success("Account created!");
      if (redirectUrl) window.location.href = redirectUrl; else navigate("/chat");
    } catch (e: any) {
      toast.error(e.message || "Could not create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-password", { body: { email: email.trim().toLowerCase(), password: newPassword, code: verifiedResetCode } });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to update password");
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
      if (verifyError) throw verifyError;
      toast.success("Password updated!");
      navigate("/chat");
    } catch (e: any) {
      toast.error(e.message || "Failed to update password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => { await sendOTP(); setStep("otp-reset"); };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectUrl || window.location.origin + "/chat" } });
  };

  const handleGitHubLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo: redirectUrl || window.location.origin + "/chat" } });
  };

  const resetFlow = () => { setStep("email"); setPassword(""); setNewPassword(""); setOtpValues(["", "", "", "", "", ""]); };

  const stepTitle: Record<Step, string> = {
    email: "Welcome to Megsy",
    password: "Welcome Back",
    "otp-signup": "Verify Your Email",
    "set-password": "Create Password",
    "otp-2fa": "Two-Factor Auth",
    "forgot-password": "Reset Password",
    "otp-reset": "Verify Code",
    "reset-password": "New Password"
  };

  const stepSubtitle: Record<Step, string> = {
    email: "Your AI workspace — create anything, instantly",
    password: "Enter your password to continue",
    "otp-signup": `We sent a 6-digit code to ${email}`,
    "set-password": "Choose a strong password for your account",
    "otp-2fa": `Enter the 2FA code sent to ${email}`,
    "forgot-password": "We'll send a reset code to your email",
    "otp-reset": `Enter the 6-digit code sent to ${email}`,
    "reset-password": "Choose your new password"
  };

  const isOtpStep = step === "otp-signup" || step === "otp-2fa" || step === "otp-reset";
  const showBack = step !== "email";

  const EmailChip = () => (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.06] w-fit">
      <span className="text-xs text-white/40 truncate">{email}</span>
    </div>
  );

  const Spinner = () => <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />;

  const inputCls = "w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all duration-200";

  const btnCls = "w-full py-3.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 active:scale-[0.98] transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none";

  const socialCls = "w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-white/[0.08] text-white/70 text-sm font-medium hover:bg-white/[0.04] active:scale-[0.98] transition-all duration-200";

  return (
    <div className="min-h-screen w-full bg-black flex">
      {/* ═══ Desktop Left — Bold Typography ═══ */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] relative overflow-hidden">
        {/* Video background — MUTED */}
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-30">
          <source src="/videos/auth-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/40" />

        <div className="relative z-10 flex flex-col justify-between p-14 xl:p-20 w-full">
          {/* Top */}
          <div>
            <span className="text-white/40 text-xs font-semibold tracking-[0.3em] uppercase">The AI Platform</span>
          </div>

          {/* Center — Landing-style hero text */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="text-[10px] uppercase tracking-[0.5em] text-white/25 mb-8"
            >
              The AI Platform
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.7 }}
              className="font-display text-[clamp(3rem,5vw,6rem)] font-black leading-[0.88] tracking-tighter"
            >
              <span className="text-white">BUILD A</span>
              <br />
              <span className="bg-gradient-to-r from-[hsl(262,80%,70%)] via-[hsl(300,70%,70%)] to-[hsl(340,80%,70%)] bg-clip-text text-transparent">
                WEBSITE.
              </span>
              <br />
              <span className="text-white">CREATE A</span>
              <br />
              <span className="bg-gradient-to-r from-[hsl(200,80%,65%)] via-[hsl(170,70%,60%)] to-[hsl(140,70%,65%)] bg-clip-text text-transparent">
                VIDEO.
              </span>
              <br />
              <span className="text-white/60 text-[clamp(1.5rem,2.5vw,3rem)]">IN SECONDS.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-10 text-sm text-white/25 max-w-sm leading-relaxed"
            >
              Chat, images, video, voice, code, and 50+ AI models — all in one place.
            </motion.p>
          </div>

          {/* Bottom — Minimal stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="flex gap-12"
          >
            {[
              { value: "50+", label: "Models" },
              { value: "10M+", label: "Generations" },
              { value: "99.9%", label: "Uptime" }
            ].map((s) => (
              <div key={s.label}>
                <p className="text-lg font-bold text-white/80">{s.value}</p>
                <p className="text-[10px] text-white/20 mt-0.5 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ═══ Right — Auth Form ═══ */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Silky multi-color gradient */}
        <div className="absolute inset-0 bg-[hsl(260,20%,4%)]" />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(280,60%,12%)/0.6] via-transparent to-[hsl(340,50%,10%)/0.4]" />
        <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[70%] rounded-full bg-[hsl(270,70%,25%)] opacity-25 blur-[160px]" />
        <div className="absolute bottom-[-25%] right-[-15%] w-[70%] h-[60%] rounded-full bg-[hsl(340,60%,20%)] opacity-20 blur-[140px]" />
        <div className="absolute top-[30%] right-[10%] w-[50%] h-[40%] rounded-full bg-[hsl(200,60%,18%)] opacity-15 blur-[120px]" />
        <div className="absolute bottom-[20%] left-[5%] w-[40%] h-[35%] rounded-full bg-[hsl(160,50%,15%)] opacity-10 blur-[100px]" />

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-16">
          <div className="w-full max-w-[360px]">
            {/* Mobile Logo */}
            <div className="lg:hidden mb-12">
              <h2 className="font-display text-3xl font-black text-white leading-[0.9] tracking-tight">
                BUILD.
                <br />
                <span className="bg-gradient-to-r from-[hsl(262,80%,70%)] to-[hsl(330,80%,70%)] bg-clip-text text-transparent">
                  CREATE.
                </span>
              </h2>
            </div>

            {/* Back */}
            <AnimatePresence>
              {showBack && (
                <motion.button
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  onClick={resetFlow}
                  className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 mb-6 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </motion.button>
              )}
            </AnimatePresence>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-xl font-bold text-white mb-1.5">{stepTitle[step]}</h1>
              <p className="text-[13px] text-white/30 leading-relaxed">{stepSubtitle[step]}</p>
            </div>

            {/* ═══ Forms ═══ */}
            <AnimatePresence mode="wait">
              {step === "email" && (
                <motion.div key="email" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-medium text-white/30 mb-1.5 block uppercase tracking-wider">Email</label>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCheckEmail()}
                        autoFocus
                        className={inputCls}
                      />
                    </div>
                    <button onClick={handleCheckEmail} disabled={isSubmitting || !email.trim()} className={btnCls}>
                      {isSubmitting ? <span className="flex items-center justify-center gap-2"><Spinner />Checking...</span> : "Continue"}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-white/[0.06]" />
                    <span className="text-[10px] text-white/15 uppercase tracking-wider">or</span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>

                  <div className="space-y-2.5">
                    <button onClick={handleGoogleLogin} className={socialCls}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Continue with Google
                    </button>
                    <button onClick={handleGitHubLogin} className={socialCls}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                      Continue with GitHub
                    </button>
                  </div>
                </motion.div>
              )}

              {step === "password" && (
                <motion.div key="password" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-white/30 mb-1.5 block uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
                        autoFocus
                        className={`${inputCls} pr-12`}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <button onClick={() => setStep("forgot-password")} className="text-xs text-white/40 hover:text-white/60 transition-colors">Forgot password?</button>
                  </div>
                  <button onClick={handlePasswordLogin} disabled={isSubmitting || !password} className={btnCls}>
                    {isSubmitting ? <span className="flex items-center justify-center gap-2"><Spinner />Signing in...</span> : "Sign In"}
                  </button>
                </motion.div>
              )}

              {isOtpStep && (
                <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="space-y-5">
                  <EmailChip />
                  <div className="flex justify-center gap-2.5" onPaste={handleOtpPaste}>
                    {otpValues.map((val, i) => (
                      <input
                        key={`otp-${step}-${i}`}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        maxLength={1}
                        value={val}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onFocus={(e) => e.target.select()}
                        className="w-12 h-14 text-center text-xl font-bold text-white bg-white/[0.05] border border-white/[0.08] rounded-xl outline-none focus:border-white/25 transition-all duration-200"
                      />
                    ))}
                  </div>
                  {isSubmitting && <p className="text-xs text-white/30 animate-pulse text-center">Verifying...</p>}
                  <div className="text-center">
                    {countdown > 0 ? (
                      <p className="text-xs text-white/20">Resend in {countdown}s</p>
                    ) : (
                      <button onClick={() => sendOTP()} disabled={isSubmitting} className="text-xs text-white/40 hover:text-white/60 transition-colors disabled:opacity-40">
                        Resend code
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {step === "set-password" && (
                <motion.div key="set-password" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="space-y-3">
                  <EmailChip />
                  <div>
                    <label className="text-[11px] font-medium text-white/30 mb-1.5 block uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Min 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreateAccount()}
                        autoFocus
                        className={`${inputCls} pr-12`}
                      />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors">
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button onClick={handleCreateAccount} disabled={isSubmitting || newPassword.length < 8} className={btnCls}>
                    {isSubmitting ? <span className="flex items-center justify-center gap-2"><Spinner />Creating...</span> : "Create Account"}
                  </button>
                </motion.div>
              )}

              {step === "reset-password" && (
                <motion.div key="reset-password" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="space-y-3">
                  <EmailChip />
                  <div>
                    <label className="text-[11px] font-medium text-white/30 mb-1.5 block uppercase tracking-wider">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Min 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                        autoFocus
                        className={`${inputCls} pr-12`}
                      />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors">
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button onClick={handleResetPassword} disabled={isSubmitting || newPassword.length < 8} className={btnCls}>
                    {isSubmitting ? <span className="flex items-center justify-center gap-2"><Spinner />Updating...</span> : "Update Password"}
                  </button>
                </motion.div>
              )}

              {step === "forgot-password" && (
                <motion.div key="forgot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="space-y-3">
                  <EmailChip />
                  <button onClick={handleForgotPassword} disabled={isSubmitting} className={btnCls}>
                    {isSubmitting ? <span className="flex items-center justify-center gap-2"><Spinner />Sending...</span> : "Send Reset Code"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-[10px] text-white/10 mt-8 text-center leading-relaxed">
              By continuing, you agree to our{" "}
              <a href="https://terms.megsyai.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/25 transition-colors">Terms</a> and{" "}
              <a href="https://privacy.megsyai.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/25 transition-colors">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
