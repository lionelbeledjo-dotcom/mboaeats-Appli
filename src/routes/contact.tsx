import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, MessageCircle, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — MboaEats" },
      { name: "description", content: "Contactez l'équipe MboaEats par e-mail, téléphone ou WhatsApp." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="glass border-b border-border/40">
        <div className="mx-auto max-w-md px-4 py-4 flex items-center gap-3">
          <Link to="/" aria-label="Retour" className="rounded-full border border-border bg-surface/60 p-2">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-lg font-bold">Contact</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Besoin d'aide ou d'un partenariat ? Notre équipe vous répond en moins de 24 h.
        </p>

        <a
          href="mailto:lionelbrown2728@yahoo.fr"
          className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 to-accent/10 p-4 shadow-glow transition hover:scale-[1.01]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
            <Mail className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">E-mail officiel</p>
            <p className="font-semibold">lionelbrown2728@yahoo.fr</p>
          </div>
        </a>

        <a
          href="https://wa.me/237600000000"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface/60 p-4 transition hover:border-primary/60"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">WhatsApp Support</p>
            <p className="font-semibold">+237 6 00 00 00 00</p>
          </div>
        </a>

        <a
          href="tel:+237600000000"
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface/60 p-4 transition hover:border-primary/60"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Phone className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Appel direct</p>
            <p className="font-semibold">+237 6 00 00 00 00</p>
          </div>
        </a>

        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-primary" /> Siège social
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            MboaEats Cameroun · Akwa, Douala<br />
            Ouvert 7j/7 — 8h à 23h
          </p>
        </div>

        <div className="pt-2">
          <Link to="/aide" className="block w-full rounded-full border border-border bg-surface/60 py-3 text-center text-sm font-semibold">
            Consulter le centre d'aide & FAQ
          </Link>
        </div>
      </main>
    </div>
  );
}
