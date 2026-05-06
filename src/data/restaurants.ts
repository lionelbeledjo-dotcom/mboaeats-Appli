// Vrais restaurants & menus — Cameroun (Douala / Yaoundé).
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

const mamaDoualaDishes: Dish[] = [
  {
    id: "ndole-crevettes",
    name: "Ndolé aux crevettes",
    description: "Ndolé maison crémeux aux crevettes fraîches, plantains et miondo.",
    price: 3500,
    image: dishEru,
    popular: true,
    options: [tailleOptions, pimentOptions],
  },
  {
    id: "poulet-dg-complet",
    name: "Poulet DG complet",
    description: "Poulet sauté, plantains mûrs, carottes, haricots verts et poivron.",
    price: 4200,
    image: dishPouletDg,
    popular: true,
  },
  {
    id: "eru-garri",
    name: "Eru + Garri",
    description: "Eru du Sud-Ouest mijoté à l'huile de palme, accompagné de garri (water fufu).",
    price: 3800,
    image: dishEru,
  },
];

// ===== YAOUNDÉ =====

const goutDuPaysDishes: Dish[] = [
  {
    id: "soya-boeuf-braise",
    name: "Soya de bœuf braisé",
    description: "Brochettes de bœuf marinées au yaji, braisées au feu de bois, oignon et tomate.",
    price: 3000,
    image: dishSuya,
    spicy: true,
    popular: true,
    options: [pimentOptions],
  },
  {
    id: "koki",
    name: "Koki maison",
    description: "Pâte de haricots cornilles cuite à la feuille de bananier, huile de palme.",
    price: 2500,
    image: dishEru,
  },
  {
    id: "pile-plantain",
    name: "Pilé de plantain",
    description: "Plantain pilé onctueux servi avec sauce jaune et viande mijotée.",
    price: 3200,
    image: dishPouletDg,
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
    id: "bobolo",
    name: "Bobolo",
    description: "Bâton de manioc fermenté, cuit à la feuille — l'accompagnement traditionnel.",
    price: 2500,
    image: dishEru,
  },
  {
    id: "sanga",
    name: "Sanga (maïs & manioc)",
    description: "Maïs frais, feuilles de manioc et arachide — plat ancestral camerounais.",
    price: 2800,
    image: dishEru,
  },
];

export const restaurants: Restaurant[] = [
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
    id: "chez-mama-douala",
    name: "Chez Mama Douala",
    tagline: "La maison du vrai goût — Akwa, Douala",
    city: "Douala",
    neighborhood: "Akwa",
    rating: 4.9,
    eta: "20-30 min",
    cover: dishPouletDg,
    badge: "Populaire",
    categories: [
      { id: "plats", label: "Plats du jour", dishes: mamaDoualaDishes },
    ],
  },
  {
    id: "le-gout-du-pays",
    name: "Le Goût du Pays",
    tagline: "Tradition & terroir — Bastos, Yaoundé",
    city: "Yaoundé",
    neighborhood: "Bastos",
    rating: 4.8,
    eta: "25-35 min",
    cover: dishSuya,
    badge: "Authentique",
    categories: [
      { id: "grill", label: "Grillades", dishes: [goutDuPaysDishes[0]] },
      { id: "tradition", label: "Tradition", dishes: goutDuPaysDishes.slice(1) },
    ],
  },
  {
    id: "village-akwa",
    name: "Village Akwa",
    tagline: "Poisson du Wouri & Bobolo — Omnisports, Yaoundé",
    city: "Yaoundé",
    neighborhood: "Omnisports",
    rating: 4.7,
    eta: "30-40 min",
    cover: dishPoisson,
    badge: "Terroir",
    categories: [
      { id: "poissons", label: "Poissons braisés", dishes: [villageAkwaDishes[0]] },
      { id: "accompagnements", label: "Accompagnements & traditions", dishes: villageAkwaDishes.slice(1) },
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
