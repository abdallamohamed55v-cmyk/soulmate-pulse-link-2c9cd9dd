import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, CreditCard, Settings, Sparkles, Users, CheckCheck } from "lucide-react";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import AppLayout from "@/layouts/AppLayout";
import { goBackOr } from "@/lib/navigation";

const typeConfig: Record<string, { icon: typeof Bell; className: string; label: string }> = {
  credits: { icon: CreditCard, className: "text-yellow-500", label: "Credits" },
  system: { icon: Settings, className: "text-blue-500", label: "System" },
  generation: { icon: Sparkles, className: "text-purple-500", label: "Generation" },
  referral: { icon: Users, className: "text-green-500", label: "Referral" },
};

const filters = [
  { value: "all", label: "All" },
  { value: "credits", label: "Credits" },
  { value: "system", label: "System" },
  { value: "generation", label: "Generation" },
  { value: "referral", label: "Referral" },
];

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllRead, markOneRead } = useNotifications();
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? notifications : notifications.filter(n => n.type === filter);

  const renderItem = (n: Notification) => {
    const config = typeConfig[n.type] || typeConfig.system;
    const Icon = config.icon;
    return (
      <div
        key={n.id}
        onClick={() => !n.read && markOneRead(n.id)}
        className={`flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${
          n.read
            ? "border-border bg-card/50 opacity-70"
            : "border-primary/20 bg-primary/5"
        } hover:bg-sidebar-accent/40`}
      >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${n.read ? "bg-muted" : "bg-primary/10"}`}>
          <Icon className={`w-4 h-4 ${config.className}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{n.title}</p>
            {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => goBackOr(navigate, "/chat")} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {filters.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No notifications</p>
              </div>
            ) : (
              filtered.map(renderItem)
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default NotificationsPage;
