// Vrais restaurants & menus — Cameroun (Douala / Yaoundé).
import dishEru from "@/assets/dish-eru.webp";
import dishPoisson from "@/assets/dish-poisson.webp";
import dishPouletDg from "@/assets/dish-poulet-dg.webp";
import dishSuya from "@/assets/dish-suya.webp";

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
  neighborhood: string;
  rating: number;
  eta: string;
  cover: string;
  badge?: string;
  categories: { id: string; label: string; dishes: Dish[] }[];
};

const tailleOptions = {
  label: "Taille",
  choices: [{ name: "Normal" }, { name: "Grand", extra: 1000 }],
};
const pimentOptions = {
  label: "Piment",
  choices: [{ name: "Doux" }, { name: "Moyen" }, { name: "Fort 🌶️" }],
};

// ===== DOUALA =====

const lePenjaDishes: Dish[] = [
  {
    id: "ndole-royal",
    name: "Ndolé Royal aux gambas",
    description: "Ndolé gastronomique aux gambas sauvages, pâte d'arachide fraîche et miondo artisanal.",
    price: 6500,
    image: dishEru,
    popular: true,
    options: [tailleOptions, pimentOptions],
  },
  {
    id: "poulet-dg-truffe",
    name: "Poulet DG signature",
    description: "Poulet fermier sauté, plantains caramélisés, légumes croquants — recette du chef.",
    price: 5500,
    image: dishPouletDg,
  },
  {
    id: "bar-braise-penja",
    name: "Bar braisé poivre de Penja",
    description: "Bar entier braisé au feu de bois, relevé au poivre blanc de Penja AOP.",
    price: 7500,
    image: dishPoisson,
    popular: true,
  },
];

const sagaAfricaDishes: Dish[] = [
  {
    id: "ndole-royal-saga",
    name: "Ndolé Royal",
    description: "Le classique de la maison : ndolé crémeux, crevettes et viande, plantains mûrs.",
    price: 5000,
    image: dishEru,
    popular: true,
    options: [tailleOptions, pimentOptions],
  },
  {
    id: "capitaine-braise",
    name: "Capitaine braisé entier",
    description: "Capitaine du Wouri braisé, sauce tomate pimentée, bobolo et alloco.",
    price: 6000,
    image: dishPoisson,
    spicy: true,
  },
  {
    id: "crevettes-grillees",
    name: "Crevettes grillées sauce maison",
    description: "Grosses crevettes grillées, beurre citronné et riz parfumé.",
    price: 5500,
    image: dishSuya,
  },
];

const mamaBelloDishes: Dish[] = [
  {
    id: "ndole-complet",
    name: "Ndolé complet",
    description: "Feuilles de ndolé, arachides, poisson fumé, viande de bœuf et plantain.",
    price: 3500,
    image: dishEru,
    popular: true,
    options: [tailleOptions, pimentOptions],
  },
  {
    id: "poulet-dg",
    name: "Poulet DG",
    description: "Poulet sauté aux légumes, plantains dorés et épices camerounaises.",
    price: 3500,
    image: dishPouletDg,
    popular: true,
  },
  {
    id: "soya-braise",
    name: "Soya braisé",
    description: "Viande de soya mijotée dans une sauce épicée, accompagnée de plantain.",
    price: 3500,
    image: dishSuya,
    spicy: true,
  },
];

const mamaDoualaDishes: Dish[] = [
  {
    id: "ndole-crevettes",
    name: "Ndolé aux crevettes",
    description: "Ndolé maison crémeux aux crevettes fraîches, plantains et miondo.",
    price: 3000,
    image: dishEru,
    popular: true,
    options: [tailleOptions, pimentOptions],
  },
  {
    id: "poulet-braise-alloco",
    name: "Poulet braisé + Alloco",
    description: "Demi-poulet braisé au feu de bois, alloco caramélisé et piment maison.",
    price: 3000,
    image: dishPouletDg,
    popular: true,
  },
  {
    id: "eru-garri",
    name: "Eru + Garri",
    description: "Eru du Sud-Ouest mijoté à l'huile de palme, accompagné de garri (water fufu).",
    price: 2500,
    image: dishEru,
  },
];

// ===== YAOUNDÉ =====

const goutDuPaysDishes: Dish[] = [
  {
    id: "pack-soya-alloco-bissap",
    name: "Pack Soya + Alloco + Jus de Bissap",
    description: "Brochettes de bœuf au yaji, alloco caramélisé et jus de bissap maison — formule complète.",
    price: 6500,
    image: dishSuya,
    popular: true,
    spicy: true,
    options: [pimentOptions],
  },
  {
    id: "soya-boeuf-braise",
    name: "Soya de bœuf braisé",
    description: "Brochettes de bœuf marinées au yaji, braisées au feu de bois, oignon et tomate.",
    price: 3000,
    image: dishSuya,
    spicy: true,
    options: [pimentOptions],
  },
  {
    id: "alloco",
    name: "Alloco maison",
    description: "Plantain mûr frit à l'huile de palme, sauce piment-tomate fraîche.",
    price: 1500,
    image: dishPouletDg,
  },
  {
    id: "jus-bissap",
    name: "Jus de Bissap",
    description: "Infusion fraîche d'hibiscus, gingembre et menthe — boisson traditionnelle.",
    price: 1000,
    image: dishEru,
  },
];

const villageAkwaDishes: Dish[] = [
  {
    id: "poisson-braise-wouri",
    name: "Poisson braisé du Wouri",
    description: "Poisson frais du Wouri braisé au feu de bois, sauce tomate-piment et bobolo.",
    price: 4500,
    image: dishPoisson,
    popular: true,
    options: [pimentOptions],
  },
  {
    id: "eru-garri-village",
    name: "Eru + Garri",
    description: "Eru du Sud-Ouest mijoté à l'huile de palme, accompagné de garri (water fufu).",
    price: 2000,
    image: dishEru,
    popular: true,
  },
  {
    id: "bobolo",
    name: "Bobolo",
    description: "Bâton de manioc fermenté, cuit à la feuille — l'accompagnement traditionnel.",
    price: 1500,
    image: dishEru,
  },
];

const braiserieWouriDishes: Dish[] = [
  {
    id: "maquereau-braise",
    name: "Maquereau braisé du Wouri",
    description: "Maquereau frais braisé au feu de bois, marinade ail-gingembre, alloco et piment.",
    price: 4000,
    image: dishPoisson,
    popular: true,
    spicy: true,
    options: [pimentOptions],
  },
  {
    id: "soya-boeuf-braiserie",
    name: "Soya de bœuf à la braise",
    description: "Brochettes de bœuf au yaji épicé, grillées sur charbon de bois, oignons crus.",
    price: 2500,
    image: dishSuya,
    popular: true,
    spicy: true,
  },
  {
    id: "ndole-braiserie",
    name: "Ndolé maison aux crevettes",
    description: "Ndolé crémeux, crevettes du Wouri, viande braisée et plantain mûr.",
    price: 4500,
    image: dishEru,
    options: [tailleOptions],
  },
];

export const restaurants: Restaurant[] = [
  {
    id: "la-braiserie-du-wouri",
    name: "La Braiserie du Wouri",
    tagline: "Poissons & soya au feu de bois — Bonanjo, Douala",
    city: "Douala",
    neighborhood: "Bonanjo",
    rating: 4.8,
    eta: "20-30 min",
    cover: dishPoisson,
    badge: "Feu de bois",
    categories: [
      { id: "braise", label: "Spécialités braisées", dishes: braiserieWouriDishes.slice(0, 2) },
      { id: "tradition", label: "Tradition camerounaise", dishes: braiserieWouriDishes.slice(2) },
    ],
  },
  {
    id: "le-penja",
    name: "Le Penja",
    tagline: "Cuisine gastronomique camerounaise — Bonapriso, Douala",
    city: "Douala",
    neighborhood: "Bonapriso",
    rating: 4.9,
    eta: "30-40 min",
    cover: dishPoisson,
    badge: "Gastronomique",
    categories: [
      { id: "signatures", label: "Signatures du chef", dishes: lePenjaDishes.slice(0, 2) },
      { id: "mer", label: "Produits de la mer", dishes: lePenjaDishes.slice(2) },
    ],
  },
  {
    id: "saga-africa",
    name: "Saga Africa",
    tagline: "Poissons braisés & Ndolé royal — Akwa, Douala",
    city: "Douala",
    neighborhood: "Akwa",
    rating: 4.8,
    eta: "25-35 min",
    cover: dishEru,
    badge: "Top resto",
    categories: [
      { id: "ndole", label: "Spécialités Ndolé", dishes: [sagaAfricaDishes[0]] },
      { id: "grillades", label: "Grillades & poissons", dishes: sagaAfricaDishes.slice(1) },
    ],
  },
  {
    id: "chez-mama-bello",
    name: "Chez Mama Bello",
    tagline: "Saveurs du Cameroun — Akwa, Douala",
    city: "Douala",
    neighborhood: "Akwa",
    rating: 4.8,
    eta: "25 min",
    cover: dishPouletDg,
    badge: "Populaire",
    categories: [
      { id: "populaires", label: "Populaires", dishes: mamaBelloDishes },
    ],
  },
  {
    id: "chez-mama-douala",
    name: "Chez Mama Douala",
    tagline: "Ndolé crevettes & Poulet braisé — Bonapriso, Douala",
    city: "Douala",
    neighborhood: "Bonapriso",
    rating: 4.7,
    eta: "20-30 min",
    cover: dishEru,
    badge: "Maison",
    categories: [
      { id: "plats", label: "Plats du jour", dishes: mamaDoualaDishes },
    ],
  },
  {
    id: "le-gout-du-pays",
    name: "Le Goût du Pays",
    tagline: "Soya, Alloco & Jus de Bissap — Bastos, Yaoundé",
    city: "Yaoundé",
    neighborhood: "Bastos",
    rating: 4.8,
    eta: "25-35 min",
    cover: dishSuya,
    badge: "Authentique",
    categories: [
      { id: "packs", label: "Packs signature", dishes: [goutDuPaysDishes[0]] },
      { id: "grill", label: "Grillades & accompagnements", dishes: goutDuPaysDishes.slice(1) },
    ],
  },
  {
    id: "village-akwa",
    name: "Le Village Akwa",
    tagline: "Poisson du Wouri & Eru + Garri — Akwa, Douala",
    city: "Douala",
    neighborhood: "Akwa",
    rating: 4.7,
    eta: "25-35 min",
    cover: dishPoisson,
    badge: "Terroir",
    categories: [
      { id: "poissons", label: "Poissons braisés", dishes: [villageAkwaDishes[0]] },
      { id: "tradition", label: "Tradition camerounaise", dishes: villageAkwaDishes.slice(1) },
    ],
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
