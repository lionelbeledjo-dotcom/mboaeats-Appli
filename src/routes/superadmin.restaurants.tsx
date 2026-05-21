import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  X,
  Store,
  MapPin,
  Mail,
  User as UserIcon,
  Clock,
  ShieldCheck,
  Ban,
} from "lucide-react";
import {
  getRestaurantsForModeration,
  moderateRestaurant,
} from "@/server/restaurant.functions";
import {
  getCommissionOverview,
  setRestaurantCommission,
} from "@/server/commissions.functions";
import { Percent } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/superadmin/restaurants")({
  component: SuperAdminRestaurants,
  head: () => ({ meta: [{ title: "Modération des restaurants · Super Admin" }] }),
});

type StatusTab = "pending" | "approved" | "rejected" | "all";

type Resto = {
  id: string;
  name: string;
  cuisine: string | null;
  city: string | null;
  neighborhood: string | null;
  image_url: string | null;
  validation_status: "pending" | "approved" | "rejected";
  validation_note: string | null;
  validated_at: string | null;
  created_at: string;
  owner_email: string | null;
  owner_full_name: string | null;
  commission_rate: number | null;
};

const TABS: { key: StatusTab; label: string }[] = [
  { key: "pending", label: "En attente" },
  { key: "approved", label: "Validés" },
  { key: "rejected", label: "Refusés" },
  { key: "all", label: "Tous" },
];

const REJECT_REASONS = [
  "Documents manquants ou illisibles",
  "Informations incorrectes ou incohérentes",
  "Restaurant déjà enregistré",
];

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "il y a 1 jour";
  if (days < 30) return `il y a ${days} jours`;
  return d.toLocaleDateString("fr-FR");
}

function SuperAdminRestaurants() {
  const router = useRouter();
  const fetchList = useServerFn(getRestaurantsForModeration);
  const moderate = useServerFn(moderateRestaurant);
  const fetchOverview = useServerFn(getCommissionOverview);
  const setComm = useServerFn(setRestaurantCommission);

  const [tab, setTab] = useState<StatusTab>("pending");
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Resto[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, all: 0 });
  const [defaultRate, setDefaultRate] = useState<number>(18);

  const [approveOpen, setApproveOpen] = useState<Resto | null>(null);
  const [rejectOpen, setRejectOpen] = useState<Resto | null>(null);
  const [commOpen, setCommOpen] = useState<Resto | null>(null);
  const [commValue, setCommValue] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOverview().then((r) => setDefaultRate(r.defaultRate)).catch(() => {});
  }, []);

  const reload = async (s: StatusTab = tab) => {
    setLoading(true);
    try {
      const res = await fetchList({ data: { status: s } });
      console.log("[superadmin.restaurants] getRestaurantsForModeration →", res);
      setRestaurants((res?.restaurants ?? []) as unknown as Resto[]);
      setCounts(res?.counts ?? { pending: 0, approved: 0, rejected: 0, all: 0 });
    } catch (e: any) {
      console.error("[superadmin.restaurants] load error:", e);
      toast.error(e?.message || "Impossible de charger les restaurants");
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const openApprove = (r: Resto) => {
    setNote("");
    setApproveOpen(r);
  };
  const openReject = (r: Resto) => {
    setNote("");
    setRejectOpen(r);
  };

  const submitApprove = async () => {
    console.log("[superadmin.restaurants] submitApprove click", {
      id: approveOpen?.id,
      note,
    });
    if (!approveOpen) {
      console.warn("[superadmin.restaurants] submitApprove: no approveOpen");
      return;
    }
    const restaurantId = approveOpen.id;
    setSubmitting(true);
    try {
      const res = await moderate({
        data: { restaurantId, action: "approve", note: note ?? "" },
      });
      console.log("[superadmin.restaurants] moderate approve →", res);
      toast.success("Restaurant validé");
      setApproveOpen(null);
      setNote("");
      await reload();
      router.invalidate();
    } catch (e: any) {
      console.error("[superadmin.restaurants] approve error:", e);
      toast.error(e?.message || "Échec de la validation");
    } finally {
      setSubmitting(false);
    }
  };

  const submitReject = async () => {
    console.log("[superadmin.restaurants] submitReject click", {
      id: rejectOpen?.id,
      note,
    });
    if (!rejectOpen) return;
    if (!note.trim()) {
      toast.error("Veuillez indiquer une raison pour refuser ce restaurant.");
      return;
    }
    const restaurantId = rejectOpen.id;
    setSubmitting(true);
    try {
      const res = await moderate({
        data: { restaurantId, action: "reject", note },
      });
      console.log("[superadmin.restaurants] moderate reject →", res);
      toast.success("Restaurant refusé");
      setRejectOpen(null);
      setNote("");
      await reload();
      router.invalidate();
    } catch (e: any) {
      console.error("[superadmin.restaurants] reject error:", e);
      toast.error(e?.message || "Échec du refus");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Modération des restaurants
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Validez ou refusez les demandes des restaurateurs partenaires.
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.key === tab;
          const count = counts[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition " +
                (active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted")
              }
            >
              {t.label}
              <Badge
                variant={active ? "secondary" : "outline"}
                className="rounded-full text-[10px]"
              >
                {count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : restaurants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          {tab === "pending"
            ? "Aucune demande en attente 🎉"
            : "Aucun restaurant dans cette catégorie."}
        </div>
      ) : (
        <ul className="space-y-3">
          {restaurants.map((r) => (
            <RestoCard
              key={r.id}
              r={r}
              defaultRate={defaultRate}
              onApprove={() => openApprove(r)}
              onReject={() => openReject(r)}
              onEditCommission={() => {
                setCommValue(r.commission_rate != null ? String(r.commission_rate) : "");
                setCommOpen(r);
              }}
            />
          ))}
        </ul>
      )}

      {/* Commission modal */}
      <Dialog open={!!commOpen} onOpenChange={(o) => !o && setCommOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commission · {commOpen?.name}</DialogTitle>
            <DialogDescription>
              Laissez vide ou réinitialisez pour appliquer le taux global ({defaultRate}%).
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.5"
              min={0}
              max={100}
              value={commValue}
              onChange={(e) => setCommValue(e.target.value)}
              placeholder={`Défaut : ${defaultRate}`}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (!commOpen) return;
                setSubmitting(true);
                try {
                  await setComm({ data: { restaurant_id: commOpen.id, rate_pct: null } });
                  toast.success("Override supprimé · taux par défaut appliqué");
                  setCommOpen(null);
                  await reload();
                } catch (e: any) {
                  toast.error(e?.message ?? "Erreur");
                } finally { setSubmitting(false); }
              }}
              disabled={submitting}
            >
              Réinitialiser au défaut
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!commOpen) return;
                const n = Number(commValue);
                if (!Number.isFinite(n) || n < 0 || n > 100) {
                  toast.error("Taux invalide");
                  return;
                }
                setSubmitting(true);
                try {
                  await setComm({ data: { restaurant_id: commOpen.id, rate_pct: n } });
                  toast.success("Commission mise à jour");
                  setCommOpen(null);
                  await reload();
                } catch (e: any) {
                  toast.error(e?.message ?? "Erreur");
                } finally { setSubmitting(false); }
              }}
              disabled={submitting || commValue === ""}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve modal */}
      <Dialog open={!!approveOpen} onOpenChange={(o) => !o && setApproveOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider {approveOpen?.name} ?</DialogTitle>
            <DialogDescription>
              Le restaurateur recevra accès à son tableau de bord.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note interne, ex : appelé pour vérifier le numéro"
            rows={3}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setApproveOpen(null)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={submitApprove}
              disabled={submitting}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Check className="mr-1 h-4 w-4" />
              {submitting ? "Validation…" : "Valider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={!!rejectOpen} onOpenChange={(o) => !o && setRejectOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser {rejectOpen?.name}</DialogTitle>
            <DialogDescription>
              La raison sera visible par le restaurateur.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {REJECT_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setNote(reason)}
                className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-foreground hover:bg-muted"
              >
                {reason}
              </button>
            ))}
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Expliquez pourquoi (visible par le restaurateur)"
            rows={4}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectOpen(null)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={submitReject}
              disabled={submitting || !note.trim()}
            >
              <Ban className="mr-1 h-4 w-4" />
              {submitting ? "Refus…" : "Refuser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RestoCard({
  r,
  onApprove,
  onReject,
}: {
  r: Resto;
  onApprove: () => void;
  onReject: () => void;
}) {
  const tone = useMemo(() => {
    switch (r.validation_status) {
      case "approved":
        return "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20";
      case "rejected":
        return "border-rose-300 bg-rose-50 dark:bg-rose-950/20";
      default:
        return "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/10";
    }
  }, [r.validation_status]);

  return (
    <li className={"rounded-2xl border p-4 transition " + tone}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-emerald-700" />
            <h2 className="truncate font-semibold">{r.name}</h2>
            <StatusBadge status={r.validation_status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {r.cuisine || "—"}
            {" · "}
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {[r.city, r.neighborhood].filter(Boolean).join(" — ") || "—"}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/80">
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" /> {r.owner_email || "email inconnu"}
            </span>
            {r.owner_full_name && (
              <span className="inline-flex items-center gap-1">
                <UserIcon className="h-3 w-3" /> {r.owner_full_name}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" /> Soumis {timeAgo(r.created_at)}
            </span>
          </div>
          {r.validation_status !== "pending" && r.validation_note && (
            <p className="mt-2 rounded-md bg-background/60 px-2 py-1 text-xs text-foreground/80">
              <span className="font-medium">Note : </span>
              {r.validation_note}
            </p>
          )}
          {r.validated_at && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Modéré le {new Date(r.validated_at).toLocaleString("fr-FR")}
            </p>
          )}
        </div>

        {r.validation_status === "pending" && (
          <div className="flex shrink-0 gap-2">
            <Button
              onClick={onApprove}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              size="sm"
            >
              <Check className="mr-1 h-4 w-4" /> Valider
            </Button>
            <Button
              onClick={onReject}
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-100 hover:text-rose-700"
            >
              <X className="mr-1 h-4 w-4" /> Refuser
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved")
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Validé</Badge>;
  if (status === "rejected")
    return <Badge variant="destructive">Refusé</Badge>;
  return (
    <Badge variant="outline" className="border-emerald-400 text-emerald-700">
      En attente
    </Badge>
  );
}
