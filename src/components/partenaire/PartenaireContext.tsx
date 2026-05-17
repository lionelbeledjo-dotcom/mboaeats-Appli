import { createContext, useContext } from "react";

export type PartenaireResto = {
  id: string;
  name: string;
  slug: string;
  cuisine: string | null;
  city: string | null;
  neighborhood: string | null;
  image_url: string | null;
  is_open: boolean | null;
  is_active: boolean | null;
  role: "owner" | "manager" | "staff" | "kitchen";
};

type Ctx = {
  restos: PartenaireResto[];
  active: PartenaireResto;
  setActiveId: (id: string) => void;
  reload: () => Promise<void>;
};

export const PartenaireCtx = createContext<Ctx | null>(null);

export function usePartenaire() {
  const c = useContext(PartenaireCtx);
  if (!c) throw new Error("usePartenaire must be used inside /partenaire");
  return c;
}
