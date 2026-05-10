import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Loader2, Search, ChevronRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { DesktopSettingsLayout } from "@/components/DesktopSettingsLayout";
import { integrations, INTEGRATION_CATEGORIES, type Integration } from "@/lib/integrationsData";
import IntegrationDetailModal from "@/components/IntegrationDetailModal";

const ICON_BASE = "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons";

function getIntegrationIcon(app: string): string | null {
  const map: Record<string, string> = {
    gmail: "gmail", outlook: "microsoftoutlook", slack: "slack", discord: "discord",
    microsoftteams: "microsoftteams", zoom: "zoom", telegram: "telegram",
    whatsapp: "whatsapp", twilio: "twilio", sendgrid: "sendgrid", mailchimp: "mailchimp",
    intercom: "intercom", notion: "notion", googlecalendar: "googlecalendar",
    todoist: "todoist", trello: "trello", evernote: "evernote", asana: "asana",
    clickup: "clickup", monday: "monday", github: "github", gitlab: "gitlab",
    bitbucket: "bitbucket", jira: "jira", linear: "linear", vercel: "vercel",
    netlify: "netlify", docker: "docker", kubernetes: "kubernetes",
    salesforce: "salesforce", hubspot: "hubspot", pipedrive: "pipedrive",
    stripe: "stripe", paypal: "paypal", shopify: "shopify",
    instagram: "instagram", twitter: "x", facebook: "facebook", linkedin: "linkedin",
    tiktok: "tiktok", youtube: "youtube", pinterest: "pinterest", reddit: "reddit",
    googledrive: "googledrive", dropbox: "dropbox", onedrive: "microsoftonedrive",
    box: "box", figma: "figma", canva: "canva", adobephotoshop: "adobephotoshop",
    googleanalytics: "googleanalytics", mixpanel: "mixpanel", segment: "segment",
    zendesk: "zendesk", freshdesk: "freshdesk", wordpress: "wordpress",
    wix: "wix", squarespace: "squarespace", aws: "amazonwebservices",
    googlecloud: "googlecloud", azure: "microsoftazure",
    postgresql: "postgresql", mongodb: "mongodb", mysql: "mysql", redis: "redis",
    firebase: "firebase", supabase: "supabase", airtable: "airtable",
    twitch: "twitch", spotify: "spotify", vimeo: "vimeo",
    zapier: "zapier", ifttt: "ifttt", make: "make",
    openai: "openai", anthropic: "anthropic",
    googlesheets: "googlesheets", googledocs: "googledocs", microsoftexcel: "microsoftexcel",
    confluence: "confluence", bamboohr: "bamboohr", gusto: "gusto",
    quickbooks: "quickbooks", xero: "xero", freshbooks: "freshbooks",
    mailgun: "mailgun", postmark: "postmark", brevo: "brevo",
    calendly: "calendly", typeform: "typeform", surveymonkey: "surveymonkey",
    miro: "miro", loom: "loom", webflow: "webflow",
    sentry: "sentry", datadog: "datadog", newrelic: "newrelic",
    grafana: "grafana", elasticsearch: "elasticsearch",
    pagerduty: "pagerduty", statuspage: "statuspage",
    tableau: "tableau", powerbi: "powerbi",
    algolia: "algolia", cloudflare: "cloudflare",
    heroku: "heroku", digitalocean: "digitalocean",
  };
  return map[app] ? `${ICON_BASE}/${map[app]}.svg` : null;
}

// Hero: Premium orbiting connections with smooth motion
const HeroConnection = () => {
  const apps = ["gmail", "slack", "github", "notion", "figma", "discord", "googledrive", "linear"];
  const radius = 110;

  return (
    <div className="relative w-64 h-64 mx-auto">
      <motion.div
        className="absolute inset-0 rounded-full border border-primary/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-6 rounded-full border border-primary/5"
        animate={{ rotate: -360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
      />

      <svg className="absolute inset-0 w-full h-full" viewBox="-140 -140 280 280">
        {apps.map((_, i) => {
          const angle = (i / apps.length) * 360 - 90;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;
          return (
            <motion.line
              key={i}
              x1="0" y1="0" x2={x} y2={y}
              stroke="hsl(var(--primary))"
              strokeWidth="0.8"
              strokeDasharray="2 4"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
            />
          );
        })}
      </svg>

      {apps.map((app, i) => {
        const angle = (i / apps.length) * 360 - 90;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;
        const iconUrl = getIntegrationIcon(app);
        return (
          <motion.div
            key={app}
            className="absolute w-11 h-11 rounded-2xl liquid-glass flex items-center justify-center"
            style={{
              left: `calc(50% + ${x}px - 22px)`,
              top: `calc(50% + ${y}px - 22px)`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, y: [0, -4, 0] }}
            transition={{
              scale: { delay: 0.1 + i * 0.05, type: "spring", damping: 12 },
              opacity: { delay: 0.1 + i * 0.05 },
              y: { duration: 3 + i * 0.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 },
            }}
          >
            {iconUrl && <img src={iconUrl} alt="" className="w-5 h-5 dark:invert" loading="lazy" />}
          </motion.div>
        );
      })}

      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-3xl bg-gradient-to-br from-zinc-200 via-white to-zinc-300 dark:from-zinc-500 dark:via-zinc-300 dark:to-zinc-600 flex items-center justify-center shadow-2xl border border-white/30"
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 14, delay: 0.3 }}
      >
        <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-2xl -z-10" />
        <span
          className="text-3xl font-black text-zinc-800 dark:text-zinc-900 select-none"
          style={{ fontFamily: "system-ui", textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
        >M</span>
      </motion.div>
    </div>
  );
};

const IntegrationsPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [connectedApps, setConnectedApps] = useState<Record<string, string>>({});
  const [loadingApp, setLoadingApp] = useState<string | null>(null);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  useEffect(() => { loadConnections(); }, []);

  const loadConnections = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("composio", {
        body: { action: "list-connections", userId: "default" },
      });
      if (error) throw error;
      const items = data?.items || data || [];
      const connected: Record<string, string> = {};
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          const appName = (item.appName || item.appUniqueId || "").toLowerCase();
          if (appName && item.status === "ACTIVE") connected[appName] = item.id;
        });
      }
      setConnectedApps(connected);
    } catch (e) {
      console.error("Failed to load connections:", e);
    } finally {
      setIsLoadingConnections(false);
    }
  };

  const handleConnect = async (integration: Integration) => {
    setLoadingApp(integration.id);
    try {
      const { data, error } = await supabase.functions.invoke("composio", {
        body: { action: "connect", app: integration.app, userId: "default" },
      });
      if (error) throw error;
      if (data?.redirectUrl) {
        const returnUrl = window.location.href;
        const redirectWithReturn = data.redirectUrl + (data.redirectUrl.includes("?") ? "&" : "?") + `redirect_url=${encodeURIComponent(returnUrl)}`;
        const authWindow = window.open(redirectWithReturn, "_blank", "width=600,height=700");
        if (!authWindow) { window.location.href = redirectWithReturn; return; }
        toast.success(`Opening ${integration.name} authorization...`);
        const pollInterval = setInterval(async () => {
          try {
            if (authWindow.closed) { clearInterval(pollInterval); await loadConnections(); setLoadingApp(null); return; }
            const { data: checkData } = await supabase.functions.invoke("composio", {
              body: { action: "list-connections", userId: "default" },
            });
            const items = checkData?.items || checkData || [];
            if (Array.isArray(items)) {
              const found = items.find((item: any) => (item.appName || item.appUniqueId || "").toLowerCase() === integration.app && item.status === "ACTIVE");
              if (found) {
                clearInterval(pollInterval); authWindow.close();
                setConnectedApps(prev => ({ ...prev, [integration.app]: found.id }));
                toast.success(`${integration.name} connected successfully`);
                setLoadingApp(null);
              }
            }
          } catch {}
        }, 2500);
        setTimeout(() => { clearInterval(pollInterval); setLoadingApp(null); }, 120000);
        return;
      } else if (data?.connectionStatus === "ACTIVE") {
        toast.success(`${integration.name} connected`);
        setConnectedApps(prev => ({ ...prev, [integration.app]: data.id }));
      }
    } catch {
      toast.error(`Failed to connect ${integration.name}`);
    } finally {
      setLoadingApp(null);
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    const connectionId = connectedApps[integration.app];
    if (!connectionId) return;
    setLoadingApp(integration.id);
    try {
      const { error } = await supabase.functions.invoke("composio", {
        body: { action: "disconnect", connectionId, userId: "default" },
      });
      if (error) throw error;
      setConnectedApps(prev => { const next = { ...prev }; delete next[integration.app]; return next; });
      toast.success(`${integration.name} disconnected`);
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setLoadingApp(null);
    }
  };

  const isConnected = (app: string) => !!connectedApps[app];

  const filtered = useMemo(() => {
    return integrations.filter(i => {
      const matchesSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "All" || i.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  const content = (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />
        <div className="relative max-w-3xl mx-auto px-4 pt-8 pb-6">
          {isMobile && (
            <button onClick={() => navigate("/settings")} className="absolute left-4 top-4 p-2 text-muted-foreground hover:text-foreground transition-colors z-10">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center">
            <HeroConnection />
            <h1 className="text-2xl md:text-4xl font-black text-foreground tracking-tight leading-[1.1] mt-4">
              {integrations.length}+ Integrations
            </h1>
            <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">
              Connect your favorite tools and automate workflows directly from the chat.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-3xl mx-auto px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search integrations..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-secondary/20 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {INTEGRATION_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Integration List */}
      <div className="max-w-3xl mx-auto px-4 pb-20">
        {isLoadingConnections ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">No integrations found</div>
        ) : (
          <div className="space-y-1">
            {filtered.map((integration, i) => {
              const connected = isConnected(integration.app);
              const isLoading = loadingApp === integration.id;
              const iconUrl = getIntegrationIcon(integration.app);
              return (
                <motion.button
                  key={integration.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.015, 0.3) }}
                  onClick={() => setSelectedIntegration(integration)}
                  className="w-full flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted/30 transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    connected ? "bg-primary/5 border-primary/20" : "bg-card border-border/30"
                  }`}>
                    {iconUrl ? (
                      <img src={iconUrl} alt="" className="w-5 h-5 invert" loading="lazy" />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{integration.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{integration.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{integration.description}</p>
                  </div>
                  {connected && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-emerald-500" />
                    </div>
                  )}
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      <IntegrationDetailModal
        integration={selectedIntegration}
        isConnected={selectedIntegration ? isConnected(selectedIntegration.app) : false}
        isLoading={selectedIntegration ? loadingApp === selectedIntegration.id : false}
        onConnect={() => selectedIntegration && handleConnect(selectedIntegration)}
        onDisconnect={() => selectedIntegration && handleDisconnect(selectedIntegration)}
        onClose={() => setSelectedIntegration(null)}
      />
    </div>
  );

  if (!isMobile) {
    return (
      <DesktopSettingsLayout title="Integrations" subtitle={`${integrations.length}+ apps available`}>
        {content}
      </DesktopSettingsLayout>
    );
  }

  return content;
};

export default IntegrationsPage;
