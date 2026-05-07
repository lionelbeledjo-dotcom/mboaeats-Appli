export type Order = {
  id: string;
  resto: string;
  items: string[];
  total: number;
  status: "en_cours" | "livree" | "annulee";
  date: string;
  eta?: string;
};

export const orders: Order[] = [
  {
    id: "MBE-2106",
    resto: "Chez Mama Douala",
    items: ["Ndolé aux crevettes", "Jus de bissap"],
    total: 4300,
    status: "en_cours",
    date: "Aujourd'hui · 12:34",
    eta: "12 min",
  },
  {
    id: "MBE-2089",
    resto: "Le Village Akwa",
    items: ["Poisson braisé du Wouri", "Bobolo"],
    total: 7000,
    status: "livree",
    date: "Hier · 19:48",
  },
  {
    id: "MBE-2061",
    resto: "Saga Africa",
    items: ["Ndolé Royal", "Crevettes grillées"],
    total: 10500,
    status: "livree",
    date: "3 mai · 13:12",
  },
];

export function countActiveOrders() {
  return orders.filter((o) => o.status === "en_cours").length;
}
