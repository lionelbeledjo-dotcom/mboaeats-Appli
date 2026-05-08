import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";

export const Route = createFileRoute("/cgu")({
  head: () => ({
    meta: [
      { title: "Conditions Générales d'Utilisation — MboaEats" },
      { name: "description", content: "Conditions générales d'utilisation de la plateforme MboaEats." },
    ],
  }),
  component: CguPage,
});

function CguPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-black">
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>
        <div className="mt-8 mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
            <FileText className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Conditions Générales d'Utilisation</h1>
        </div>
        <div className="space-y-6 text-sm leading-relaxed text-neutral-700">
          <section>
            <h2 className="mb-2 text-base font-bold text-black">1. Objet</h2>
            <p>Les présentes CGU régissent l'utilisation de la plateforme MboaEats, service de livraison de repas et de mise en relation entre restaurants partenaires, livreurs et clients.</p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-black">2. Compte utilisateur</h2>
            <p>L'inscription est gratuite. L'utilisateur s'engage à fournir des informations exactes et à protéger ses identifiants. Toute activité effectuée depuis son compte est sous sa responsabilité.</p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-black">3. Commandes & paiement</h2>
            <p>Les commandes sont fermes dès validation. Les paiements sont sécurisés via MTN Mobile Money, Orange Money ou carte bancaire. MboaEats ne stocke aucune donnée bancaire.</p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-black">4. Livraison</h2>
            <p>Les délais de livraison sont indicatifs. En cas de problème, contactez le support via la rubrique Aide.</p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-black">5. Responsabilité</h2>
            <p>MboaEats agit comme intermédiaire technique. La qualité des repas relève des restaurants partenaires.</p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-black">6. Contact</h2>
            <p>Pour toute question : <Link to="/contact" className="underline">contactez-nous</Link>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
