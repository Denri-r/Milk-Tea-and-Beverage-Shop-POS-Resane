import type { Product } from "./types";
export const seedProducts: Product[] = [
  {
    id: "classic",
    name: "Classic Milk Tea",
    price: 5900,
    category: "Milk Tea",
    size: "Regular",
    description: "The everyday milk tea favorite.",
    image: "/products/classic.jpg",
  },
  {
    id: "wintermelon",
    name: "Wintermelon Milk Tea",
    price: 6500,
    category: "Milk Tea",
    size: "Regular",
    description: "Mellow, sweet, and oh-so-smooth.",
    image: "/products/wintermelon.jpg",
  },
  {
    id: "taro",
    name: "Taro Milk Tea",
    price: 6500,
    category: "Milk Tea",
    size: "Regular",
    description: "Creamy taro with a nutty finish.",
    image: "/products/taro.jpg",
  },
  {
    id: "lychee",
    name: "Fruit Tea - Lychee",
    price: 5500,
    category: "Fruit Tea",
    size: "Regular",
    description: "A light and fruity little refresh.",
    image: "/products/lychee.jpg",
  },
  {
    id: "brown-sugar",
    name: "Brown Sugar Milk Tea",
    price: 6900,
    category: "Milk Tea",
    size: "Regular",
    description: "Rich caramel notes in every sip.",
    image: "/products/brown-sugar.jpg",
  },
  {
    id: "water",
    name: "Bottled Water",
    price: 2000,
    category: "Refreshers",
    size: "Bottled",
    description: "Keep it simple. Stay refreshed.",
    image: "/products/water.jpg",
  },
];
export const sugarOptions = ["0%", "25%", "50%", "75%", "100%"];
export const iceOptions = ["No ice", "Less ice", "Regular ice"];
