import { useEffect, useMemo, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { HelpCircle, MessageCircle, Mail, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SECTIONS,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  getSectionForPath,
  type HelpSection,
} from "@/data/aide-faq";

const VISITED_KEY = "mboatv:aide:visited";

function readVisited(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(VISITED_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function writeVisited(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VISITED_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

interface AideContextuelleProps {
  /** Force une section spécifique (ex: "connexion"). Sinon, détection auto. */
  sectionKey?: keyof typeof SECTIONS;
  /** Trigger personnalisé. Sinon : bouton "?" rond. */
  children?: React.ReactNode;
  /** Position fixe en haut à droite (par défaut, en flux normal). */
  floating?: boolean;
  className?: string;
}

export function AideContextuelle({
  sectionKey,
  children,
  floating = false,
  className,
}: AideContextuelleProps) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  const section: HelpSection = useMemo(
    () => (sectionKey ? SECTIONS[sectionKey] : getSectionForPath(location.pathname)),
    [sectionKey, location.pathname]
  );

  // Badge "première visite" : affiché tant que l'utilisateur n'a pas ouvert
  // le panneau d'aide pour cette section.
  useEffect(() => {
    const visited = readVisited();
    setIsFirstVisit(!visited.has(section.key));
  }, [section.key]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && isFirstVisit) {
      const visited = readVisited();
      visited.add(section.key);
      writeVisited(visited);
      setIsFirstVisit(false);
    }
  };

  const waMessage = encodeURIComponent(
    `Bonjour MboaTV, j'ai une question sur ${section.title} : ${section.description}.`
  );
  const waLink = `https://wa.me/${SUPPORT_PHONE}?text=${waMessage}`;
  const mailLink = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `Aide — ${section.title}`
  )}&body=${encodeURIComponent(
    `Bonjour MboaTV,\n\nJ'ai une question sur ${section.title} (${section.description}).\n\n`
  )}`;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {children ?? (
          <button
            type="button"
            aria-label={`Besoin d'aide sur ${section.title}`}
            className={cn(
              "relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition-transform hover:scale-110 active:scale-95",
              floating && "fixed top-3 right-16 z-50 sm:right-20 sm:top-4",
              className
            )}
          >
            <HelpCircle className="h-5 w-5" />
            {isFirstVisit && (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500 ring-2 ring-background" />
              </span>
            )}
          </button>
        )}
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-[400px]"
      >
        <div className="border-b border-border bg-gradient-to-br from-orange-500/10 to-transparent p-6">
          <SheetHeader className="space-y-2 text-left">
            <SheetTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/15 text-orange-500">
                <HelpCircle className="h-4 w-4" />
              </span>
              Besoin d'aide sur {section.title} ?
            </SheetTitle>
            <SheetDescription>
              {section.intro ??
                "Voici les réponses les plus fréquentes. Si vous ne trouvez pas, contactez-nous, on vous aide en quelques minutes."}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="space-y-4 p-6">
          <Accordion type="single" collapsible className="w-full">
            {section.faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`}>
                <AccordionTrigger className="text-left text-sm font-medium">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="whitespace-pre-line text-sm text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Toujours besoin d'aide ?
            </p>
            <div className="flex flex-col gap-2">
              <Button
                asChild
                className="w-full justify-between bg-[#25D366] text-white hover:bg-[#25D366]/90"
              >
                <a href={waLink} target="_blank" rel="noreferrer">
                  <span className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Contacter sur WhatsApp
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <a href={mailLink}>
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Envoyer un email
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Réponse moyenne : moins de 30 minutes (9h–22h)
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default AideContextuelle;
