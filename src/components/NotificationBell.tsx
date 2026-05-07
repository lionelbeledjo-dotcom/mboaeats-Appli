import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, X, Check, BellRing } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} j`;
}

export function NotificationBell() {
  const { items, unread, permission, requestPermission, markAllRead, markRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/60 backdrop-blur transition hover:bg-surface"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-glow">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl animate-fade-in"
          >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-primary" />
                <h2 className="font-display font-bold">Notifications</h2>
                {unread > 0 && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">{unread}</span>}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button onClick={markAllRead} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-surface" title="Tout marquer comme lu">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="rounded-md p-1.5 hover:bg-surface" aria-label="Fermer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            {permission === "default" && (
              <div className="m-3 rounded-2xl border border-primary/40 bg-primary/10 p-3 text-sm">
                <p className="font-semibold">Activer les notifications</p>
                <p className="mt-1 text-xs text-muted-foreground">Recevez les mises à jour de vos commandes en direct, même quand l'onglet est en arrière-plan.</p>
                <button onClick={requestPermission} className="mt-2 rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
                  Activer
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
                  <Bell className="h-10 w-10 opacity-30" />
                  <p className="text-sm">Aucune notification pour l'instant.</p>
                  <p className="text-xs">Passez une commande pour suivre son évolution ici.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((n) => {
                    const inner = (
                      <div className={`flex gap-3 px-4 py-3 transition ${n.read_at ? "" : "bg-primary/5"}`}>
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary text-sm">
                          {n.type === "order" ? "🍲" : "🔔"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold">{n.title}</p>
                            <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                          </div>
                          {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                        </div>
                        {!n.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                      </div>
                    );
                    return (
                      <li key={n.id} onClick={() => !n.read_at && markRead(n.id)}>
                        {n.link ? (
                          <Link to={n.link as never} onClick={() => setOpen(false)} className="block hover:bg-surface/70">
                            {inner}
                          </Link>
                        ) : (
                          <div className="hover:bg-surface/70">{inner}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
