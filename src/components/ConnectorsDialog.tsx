import { useState } from "react";
import { X, Plus, Search } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

// Connector icons (inline SVGs)
const NotionIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.29 2.16c-.42-.326-.98-.7-2.055-.607L3.572 2.573c-.467.047-.56.28-.374.466l1.261 1.17zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.887c-.56.046-.747.326-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.747 0-.933-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.513.28-.886.747-.933l3.222-.186z"/>
  </svg>
);

const SlackIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
    <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
    <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
    <path d="M15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z" fill="#ECB22E"/>
  </svg>
);

const FigmaIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
    <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z" fill="#F24E1E"/>
    <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z" fill="#FF7262"/>
    <path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z" fill="#1ABCFE"/>
    <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z" fill="#0ACF83"/>
    <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z" fill="#A259FF"/>
  </svg>
);

const GoogleDriveIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
    <path d="M7.71 3.5L1.15 15l3.44 5.96L11.15 9.46 7.71 3.5z" fill="#0066DA"/>
    <path d="M16.29 3.5H7.71l6.56 11.46h8.58L16.29 3.5z" fill="#00AC47"/>
    <path d="M1.15 15l3.44 5.96h14.82l3.44-5.96H1.15z" fill="#EA4335"/>
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const GmailIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/>
  </svg>
);

const HubSpotIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#FF7A59">
    <path d="M17.002 8.283V5.53a1.97 1.97 0 0 0 1.143-1.783V3.7a1.97 1.97 0 0 0-1.97-1.97h-.048a1.97 1.97 0 0 0-1.97 1.97v.048c0 .776.457 1.447 1.117 1.76v2.775a5.537 5.537 0 0 0-2.794 1.27l-7.384-5.746a2.353 2.353 0 0 0 .076-.585A2.363 2.363 0 1 0 2.81 5.583l7.197 5.602a5.574 5.574 0 0 0 .378 6.415l-2.03 2.03a1.735 1.735 0 0 0-.506-.082 1.768 1.768 0 1 0 1.768 1.768c0-.18-.032-.352-.082-.513l1.997-1.997a5.565 5.565 0 1 0 5.47-10.523z"/>
  </svg>
);

const GoogleCalendarIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
    <path d="M18.316 5.684H5.684v12.632h12.632V5.684z" fill="white"/>
    <path d="M18.316 24L24 18.316V5.684L18.316 0H5.684L0 5.684v12.632L5.684 24h12.632z" fill="#4285F4"/>
    <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z" fill="white"/>
    <path d="M12 7v5l3.5 2" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#FF0000">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const DiscordIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#5865F2">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#0A66C2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const connectors = [
  { id: "notion", name: "Notion", description: "Connect your Notion workspace to search, update, and power workflows", icon: NotionIcon, category: "Productivity", featured: true },
  { id: "slack", name: "Slack", description: "Send messages, create canvases, and fetch Slack data", icon: SlackIcon, category: "Communication", featured: true },
  { id: "figma", name: "Figma", description: "Generate diagrams and better code from Figma context", icon: FigmaIcon, category: "Design", featured: true },
  { id: "github", name: "GitHub", description: "Connect repositories, create issues, and manage code", icon: GitHubIcon, category: "Development", featured: true },
  { id: "gdrive", name: "Google Drive", description: "Upload, search, and manage your files", icon: GoogleDriveIcon, category: "Storage", featured: true },
  { id: "gmail", name: "Gmail", description: "Send and manage emails directly", icon: GmailIcon, category: "Communication", featured: true },
  { id: "hubspot", name: "HubSpot", description: "Chat with your CRM data to get personalized insights", icon: HubSpotIcon, category: "Business", featured: false },
  { id: "gcalendar", name: "Google Calendar", description: "Create events and manage your schedule", icon: GoogleCalendarIcon, category: "Productivity", featured: false },
  { id: "youtube", name: "YouTube", description: "Search and manage video content", icon: YouTubeIcon, category: "Social", featured: false },
  { id: "discord", name: "Discord", description: "Send messages and manage servers", icon: DiscordIcon, category: "Communication", featured: false },
  { id: "linkedin", name: "LinkedIn", description: "Share and manage professional content", icon: LinkedInIcon, category: "Social", featured: false },
];

const categories = ["All", "Productivity", "Communication", "Development", "Design", "Storage", "Business", "Social"];

interface ConnectorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateIntegrations: () => void;
}

const ConnectorsDialog = ({ open, onOpenChange, onNavigateIntegrations }: ConnectorsDialogProps) => {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"featured" | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filtered = connectors.filter((c) => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase());
    const matchesTab = tab === "all" || c.featured;
    const matchesCategory = selectedCategory === "All" || c.category === selectedCategory;
    return matchesSearch && matchesTab && matchesCategory;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-xl font-bold text-foreground">Connectors</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Connect Megsy to your apps, files, and services.
              </p>
            </div>
          </div>

          {/* Search & filters */}
          <div className="flex items-center gap-2 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-secondary/30 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
              />
            </div>
            <button
              onClick={() => { onOpenChange(false); onNavigateIntegrations(); }}
              className="px-3 py-2 rounded-lg border border-border bg-secondary/30 text-sm text-foreground hover:bg-accent transition-colors whitespace-nowrap"
            >
              Manage connectors
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4 border-b border-border">
            <button
              onClick={() => setTab("featured")}
              className={`pb-2 text-sm font-medium transition-colors ${tab === "featured" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Featured
            </button>
            <button
              onClick={() => setTab("all")}
              className={`pb-2 text-sm font-medium transition-colors ${tab === "all" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              All
            </button>
          </div>
        </div>

        {/* Connector grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((connector) => (
              <button
                key={connector.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-secondary/40 transition-colors text-left group"
              >
                <div className="shrink-0">
                  <connector.icon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{connector.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{connector.description}</p>
                </div>
                <Plus className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground shrink-0 transition-colors" />
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No connectors found
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectorsDialog;
