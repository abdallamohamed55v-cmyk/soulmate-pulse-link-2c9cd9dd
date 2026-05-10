import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, Code, Shield, Zap, CreditCard, User } from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import SEOHead from "@/components/SEOHead";

const BASE_URL = "https://ltgampdtawuefwwayncx.supabase.co/functions/v1";

const CodeBlock = ({ code, lang = "bash" }: { code: string; lang?: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group rounded-xl bg-[#0d1117] border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/[0.02]">
        <span className="text-xs text-white/40 font-mono">{lang}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="text-white/40 hover:text-white/80 transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed"><code className="text-green-400/90 font-mono">{code}</code></pre>
    </div>
  );
};

const SectionTitle = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <div className="flex items-start gap-4 mb-6">
    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-1">
      <Icon className="w-5 h-5 text-primary" />
    </div>
    <div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="text-white/50 text-sm mt-1">{desc}</p>
    </div>
  </div>
);

const AuthDocsPage = () => {
  return (
    <>
      <SEOHead
        title="Megsy OAuth API Documentation — Unified Auth for Developers"
        description="Integrate Megsy authentication, credits, and subscription plans into your app. Full API reference for OAuth2, user info, credit deduction, and more."
        path="/auth/docs"
      />
      <div className="min-h-screen bg-[#09090b] text-white">
        <LandingNavbar />

        {/* Hero */}
        <section className="pt-32 pb-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-6">
                <Code className="w-4 h-4" /> API Documentation
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
                Megsy <span className="text-primary">OAuth API</span>
              </h1>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                Unified authentication, credits &amp; subscriptions across all your apps.
                One account, one balance, one plan — everywhere.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="pb-32 px-4">
          <div className="max-w-4xl mx-auto space-y-16">

            {/* Overview */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
              <h2 className="text-2xl font-bold mb-4">How It Works</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { icon: User, title: "1. User logs in via Megsy", desc: "Redirect to Megsy OAuth. User authorizes your app." },
                  { icon: Shield, title: "2. Get access token", desc: "Exchange auth code for a Bearer token (30-day expiry)." },
                  { icon: CreditCard, title: "3. Use unified system", desc: "Check plan, credits, and deduct MC — all via API." },
                ].map((s, i) => (
                  <div key={i} className="text-center p-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <s.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-bold text-white mb-1">{s.title}</h3>
                    <p className="text-white/50 text-sm">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Auth Flow */}
            <div>
              <SectionTitle icon={Shield} title="OAuth2 Authorization Flow" desc="Standard authorization code grant" />
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white/90 mb-3">Step 1: Redirect to Authorize</h3>
                  <p className="text-white/50 text-sm mb-3">
                    Redirect the user's browser to the Megsy authorization endpoint:
                  </p>
                  <CodeBlock lang="url" code={`https://smart-hub-egy.lovable.app/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/callback
  &scope=read+write+credits
  &response_type=code`} />
                  <div className="mt-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-yellow-400 text-sm"><strong>Scopes:</strong></p>
                    <ul className="text-white/60 text-sm mt-1 space-y-1 list-disc list-inside">
                      <li><code className="text-green-400">read</code> — Access user info (name, email, plan, credits)</li>
                      <li><code className="text-green-400">write</code> — Deduct credits from user's account</li>
                      <li><code className="text-green-400">credits</code> — Same as write but more specific</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white/90 mb-3">Step 2: Exchange Code for Token</h3>
                  <CodeBlock lang="bash" code={`curl -X POST ${BASE_URL}/oauth-token \\
  -H "Content-Type: application/json" \\
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \\
  -d '{
    "grant_type": "authorization_code",
    "code": "AUTH_CODE_FROM_CALLBACK",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uri": "https://yourapp.com/callback"
  }'`} />
                  <p className="text-white/50 text-sm mt-3">Response:</p>
                  <CodeBlock lang="json" code={`{
  "access_token": "abc123...xyz",
  "token_type": "Bearer",
  "expires_in": 2592000,
  "scope": "read write credits"
}`} />
                </div>
              </div>
            </div>

            {/* User Info */}
            <div>
              <SectionTitle icon={User} title="GET /oauth-userinfo" desc="Get user profile, plan, and credit balance" />
              <CodeBlock lang="bash" code={`curl ${BASE_URL}/oauth-userinfo \\
  -H "Authorization: Bearer ACCESS_TOKEN" \\
  -H "apikey: YOUR_SUPABASE_ANON_KEY"`} />
              <p className="text-white/50 text-sm mt-3">Response:</p>
              <CodeBlock lang="json" code={`{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Ahmed",
  "avatar_url": "https://...",
  "plan": "pro",
  "credits": 245.50,
  "is_premium": true,
  "created_at": "2026-01-15T..."
}`} />
              <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20 text-sm">
                <p className="text-primary font-semibold mb-1">💡 Unified System</p>
                <p className="text-white/60">
                  <code>plan</code> and <code>credits</code> are shared across all Megsy-connected apps.
                  If a user subscribes to Pro on megsyai.com, they get Pro access in your app too — with the same MC balance.
                </p>
              </div>
            </div>

            {/* Check Credits */}
            <div>
              <SectionTitle icon={Zap} title="GET /oauth-check-credits" desc="Check if user has enough credits before an action" />
              <CodeBlock lang="bash" code={`curl "${BASE_URL}/oauth-check-credits?amount=5" \\
  -H "Authorization: Bearer ACCESS_TOKEN" \\
  -H "apikey: YOUR_SUPABASE_ANON_KEY"`} />
              <p className="text-white/50 text-sm mt-3">Response:</p>
              <CodeBlock lang="json" code={`{
  "credits": 245.50,
  "plan": "pro",
  "is_premium": true,
  "has_enough": true,
  "requested": 5
}`} />
            </div>

            {/* Deduct Credits */}
            <div>
              <SectionTitle icon={CreditCard} title="POST /oauth-deduct-credits" desc="Deduct MC credits from user's account (requires 'write' or 'credits' scope)" />
              <CodeBlock lang="bash" code={`curl -X POST ${BASE_URL}/oauth-deduct-credits \\
  -H "Authorization: Bearer ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \\
  -d '{
    "amount": 3,
    "action_type": "image_generation",
    "description": "Generated 1 image with FLUX"
  }'`} />
              <p className="text-white/50 text-sm mt-3">Success response:</p>
              <CodeBlock lang="json" code={`{
  "success": true,
  "credits": 242.50
}`} />
              <p className="text-white/50 text-sm mt-3">Insufficient credits:</p>
              <CodeBlock lang="json" code={`{
  "success": false,
  "error": "Insufficient credits",
  "credits": 1.50
}`} />
              <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm">
                <p className="text-red-400 font-semibold mb-1">⚠️ Important</p>
                <p className="text-white/60">
                  Always call <code>/oauth-check-credits</code> before deducting to avoid failed transactions.
                  The <code>action_type</code> is prefixed with <code>oauth:your_client_id:</code> in transaction logs for tracking.
                </p>
              </div>
            </div>

            {/* Full Integration Example */}
            <div>
              <SectionTitle icon={Code} title="Full Integration Example" desc="Copy-paste ready code for your app" />
              <CodeBlock lang="typescript" code={`// megsy-auth.ts — Drop this file into your project

const MEGSY_API = "${BASE_URL}";
const ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

export class MegsyAuth {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private headers() {
    return {
      "Authorization": \`Bearer \${this.accessToken}\`,
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
    };
  }

  // Get user info, plan, and credits
  async getUserInfo() {
    const res = await fetch(\`\${MEGSY_API}/oauth-userinfo\`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("Failed to get user info");
    return res.json();
  }

  // Check if user has enough credits
  async checkCredits(amount: number) {
    const res = await fetch(
      \`\${MEGSY_API}/oauth-check-credits?amount=\${amount}\`,
      { headers: this.headers() }
    );
    if (!res.ok) throw new Error("Failed to check credits");
    return res.json();
  }

  // Deduct credits from user
  async deductCredits(amount: number, actionType: string, description?: string) {
    const res = await fetch(\`\${MEGSY_API}/oauth-deduct-credits\`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ amount, action_type: actionType, description }),
    });
    if (!res.ok) throw new Error("Failed to deduct credits");
    return res.json();
  }

  // Check if user has premium plan
  async isPremium() {
    const info = await this.getUserInfo();
    return info.is_premium;
  }
}

// Usage:
// const megsy = new MegsyAuth(accessToken);
// const user = await megsy.getUserInfo();
// if (user.is_premium && user.credits >= 5) {
//   await megsy.deductCredits(5, "my_feature", "Used feature X");
// }`} />
            </div>

            {/* Error Codes */}
            <div>
              <SectionTitle icon={Shield} title="Error Codes" desc="Common error responses across all endpoints" />
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/10">
                      <th className="text-left p-4 text-white/60 font-medium">Status</th>
                      <th className="text-left p-4 text-white/60 font-medium">Error</th>
                      <th className="text-left p-4 text-white/60 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      ["401", "invalid_token", "Token is missing, invalid, or expired"],
                      ["401", "token_expired", "Access token has expired (30-day limit)"],
                      ["403", "insufficient_scope", "Token doesn't have required scope"],
                      ["400", "Insufficient credits", "User doesn't have enough MC"],
                      ["404", "user_not_found", "User profile not found"],
                    ].map(([status, error, desc], i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="p-4"><span className={`px-2 py-0.5 rounded text-xs font-mono ${status === "401" ? "bg-red-500/20 text-red-400" : status === "403" ? "bg-orange-500/20 text-orange-400" : status === "400" ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"}`}>{status}</span></td>
                        <td className="p-4 font-mono text-green-400">{error}</td>
                        <td className="p-4 text-white/50">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Get Started */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Ready to integrate?</h2>
              <p className="text-white/50 mb-6">Contact us to register your OAuth client and get your client_id and client_secret.</p>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Register Your App <ExternalLink className="w-4 h-4" />
              </a>
            </div>

          </div>
        </section>

        <LandingFooter />
      </div>
    </>
  );
};

export default AuthDocsPage;
