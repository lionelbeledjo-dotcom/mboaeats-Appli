// Vrais restaurants & menus — Cameroun (Douala / Yaoundé).
import dishEru from "@/assets/dish-eru.webp";
import dishNdole from "@/assets/dish-ndole.webp";
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
    image: dishNdole,
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
    image: dishNdole,
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
    image: dishNdole,
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
    image: dishNdole,
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
    image: dishNdole,
    options: [tailleOptions],
  },
];

// ===== ENTRÉES (Le Penja) =====
const entreesPenja: Dish[] = [
  { id: "accras-macabo", name: "Accras de macabo", description: "Beignets croustillants de macabo râpé, cœur moelleux, sauce piment maison.", price: 2500, image: dishPouletDg, popular: true },
  { id: "crevettes-kribi", name: "Entrée de crevettes de Kribi", description: "Crevettes sauvages de Kribi sautées à l'ail, gingembre et citron vert.", price: 4500, image: dishSuya, popular: true },
  { id: "salade-avocat-ouest", name: "Salade d'avocat de l'Ouest", description: "Avocats fondants des Bamboutos, tomates, oignon rouge, vinaigrette à l'huile de palmiste.", price: 2800, image: dishEru },
];

// ===== KOKI & ACCOMPAGNEMENTS (Yaoundé) =====
const accompagnementsYaounde: Dish[] = [
  { id: "koki-haricots-rouges", name: "Koki de haricots rouges", description: "Pâte de haricots rouges cuite à la vapeur dans la feuille de bananier, huile de palme.", price: 2000, image: dishEru, popular: true },
  { id: "miondo", name: "Miondo", description: "Bâtons de manioc fins fermentés, cuits à la feuille.", price: 800, image: dishEru },
  { id: "macabo-rape", name: "Macabo râpé", description: "Macabo râpé cuit à la vapeur, beurre fondu et sel marin.", price: 1200, image: dishPouletDg },
  { id: "alloco-yaounde", name: "Plantain mûr frit (Alloco)", description: "Plantain bien mûr frit, croustillant dehors, fondant dedans.", price: 1500, image: dishPouletDg },
];

// ===== 10 NOUVEAUX RESTAURANTS DOUALA =====

const okokutDishes: Dish[] = [
  { id: "ok-poulet-braise", name: "Poulet braisé entier", description: "Poulet entier mariné aux herbes locales, braisé au feu de bois.", price: 6500, image: dishPouletDg, popular: true, options: [pimentOptions] },
  { id: "ok-soya-piquant", name: "Soya piquant maison", description: "Brochettes de bœuf au yaji, oignons et tomates frais.", price: 2500, image: dishSuya, spicy: true, options: [pimentOptions] },
  { id: "ok-poisson-braise", name: "Poisson braisé piment vert", description: "Bar entier braisé, sauce piment vert et bobolo.", price: 5500, image: dishPoisson, popular: true },
  { id: "ok-ndole-classique", name: "Ndolé classique", description: "Ndolé feuilles, arachides, viande de bœuf et plantain mûr.", price: 4000, image: dishNdole, options: [tailleOptions] },
  { id: "ok-eru-water-fufu", name: "Eru + Water Fufu", description: "Eru du Sud-Ouest mijoté à l'huile de palme, water fufu maison.", price: 3500, image: dishEru },
  { id: "ok-alloco-poulet", name: "Alloco + Ailes de poulet", description: "Alloco caramélisé et ailes de poulet épicées.", price: 3000, image: dishPouletDg },
];

const lOvalieDishes: Dish[] = [
  { id: "ov-cote-boeuf", name: "Côte de bœuf grillée", description: "Côte de bœuf maturée, grillée à la braise, sauce poivre de Penja.", price: 9500, image: dishSuya, popular: true },
  { id: "ov-burger-mboa", name: "Burger Mboa", description: "Pain brioché, steak haché 200g, cheddar fondant, sauce maison, frites de plantain.", price: 5500, image: dishPouletDg, popular: true },
  { id: "ov-poulet-fermier", name: "Poulet fermier rôti", description: "Demi poulet fermier rôti, jus corsé, gratin de macabo.", price: 6000, image: dishPouletDg },
  { id: "ov-tartare-boeuf", name: "Tartare de bœuf au couteau", description: "Bœuf coupé au couteau, câpres, échalotes, jaune d'œuf, frites maison.", price: 6500, image: dishSuya },
  { id: "ov-saumon-grille", name: "Pavé de saumon grillé", description: "Saumon Atlantique grillé, légumes croquants, beurre citronné.", price: 7500, image: dishPoisson },
  { id: "ov-cesar", name: "Salade César au poulet", description: "Romaine, poulet grillé, parmesan, croûtons, sauce César maison.", price: 4500, image: dishEru },
  { id: "ov-tiramisu", name: "Tiramisu maison", description: "Mascarpone, café Robusta du Cameroun, biscuit cuillère et cacao.", price: 2500, image: dishEru },
];

const penjaPoivreDishes: Dish[] = [
  { id: "pp-magret-canard", name: "Magret de canard sauce Penja", description: "Magret rosé, sauce poivre blanc de Penja AOP, écrasé de macabo.", price: 8500, image: dishSuya, popular: true },
  { id: "pp-crevettes-ail", name: "Crevettes sautées à l'ail", description: "Grosses crevettes sautées ail-persil, riz parfumé.", price: 6500, image: dishSuya, popular: true },
  { id: "pp-bar-ligne", name: "Bar de ligne aux herbes", description: "Bar entier aux herbes fraîches, citron confit et légumes vapeur.", price: 8000, image: dishPoisson },
  { id: "pp-ndole-gambas", name: "Ndolé aux gambas", description: "Ndolé crémeux, gambas sauvages et miondo artisanal.", price: 6000, image: dishNdole, options: [tailleOptions] },
  { id: "pp-risotto-cep", name: "Risotto aux cèpes", description: "Risotto crémeux, cèpes poêlés, parmesan affiné 24 mois.", price: 5500, image: dishEru },
  { id: "pp-creme-brulee", name: "Crème brûlée vanille", description: "Crème onctueuse à la vanille de Madagascar, caramel craquant.", price: 2500, image: dishEru },
];

const wouriBistroDishes: Dish[] = [
  { id: "wb-capitaine-bananes", name: "Capitaine sauce bananes", description: "Capitaine du Wouri, sauce bananes vertes pimentée, bobolo.", price: 5000, image: dishPoisson, popular: true, spicy: true },
  { id: "wb-poulet-citronnelle", name: "Poulet citronnelle-gingembre", description: "Poulet mariné citronnelle-gingembre, riz au coco.", price: 4500, image: dishPouletDg },
  { id: "wb-soya-mouton", name: "Soya de mouton braisé", description: "Brochettes de mouton au yaji, oignons rouges, tomates.", price: 3500, image: dishSuya, spicy: true, options: [pimentOptions] },
  { id: "wb-ndole-bistro", name: "Ndolé bistro royal", description: "Ndolé crevettes-bœuf, plantain mûr et miondo.", price: 4500, image: dishNdole, options: [tailleOptions] },
  { id: "wb-accras-crevettes", name: "Accras de crevettes", description: "Beignets de crevettes croustillants, sauce piment maison.", price: 2800, image: dishPouletDg, popular: true },
  { id: "wb-jus-gingembre", name: "Jus de gingembre frais", description: "Gingembre frais pressé, citron vert et un soupçon de menthe.", price: 1200, image: dishEru },
];

const bonaberiGrillDishes: Dish[] = [
  { id: "bg-poulet-yassa", name: "Poulet Yassa", description: "Poulet mariné citron-oignons, longuement mijoté, riz blanc.", price: 4000, image: dishPouletDg, popular: true },
  { id: "bg-tilapia-braise", name: "Tilapia entier braisé", description: "Tilapia frais braisé, sauce tomate piment, alloco.", price: 4500, image: dishPoisson, popular: true, options: [pimentOptions] },
  { id: "bg-suya-mixte", name: "Suya mixte (bœuf-poulet)", description: "Brochettes mixtes au yaji, oignons crus.", price: 3500, image: dishSuya, spicy: true },
  { id: "bg-poisson-fume-pile", name: "Poisson fumé pilé", description: "Poisson fumé, sauce arachide et bâton de manioc.", price: 3500, image: dishPoisson },
  { id: "bg-okok-bobolo", name: "Okok au bobolo", description: "Feuilles d'okok pilées, arachides et bobolo traditionnel.", price: 3000, image: dishEru },
  { id: "bg-jus-corossol", name: "Jus de corossol", description: "Pulpe de corossol mixée, lait, sucre roux.", price: 1500, image: dishEru },
];

const mamiNyangaDishes: Dish[] = [
  { id: "mn-poisson-pile", name: "Poisson pilé sauce arachide", description: "Spécialité côtière : poisson pilé, sauce arachide, bâton de manioc.", price: 3500, image: dishPoisson, popular: true },
  { id: "mn-mbongo", name: "Mbongo Tchobi", description: "Sauce noire pimentée aux épices traditionnelles, poisson ou viande.", price: 4000, image: dishNdole, spicy: true, popular: true, options: [pimentOptions] },
  { id: "mn-kondre", name: "Kondré de chèvre", description: "Ragoût de chèvre, plantain non mûr et épices de l'Ouest.", price: 4500, image: dishPouletDg },
  { id: "mn-eru-traditionnel", name: "Eru traditionnel", description: "Eru du Sud-Ouest, water fufu, peau de bœuf.", price: 3000, image: dishEru },
  { id: "mn-koki-mais", name: "Koki de maïs", description: "Pâte de maïs cuite à la vapeur dans la feuille, huile de palme.", price: 2000, image: dishEru },
  { id: "mn-bissap-glace", name: "Bissap glacé maison", description: "Hibiscus, gingembre, menthe et glace pilée.", price: 1000, image: dishEru },
];

const akwaPalaceDishes: Dish[] = [
  { id: "ap-buffet-mboa", name: "Buffet Mboa Royal", description: "Plateau découverte : ndolé, eru, soya, alloco, plantain et riz parfumé.", price: 8500, image: dishNdole, popular: true, options: [tailleOptions] },
  { id: "ap-langouste-grillee", name: "Langouste grillée beurre citron", description: "Langouste fraîche grillée, beurre citron, riz pilaf.", price: 12000, image: dishPoisson, popular: true },
  { id: "ap-filet-boeuf", name: "Filet de bœuf sauce poivre", description: "Filet 220g rosé, sauce poivre vert, gratin dauphinois.", price: 8500, image: dishSuya },
  { id: "ap-poulet-coco", name: "Poulet sauce coco", description: "Poulet fermier mijoté, sauce coco-curry, riz basmati.", price: 5500, image: dishPouletDg },
  { id: "ap-crevettes-flambees", name: "Crevettes flambées au whisky", description: "Gambas flambées au whisky, ail et persil.", price: 7500, image: dishSuya },
  { id: "ap-fondant-choco", name: "Fondant au chocolat", description: "Cœur coulant chocolat noir 70%, glace vanille.", price: 2800, image: dishEru },
];

const bonapriroBistroDishes: Dish[] = [
  { id: "bb-poulet-arachide", name: "Poulet sauce arachide", description: "Poulet fermier dans sauce arachide onctueuse, riz blanc.", price: 4500, image: dishPouletDg, popular: true },
  { id: "bb-ndole-poisson", name: "Ndolé au poisson fumé", description: "Ndolé classique aux arachides, poisson fumé du Wouri.", price: 4000, image: dishNdole, options: [tailleOptions] },
  { id: "bb-kati-kati", name: "Kati Kati de poulet", description: "Spécialité du Nord-Ouest : poulet grillé puis mijoté à l'huile de palme.", price: 4500, image: dishPouletDg, popular: true },
  { id: "bb-soya-foie", name: "Soya de foie de bœuf", description: "Brochettes de foie de bœuf au yaji, alloco.", price: 2500, image: dishSuya, spicy: true },
  { id: "bb-poisson-roti", name: "Poisson rôti aux légumes", description: "Maquereau rôti, légumes du marché et igname.", price: 3500, image: dishPoisson },
  { id: "bb-jus-tamarin", name: "Jus de tamarin", description: "Tamarin frais, gingembre et un peu de citron.", price: 1000, image: dishEru },
];

const douaInternationalDishes: Dish[] = [
  { id: "di-pizza-mboa", name: "Pizza Mboa (poulet DG)", description: "Pâte fine maison, sauce tomate, poulet DG, plantain et fromage fondu.", price: 5500, image: dishPouletDg, popular: true },
  { id: "di-pizza-margherita", name: "Pizza Margherita", description: "Sauce tomate San Marzano, mozzarella fior di latte, basilic frais.", price: 4500, image: dishPouletDg },
  { id: "di-burger-double", name: "Double cheeseburger", description: "Deux steaks 100g, double cheddar, oignons confits, frites.", price: 5000, image: dishSuya, popular: true },
  { id: "di-pates-crevettes", name: "Pâtes aux crevettes", description: "Linguine, crevettes, ail-persil, tomates cerises.", price: 5500, image: dishSuya },
  { id: "di-poulet-cesar", name: "Wrap poulet César", description: "Tortilla, poulet grillé, romaine, parmesan, sauce César.", price: 3500, image: dishPouletDg },
  { id: "di-frites-plantain", name: "Frites de plantain", description: "Plantain frit en fines lamelles, sel & paprika.", price: 1500, image: dishPouletDg },
];

const oceanFreshDishes: Dish[] = [
  { id: "of-plateau-fruits-mer", name: "Plateau de fruits de mer", description: "Crevettes, langoustines, calamars et poisson grillés du jour.", price: 11000, image: dishPoisson, popular: true },
  { id: "of-calamars-grilles", name: "Calamars grillés à la plancha", description: "Calamars frais, ail-persil, citron et alloco.", price: 5500, image: dishPoisson },
  { id: "of-poisson-jour", name: "Poisson du jour braisé", description: "Pêche du jour braisée au feu de bois, sauce tomate-piment, miondo.", price: 5000, image: dishPoisson, popular: true, spicy: true },
  { id: "of-soupe-poisson", name: "Soupe de poisson épicée", description: "Soupe corsée au poisson, gingembre, citronnelle et piment.", price: 3500, image: dishPoisson, options: [pimentOptions] },
  { id: "of-crevettes-coco", name: "Crevettes au lait de coco", description: "Crevettes mijotées au lait de coco et curry doux.", price: 6000, image: dishSuya },
  { id: "of-riz-fruits-mer", name: "Riz aux fruits de mer", description: "Riz parfumé sauté aux crevettes, calamars et moules.", price: 5500, image: dishEru },
];

// 10 nouveaux restaurants Douala
const restaurantsDoualaExtras: Restaurant[] = [
  {
    id: "okokut-bonanjo",
    name: "O'Kokut",
    tagline: "Grillades de quartier — Bonanjo, Douala",
    city: "Douala",
    neighborhood: "Bonanjo",
    rating: 4.6,
    eta: "20-30 min",
    cover: dishPouletDg,
    badge: "Grillades",
    categories: [
      { id: "grillades", label: "Grillades & braisés", dishes: okokutDishes.slice(0, 3) },
      { id: "tradition", label: "Tradition", dishes: okokutDishes.slice(3) },
    ],
  },
  {
    id: "lovalie-bonapriso",
    name: "L'Ovalie",
    tagline: "Brasserie française — Bonapriso, Douala",
    city: "Douala",
    neighborhood: "Bonapriso",
    rating: 4.7,
    eta: "30-45 min",
    cover: dishSuya,
    badge: "Brasserie",
    categories: [
      { id: "viandes", label: "Viandes & burgers", dishes: lOvalieDishes.slice(0, 3) },
      { id: "carte", label: "Carte du chef", dishes: lOvalieDishes.slice(3, 6) },
      { id: "desserts", label: "Desserts", dishes: lOvalieDishes.slice(6) },
    ],
  },
  {
    id: "penja-poivre",
    name: "Penja Poivre",
    tagline: "Gastronomie au poivre de Penja — Bonapriso, Douala",
    city: "Douala",
    neighborhood: "Bonapriso",
    rating: 4.9,
    eta: "30-40 min",
    cover: dishPoisson,
    badge: "Gastronomique",
    categories: [
      { id: "signatures", label: "Signatures", dishes: penjaPoivreDishes.slice(0, 3) },
      { id: "tradition-fusion", label: "Tradition revisitée", dishes: penjaPoivreDishes.slice(3, 5) },
      { id: "desserts", label: "Desserts", dishes: penjaPoivreDishes.slice(5) },
    ],
  },
  {
    id: "wouri-bistro",
    name: "Wouri Bistro",
    tagline: "Cuisine du fleuve — Deido, Douala",
    city: "Douala",
    neighborhood: "Deido",
    rating: 4.6,
    eta: "25-35 min",
    cover: dishPoisson,
    badge: "Local",
    categories: [
      { id: "fleuve", label: "Saveurs du fleuve", dishes: wouriBistroDishes.slice(0, 3) },
      { id: "plats", label: "Plats maison", dishes: wouriBistroDishes.slice(3, 5) },
      { id: "boissons", label: "Boissons fraîches", dishes: wouriBistroDishes.slice(5) },
    ],
  },
  {
    id: "bonaberi-grill",
    name: "Bonabéri Grill",
    tagline: "Grillades populaires — Bonabéri, Douala",
    city: "Douala",
    neighborhood: "Bonabéri",
    rating: 4.5,
    eta: "20-30 min",
    cover: dishPouletDg,
    badge: "Populaire",
    categories: [
      { id: "grill", label: "Grillades", dishes: bonaberiGrillDishes.slice(0, 3) },
      { id: "tradition", label: "Tradition", dishes: bonaberiGrillDishes.slice(3, 5) },
      { id: "boissons", label: "Boissons", dishes: bonaberiGrillDishes.slice(5) },
    ],
  },
  {
    id: "mami-nyanga",
    name: "Mami Nyanga",
    tagline: "Saveurs côtières — New Bell, Douala",
    city: "Douala",
    neighborhood: "New Bell",
    rating: 4.7,
    eta: "25-35 min",
    cover: dishNdole,
    badge: "Tradition",
    categories: [
      { id: "specialites", label: "Spécialités côtières", dishes: mamiNyangaDishes.slice(0, 3) },
      { id: "tradition", label: "Tradition", dishes: mamiNyangaDishes.slice(3, 5) },
      { id: "boissons", label: "Boissons", dishes: mamiNyangaDishes.slice(5) },
    ],
  },
  {
    id: "akwa-palace",
    name: "Akwa Palace",
    tagline: "Restaurant gastronomique — Akwa, Douala",
    city: "Douala",
    neighborhood: "Akwa",
    rating: 4.8,
    eta: "30-45 min",
    cover: dishPoisson,
    badge: "Premium",
    categories: [
      { id: "signatures", label: "Plateaux signatures", dishes: akwaPalaceDishes.slice(0, 2) },
      { id: "viandes-mer", label: "Viandes & mer", dishes: akwaPalaceDishes.slice(2, 5) },
      { id: "desserts", label: "Desserts", dishes: akwaPalaceDishes.slice(5) },
    ],
  },
  {
    id: "bonapriso-bistro",
    name: "Bonapriso Bistro",
    tagline: "Cuisine camerounaise raffinée — Bonapriso, Douala",
    city: "Douala",
    neighborhood: "Bonapriso",
    rating: 4.6,
    eta: "25-35 min",
    cover: dishPouletDg,
    badge: "Bistro",
    categories: [
      { id: "plats", label: "Plats du jour", dishes: bonapriroBistroDishes.slice(0, 3) },
      { id: "grill", label: "Grillades", dishes: bonapriroBistroDishes.slice(3, 5) },
      { id: "boissons", label: "Boissons", dishes: bonapriroBistroDishes.slice(5) },
    ],
  },
  {
    id: "doua-international",
    name: "Doua International",
    tagline: "Pizzas & burgers fusion — Akwa, Douala",
    city: "Douala",
    neighborhood: "Akwa",
    rating: 4.5,
    eta: "20-35 min",
    cover: dishPouletDg,
    badge: "Fusion",
    categories: [
      { id: "pizzas", label: "Pizzas signature", dishes: douaInternationalDishes.slice(0, 2) },
      { id: "burgers", label: "Burgers & pâtes", dishes: douaInternationalDishes.slice(2, 4) },
      { id: "snacks", label: "Snacks", dishes: douaInternationalDishes.slice(4) },
    ],
  },
  {
    id: "ocean-fresh",
    name: "Ocean Fresh",
    tagline: "Spécialiste fruits de mer — Bonanjo, Douala",
    city: "Douala",
    neighborhood: "Bonanjo",
    rating: 4.8,
    eta: "30-45 min",
    cover: dishPoisson,
    badge: "Fruits de mer",
    categories: [
      { id: "plateaux", label: "Plateaux & grillades", dishes: oceanFreshDishes.slice(0, 3) },
      { id: "soupes", label: "Soupes & sauces", dishes: oceanFreshDishes.slice(3, 5) },
      { id: "riz", label: "Riz & accompagnements", dishes: oceanFreshDishes.slice(5) },
    ],
  },
];

// ===== Restaurants vedettes (Douala) — affichés en tête de la page d'accueil =====
const featuredDishes = (price: number, image: string): Dish[] => [
  {
    id: `feat-${Math.random().toString(36).slice(2, 8)}`,
    name: "Spécialité du jour",
    description: "Plat signature de la maison, préparé avec des produits frais du marché.",
    price,
    image,
    popular: true,
  },
];

const featuredRestaurants: Restaurant[] = [
  {
    id: "le-gout-du-terroir",
    name: "Le Goût du Terroir",
    tagline: "Spécialités locales — Douala, CM",
    city: "Douala", neighborhood: "Akwa",
    rating: 4.7, eta: "30-40 min",
    cover: dishNdole, badge: "Terroir",
    categories: [{ id: "plats", label: "Plats", dishes: featuredDishes(2500, dishNdole) }],
  },
  {
    id: "chez-pauline",
    name: "Chez Pauline",
    tagline: "Cuisine africaine — Douala, CM",
    city: "Douala", neighborhood: "Bonapriso",
    rating: 4.6, eta: "25-35 min",
    cover: dishEru, badge: "Maison",
    categories: [{ id: "plats", label: "Plats", dishes: featuredDishes(2000, dishEru) }],
  },
  {
    id: "jollof-riz",
    name: "Jollof (Riz)",
    tagline: "Riz épicé à la camerounaise — Douala, CM",
    city: "Douala", neighborhood: "Bonanjo",
    rating: 4.5, eta: "25-35 min",
    cover: dishSuya, badge: "Épicé",
    categories: [{ id: "plats", label: "Plats", dishes: featuredDishes(2000, dishSuya) }],
  },
  {
    id: "poulet-dg-resto",
    name: "Poulet DG",
    tagline: "Poulet sauté à la camerounaise — Douala, CM",
    city: "Douala", neighborhood: "Akwa",
    rating: 4.8, eta: "20-30 min",
    cover: dishPouletDg, badge: "Populaire",
    categories: [{ id: "plats", label: "Plats", dishes: featuredDishes(2500, dishPouletDg) }],
  },
  {
    id: "case-bamileke",
    name: "La Case Bamiléké",
    tagline: "Spécialités bamiléké — Douala, CM",
    city: "Douala", neighborhood: "Bonamoussadi",
    rating: 4.8, eta: "30-45 min",
    cover: dishEru, badge: "Authentique",
    categories: [{ id: "plats", label: "Plats", dishes: featuredDishes(2500, dishEru) }],
  },
  {
    id: "saveurs-soleil",
    name: "Saveurs du Soleil",
    tagline: "Cuisine camerounaise — Douala, CM",
    city: "Douala", neighborhood: "Deido",
    rating: 4.3, eta: "30-40 min",
    cover: dishPoisson, badge: "Du marché",
    categories: [{ id: "plats", label: "Plats", dishes: featuredDishes(2000, dishPoisson) }],
  },
];

export const restaurants: Restaurant[] = [
  ...featuredRestaurants,
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
      { id: "entrees", label: "Entrées", dishes: entreesPenja },
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
      { id: "grill", label: "Grillades", dishes: goutDuPaysDishes.slice(1, 2) },
      { id: "koki-accomp", label: "Koki & accompagnements", dishes: accompagnementsYaounde },
      { id: "boissons", label: "Boissons & alloco", dishes: goutDuPaysDishes.slice(2) },
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
  ...restaurantsDoualaExtras,
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
