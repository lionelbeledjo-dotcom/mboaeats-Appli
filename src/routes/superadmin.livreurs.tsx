import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check, X, Bike, MapPin, Phone as PhoneIcon, Clock, ShieldCheck, Ban,
} from "lucide-react";
import {
  listDriverApplications,
  approveDriverApplication,
  rejectDriverApplication,
} from "@/lib/driver-onboarding.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/superadmin/livreurs")({
  component: SuperAdminLivreurs,
  head: () => ({ meta: [{ title: "Modération des livreurs · Super Admin" }] }),
});

// Mapping FR ↔ DB enum (en_attente | valide | rejete)
type StatusTab = "pending" | "approved" | "rejected" | "all";
const TAB_TO_DB: Record<Exclude<StatusTab, "all">, "en_attente" | "valide" | "rejete"> = {
  pending: "en_attente",
  approved: "valide",
  rejected: "rejete",
};

type Driver = {
  user_id: string;
  full_name: string;
  phone: string;
  city: string | null;
  vehicle_type: string | null;
  plate_number: string | null;
  status: "en_attente" | "valide" | "rejete";
  rejection_reason: string | null;
  validated_at: string | null;
  created_at: string;
};

const TABS: { key: StatusTab; label: string }[] = [
  { key: "pending", label: "En attente" },
  { key: "approved", label: "Validés" },
  { key: "rejected", label: "Refusés" },
  { key: "all", label: "Tous" },
];

const REJECT_REASONS = [
  "Documents manquants ou illisibles",
  "Informations incohérentes",
  "Véhicule non conforme",
];

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "il y a 1 jour";
  if (days < 30) return `il y a ${days} jours`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

function SuperAdminLivreurs() {
  const router = useRouter();
  const fetchList = useServerFn(listDriverApplications);
  const approveFn = useServerFn(approveDriverApplication);
  const rejectFn = useServerFn(rejectDriverApplication);

  const [tab, setTab] = useState<StatusTab>("pending");
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, all: 0 });

  const [approveOpen, setApproveOpen] = useState<Driver | null>(null);
  const [rejectOpen, setRejectOpen] = useState<Driver | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reload = async (s: StatusTab = tab) => {
    setLoading(true);
    try {
      // Charger TOUS les statuts en parallèle pour calculer les badges
      const [all, pending, approved, rejected] = await Promise.all([
        fetchList({ data: {} }),
        fetchList({ data: { status: "en_attente" } }),
        fetchList({ data: { status: "valide" } }),
        fetchList({ data: { status: "rejete" } }),
      ]);
      setCounts({
        pending: pending.applications.length,
        approved: approved.applications.length,
        rejected: rejected.applications.length,
        all: all.applications.length,
      });
      const source =
        s === "all" ? all :
        s === "pending" ? pending :
        s === "approved" ? approved : rejected;
      setDrivers(source.applications as unknown as Driver[]);
    } catch (e: any) {
      console.error("[superadmin.livreurs] load error:", e);
      toast.error(e?.message || "Impossible de charger les livreurs");
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(tab); /* eslint-disable-next-line */ }, [tab]);

  const submitApprove = async () => {
    if (!approveOpen) return;
    setSubmitting(true);
    try {
      await approveFn({ data: { user_id: approveOpen.user_id } });
      toast.success("Livreur validé");
      setApproveOpen(null);
      setNote("");
      await reload();
      router.invalidate();
    } catch (e: any) {
      toast.error(e?.message || "Échec de la validation");
    } finally {
      setSubmitting(false);
    }
  };

  const submitReject = async () => {
    if (!rejectOpen) return;
    if (!note.trim()) { toast.error("Veuillez indiquer une raison."); return; }
    setSubmitting(true);
    try {
      await rejectFn({ data: { user_id: rejectOpen.user_id, reason: note } });
      toast.success("Livreur refusé");
      setRejectOpen(null);
      setNote("");
      await reload();
      router.invalidate();
    } catch (e: any) {
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
          Modération des livreurs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Validez ou refusez les candidatures des livreurs partenaires.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={"inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition " +
                (active ? "border-orange-500 bg-orange-500 text-white" : "border-border bg-background text-foreground hover:bg-muted")}>
              {t.label}
              <Badge variant={active ? "secondary" : "outline"} className="rounded-full text-[10px]">
                {counts[t.key]}
              </Badge>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : drivers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          {tab === "pending" ? "Aucune candidature en attente 🎉" : "Aucun livreur dans cette catégorie."}
        </div>
      ) : (
        <ul className="space-y-3">
          {drivers.map((d) => (
            <DriverCard key={d.user_id} d={d}
              onApprove={() => { setNote(""); setApproveOpen(d); }}
              onReject={() => { setNote(""); setRejectOpen(d); }} />
          ))}
        </ul>
      )}

      {/* Approve modal */}
      <Dialog open={!!approveOpen} onOpenChange={(o) => !o && setApproveOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider {approveOpen?.full_name} ?</DialogTitle>
            <DialogDescription>Le livreur pourra commencer à accepter des courses.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setApproveOpen(null)} disabled={submitting}>Annuler</Button>
            <Button type="button" onClick={submitApprove} disabled={submitting}
              className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Check className="mr-1 h-4 w-4" />{submitting ? "Validation…" : "Valider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={!!rejectOpen} onOpenChange={(o) => !o && setRejectOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser {rejectOpen?.full_name}</DialogTitle>
            <DialogDescription>La raison sera visible par le livreur.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {REJECT_REASONS.map((r) => (
              <button key={r} type="button" onClick={() => setNote(r)}
                className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-foreground hover:bg-muted">{r}</button>
            ))}
          </div>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Expliquez pourquoi (visible par le livreur)" rows={4} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectOpen(null)} disabled={submitting}>Annuler</Button>
            <Button type="button" variant="destructive" onClick={submitReject} disabled={submitting || !note.trim()}>
              <Ban className="mr-1 h-4 w-4" />{submitting ? "Refus…" : "Refuser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DriverCard({ d, onApprove, onReject }: { d: Driver; onApprove: () => void; onReject: () => void }) {
  const tone = useMemo(() => {
    if (d.status === "valide") return "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20";
    if (d.status === "rejete") return "border-rose-300 bg-rose-50 dark:bg-rose-950/20";
    return "border-orange-200 bg-orange-50/40 dark:bg-orange-950/10";
  }, [d.status]);

  return (
    <li className={"rounded-2xl border p-4 transition " + tone}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Bike className="h-4 w-4 text-orange-700" />
            <h2 className="truncate font-semibold">{d.full_name}</h2>
            <StatusBadge status={d.status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {d.vehicle_type || "—"}{d.plate_number ? ` · ${d.plate_number}` : ""}
            {" · "}
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{d.city || "—"}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/80">
            <a href={`tel:${d.phone}`} className="inline-flex items-center gap-1 hover:underline">
              <PhoneIcon className="h-3 w-3" /> {d.phone}
            </a>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" /> Soumis {timeAgo(d.created_at)}
            </span>
          </div>
          {d.status !== "en_attente" && d.rejection_reason && (
            <p className="mt-2 rounded-md bg-background/60 px-2 py-1 text-xs text-foreground/80">
              <span className="font-medium">Note : </span>{d.rejection_reason}
            </p>
          )}
          {d.validated_at && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Modéré le {new Date(d.validated_at).toLocaleString("fr-FR")}
            </p>
          )}
        </div>

        {d.status === "en_attente" && (
          <div className="flex shrink-0 gap-2">
            <Button onClick={onApprove} className="bg-emerald-600 text-white hover:bg-emerald-700" size="sm">
              <Check className="mr-1 h-4 w-4" /> Valider
            </Button>
            <Button onClick={onReject} variant="ghost" size="sm"
              className="text-rose-600 hover:bg-rose-100 hover:text-rose-700">
              <X className="mr-1 h-4 w-4" /> Refuser
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: "en_attente" | "valide" | "rejete" }) {
  if (status === "valide") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Validé</Badge>;
  if (status === "rejete") return <Badge variant="destructive">Refusé</Badge>;
  return <Badge variant="outline" className="border-orange-400 text-orange-700">En attente</Badge>;
}
