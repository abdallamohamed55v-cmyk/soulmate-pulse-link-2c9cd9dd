import { Check, Loader2, X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Integration } from "@/lib/integrationsData";

const ICON_BASE = "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons";

const iconMap: Record<string, string> = {
  gmail: "gmail", outlook: "microsoftoutlook", slack: "slack", discord: "discord",
  microsoftteams: "microsoftteams", zoom: "zoom", telegram: "telegram",
  whatsapp: "whatsapp", notion: "notion", googlecalendar: "googlecalendar",
  todoist: "todoist", trello: "trello", asana: "asana", clickup: "clickup",
  github: "github", gitlab: "gitlab", jira: "jira", linear: "linear",
  vercel: "vercel", salesforce: "salesforce", hubspot: "hubspot",
  stripe: "stripe", paypal: "paypal", shopify: "shopify",
  instagram: "instagram", twitter: "x", facebook: "facebook", linkedin: "linkedin",
  youtube: "youtube", pinterest: "pinterest", reddit: "reddit",
  googledrive: "googledrive", dropbox: "dropbox", figma: "figma", canva: "canva",
  zendesk: "zendesk", wordpress: "wordpress", aws: "amazonwebservices",
  firebase: "firebase", supabase: "supabase", airtable: "airtable",
  zapier: "zapier", openai: "openai", twitch: "twitch", spotify: "spotify",
  googlesheets: "googlesheets", calendly: "calendly", typeform: "typeform",
  miro: "miro", sentry: "sentry", datadog: "datadog",
  algolia: "algolia", cloudflare: "cloudflare",
  mongodb: "mongodb", postgresql: "postgresql", mysql: "mysql", redis: "redis",
};

function getIcon(app: string): string | null {
  return iconMap[app] ? `${ICON_BASE}/${iconMap[app]}.svg` : null;
}

const descriptions: Record<string, string> = {
  gmail: "Connect your Gmail account to send, read, and manage emails directly from the chat. You can compose emails, search your inbox, and set up automated email workflows — all through natural conversation.",
  slack: "Integrate Slack to send messages, manage channels, and receive notifications. Perfect for team communication workflows where you need to post updates, search conversations, or create channels programmatically.",
  notion: "Connect Notion to create pages, manage databases, and organize your workspace. Use it to automatically generate documentation, update project wikis, or sync data between your tools.",
  github: "Link your GitHub account to create issues, manage repositories, review pull requests, and automate development workflows. Ideal for developers who want to manage their codebase through chat.",
  discord: "Connect Discord to send messages, manage servers, and create bots. Great for community management and automated notifications to your Discord channels.",
  stripe: "Integrate Stripe for payment processing, subscription management, and financial reporting. Monitor transactions, create payment links, and manage your billing directly.",
  shopify: "Connect your Shopify store to manage products, orders, and customers. Track inventory, process orders, and update your store catalog through simple conversations.",
  figma: "Link Figma to access your design files, export assets, and collaborate on designs. Perfect for design-to-development workflows.",
  hubspot: "Connect HubSpot CRM to manage contacts, deals, and marketing campaigns. Automate your sales pipeline and customer relationship management.",
  googledrive: "Access your Google Drive files, create documents, and organize your cloud storage. Search, share, and collaborate on files seamlessly.",
};

function getDetailDescription(integration: Integration): string {
  return descriptions[integration.app] || 
    `Connect ${integration.name} to enhance your workflow with powerful automation capabilities. Once connected, you can interact with ${integration.name} directly through the chat interface, automating tasks and managing your ${integration.category.toLowerCase()} workflows efficiently. This integration uses secure OAuth2 authentication to ensure your data remains protected.`;
}

interface Props {
  integration: Integration | null;
  isConnected: boolean;
  isLoading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onClose: () => void;
}

export default function IntegrationDetailModal({ integration, isConnected, isLoading, onConnect, onDisconnect, onClose }: Props) {
  if (!integration) return null;

  const iconUrl = getIcon(integration.app);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md liquid-glass rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="relative p-6 pb-4">
            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center ${
                isConnected ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border/30"
              }`}>
                {iconUrl ? (
                  <img src={iconUrl} alt="" className="w-8 h-8 dark:invert" />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">{integration.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{integration.name}</h2>
                <p className="text-xs text-muted-foreground">{integration.category}</p>
                {isConnected && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-emerald-500 font-medium">Connected</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{getDetailDescription(integration)}</p>

            <div className="mt-4 p-3 rounded-xl bg-muted/20 border border-border/20">
              <p className="text-xs font-medium text-foreground mb-1">How to use</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                After connecting, mention @integrations #{integration.name.toLowerCase().replace(/\s+/g, "")} in the chat to interact with {integration.name}. You can also use the integration tools directly through natural conversation.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-border/20">
            {isConnected ? (
              <div className="flex gap-2">
                <button
                  onClick={onDisconnect}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Disconnect"}
                </button>
              </div>
            ) : (
              <button
                onClick={onConnect}
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Connect {integration.name}
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
