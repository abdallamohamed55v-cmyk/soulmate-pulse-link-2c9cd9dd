import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Database, Check, Loader2, X, ExternalLink, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  projectId?: string | null;
}

interface IntegStatus {
  github?: { login?: string; avatar_url?: string } | null;
  supabase?: { connected_at?: string } | null;
}

interface SupaProject { id: string; name: string; region: string; status?: string }
interface SupaOrg { id: string; name: string }

const ConnectIntegrationsSheet = ({ open, onClose, userId, projectId }: Props) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<IntegStatus>({});
  const [busy, setBusy] = useState<string | null>(null);

  // Supabase project picker state
  const [showPicker, setShowPicker] = useState(false);
  const [projects, setProjects] = useState<SupaProject[]>([]);
  const [orgs, setOrgs] = useState<SupaOrg[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newOrg, setNewOrg] = useState("");

  const loadStatus = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("code_integrations")
      .select("provider, config")
      .eq("user_id", userId);
    const next: IntegStatus = {};
    (data || []).forEach((row) => {
      if (row.provider === "github") next.github = row.config as any;
      if (row.provider === "supabase") next.supabase = row.config as any;
    });
    setStatus(next);
  };

  useEffect(() => {
    if (open) loadStatus();
  }, [open, userId]);

  const startOAuth = async (provider: "github" | "supabase") => {
    if (!userId) return;
    setBusy(provider);
    try {
      const fnName = provider === "github" ? "oauth-github-connect" : "oauth-supabase-connect";
      const { data, error } = await supabase.functions.invoke(`${fnName}?action=start&user_id=${userId}`);
      if (error || !data?.url) {
        toast({ title: "Could not start connection", variant: "destructive" });
        return;
      }
      window.location.href = data.url;
    } finally {
      setBusy(null);
    }
  };

  const openProjectPicker = async () => {
    if (!userId) return;
    setShowPicker(true);
    setBusy("list");
    try {
      const { data } = await supabase.functions.invoke("oauth-supabase-connect?action=list-projects", {
        body: { user_id: userId },
      });
      setProjects(data?.projects || []);
      const { data: orgsData } = await supabase.functions.invoke("oauth-supabase-connect?action=list-orgs", {
        body: { user_id: userId },
      });
      setOrgs(orgsData?.orgs || []);
      if (orgsData?.orgs?.[0]) setNewOrg(orgsData.orgs[0].id);
    } finally {
      setBusy(null);
    }
  };

  const linkProject = async (proj: SupaProject) => {
    if (!projectId) {
      toast({ title: "Open a project first", variant: "destructive" });
      return;
    }
    const { data: row } = await supabase.from("projects").select("files_snapshot").eq("id", projectId).single();
    const snap = (row?.files_snapshot as Record<string, unknown>) || {};
    await supabase.from("projects").update({
      files_snapshot: {
        ...snap,
        __supabase_link: { project_ref: proj.id, name: proj.name, region: proj.region },
      } as any,
    }).eq("id", projectId);
    toast({ title: `Linked to ${proj.name}` });
    setShowPicker(false);
    onClose();
  };

  const createProject = async () => {
    if (!userId || !newName.trim() || !newOrg) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("oauth-supabase-connect?action=create-project", {
        body: { user_id: userId, name: newName.trim(), organization_id: newOrg },
      });
      if (error || data?.error) {
        toast({ title: "Create failed", description: data?.error || error?.message, variant: "destructive" });
        return;
      }
      toast({ title: `Created ${data.project.name}` });
      if (data.project) await linkProject(data.project);
    } finally {
      setCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[80]"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-[81] bg-card/95 backdrop-blur-2xl border-t border-border rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
          >
            <div className="w-12 h-1 bg-border rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Integrations</h2>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!showPicker ? (
              <div className="space-y-3">
                {/* GitHub card */}
                <div className="rounded-2xl border border-border bg-background/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center">
                      <Github className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">GitHub</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {status.github?.login ? `Connected as @${status.github.login}` : "Push projects to your repos"}
                      </p>
                    </div>
                    {status.github?.login ? (
                      <button
                        onClick={() => startOAuth("github")}
                        className="text-[11px] px-3 py-1.5 rounded-full border border-border hover:bg-secondary"
                      >
                        Reconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => startOAuth("github")}
                        disabled={busy === "github"}
                        className="text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {busy === "github" ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        Connect
                      </button>
                    )}
                  </div>
                </div>

                {/* Supabase card */}
                <div className="rounded-2xl border border-border bg-background/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Database className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Supabase</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {status.supabase?.connected_at ? "Account connected" : "Add a database to your project"}
                      </p>
                    </div>
                    {status.supabase?.connected_at ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={openProjectPicker}
                          className="text-[11px] px-3 py-1.5 rounded-full bg-emerald-500 text-white font-medium"
                        >
                          Link project
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startOAuth("supabase")}
                        disabled={busy === "supabase"}
                        className="text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {busy === "supabase" ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        Connect
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground text-center pt-2">
                  Tap outside to close
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <button onClick={() => setShowPicker(false)} className="text-xs text-muted-foreground">
                  ← Back
                </button>

                <div>
                  <p className="text-xs font-medium mb-2">Select existing project</p>
                  {busy === "list" ? (
                    <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                  ) : projects.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground py-3 text-center">No projects yet</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => linkProject(p)}
                          className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:bg-secondary transition-colors text-left"
                        >
                          <div>
                            <p className="text-xs font-medium">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground">{p.region}</p>
                          </div>
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-xs font-medium mb-2">Or create new</p>
                  <div className="space-y-2">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Project name"
                      className="w-full bg-secondary rounded-lg px-3 py-2 text-xs border border-border outline-none focus:border-primary"
                    />
                    {orgs.length > 1 && (
                      <select
                        value={newOrg}
                        onChange={(e) => setNewOrg(e.target.value)}
                        className="w-full bg-secondary rounded-lg px-3 py-2 text-xs border border-border outline-none"
                      >
                        {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    )}
                    <button
                      onClick={createProject}
                      disabled={!newName.trim() || !newOrg || creating}
                      className="w-full py-2 rounded-lg bg-emerald-500 text-white text-xs font-medium disabled:opacity-30 flex items-center justify-center gap-1.5"
                    >
                      {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Create project
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConnectIntegrationsSheet;
