// Mock data for the restaurants & dishes (used by /restaurants/* routes).
import dishEru from "@/assets/dish-eru.jpg";
import dishPoisson from "@/assets/dish-poisson.jpg";
import dishPouletDg from "@/assets/dish-poulet-dg.jpg";
import dishSuya from "@/assets/dish-suya.jpg";

export type Dish = {
  id: string;
  name: string;
  description: string;
  price: number; // FCFA
  image: string;
  spicy?: boolean;
  popular?: boolean;
  options?: { label: string; choices: { name: string; extra?: number }[] }[];
};

export type Restaurant = {
  id: string;
  name: string;
  tagline: string;
  city: string;
  rating: number;
  eta: string;
  cover: string;
  categories: { id: string; label: string; dishes: Dish[] }[];
};

const mamaBiyaDishes: Dish[] = [
  {
    id: "ndole-plantain",
    name: "Ndolé + Plantain",
    description:
      "Ndolé maison aux arachides et crevettes, accompagné de plantains mûrs frits à la perfection.",
    price: 3500,
    image: dishEru,
    popular: true,
    options: [
      {
        label: "Taille",
        choices: [
          { name: "Normal" },
          { name: "Grand", extra: 1000 },
        ],
      },
      {
        label: "Protéine",
        choices: [
          { name: "Crevettes" },
          { name: "Bœuf", extra: 500 },
          { name: "Poisson fumé", extra: 700 },
        ],
      },
      {
        label: "Piment",
        choices: [{ name: "Doux" }, { name: "Moyen" }, { name: "Fort 🌶️" }],
      },
    ],
  },
  {
    id: "poulet-dg",
    name: "Poulet DG",
    description: "Poulet sauté aux légumes croquants et plantains, sauce maison épicée.",
    price: 4500,
    image: dishPouletDg,
    spicy: true,
  },
  {
    id: "poisson-braise",
    name: "Poisson Braisé",
    description: "Bar entier braisé au feu de bois, miondo et sauce tomate pimentée.",
    price: 5000,
    image: dishPoisson,
  },
  {
    id: "suya",
    name: "Suya de Bœuf",
    description: "Brochettes de bœuf marinées aux épices Yaji, oignon et tomate fraîche.",
    price: 2500,
    image: dishSuya,
    spicy: true,
  },
];

export const restaurants: Restaurant[] = [
  {
    id: "chez-mama-biya",
    name: "Chez Mama Biya",
    tagline: "La maison du vrai Ndolé — Akwa, Douala",
    city: "Douala",
    rating: 4.9,
    eta: "20-30 min",
    cover: dishEru,
    categories: [
      { id: "signatures", label: "Signatures", dishes: mamaBiyaDishes.slice(0, 2) },
      { id: "grillades", label: "Grillades", dishes: mamaBiyaDishes.slice(2) },
    ],
  },
  {
    id: "le-foufou-royal",
    name: "Le Foufou Royal",
    tagline: "Spécialités traditionnelles — Bastos, Yaoundé",
    city: "Yaoundé",
    rating: 4.7,
    eta: "25-35 min",
    cover: dishPouletDg,
    categories: [{ id: "all", label: "Au menu", dishes: mamaBiyaDishes }],
  },
  {
    id: "suya-master",
    name: "Suya Master",
    tagline: "Le roi du Suya — Bafoussam centre",
    city: "Bafoussam",
    rating: 4.8,
    eta: "15-25 min",
    cover: dishSuya,
    categories: [{ id: "grill", label: "Au grill", dishes: [mamaBiyaDishes[3], mamaBiyaDishes[1]] }],
  },
];

export function getRestaurant(id: string) {
  return restaurants.find((r) => r.id === id);
}

export function getDish(restoId: string, dishId: string) {
  const resto = getRestaurant(restoId);
  if (!resto) return null;
  for (const cat of resto.categories) {
    const d = cat.dishes.find((x) => x.id === dishId);
    if (d) return { restaurant: resto, dish: d };
  }
  return null;
}
