export type Dish = {
  id: string;
  name: string;
  description: string;
  price: number;
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
