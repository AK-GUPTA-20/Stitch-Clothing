// src/data/products.ts

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  tag?: string;
  sizes: string[];
  colors: ProductColor[];
  description: string;
  details: string[];
  care: string[];
  material: string;
  fit: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
}

export const products: Product[] = [
  {
    id: "essential-hoodie",
    name: "Essential Hoodie",
    subtitle: "Heavyweight French terry, relaxed silhouette",
    category: "Hoodies",
    price: 148,
    image: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=800&q=80",
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80",
      "https://images.unsplash.com/photo-1578932750294-f5075e85f44a?w=800&q=80",
    ],
    tag: "Bestseller",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "Chalk", hex: "#f5f5f0" },
      { name: "Slate", hex: "#6b7280" },
      { name: "Onyx", hex: "#1c1917" },
      { name: "Dusk", hex: "#9f7aea" },
    ],
    description:
      "The Essential Hoodie is the cornerstone of the Stitch wardrobe. Crafted from 400gsm French terry cotton, it drapes with a considered weight that holds its shape wash after wash. A relaxed fit that works equally well layered under a coat or worn alone.",
    details: [
      "400gsm heavyweight French terry",
      "100% organic cotton",
      "Relaxed, oversized fit",
      "Kangaroo pocket with interior zip",
      "Ribbed cuffs and hem",
      "Woven label at inner neck",
      "Pre-washed for minimal shrinkage",
    ],
    care: [
      "Machine wash cold, gentle cycle",
      "Tumble dry low or lay flat to dry",
      "Do not bleach",
      "Iron on low if needed",
    ],
    material: "100% Organic Cotton",
    fit: "Oversized — model is 6'1\" wearing size M",
    rating: 4.9,
    reviewCount: 312,
    inStock: true,
    isBestseller: true,
  },
  {
    id: "structured-overshirt",
    name: "Structured Overshirt",
    subtitle: "Brushed cotton twill, boxy fit",
    category: "Outerwear",
    price: 198,
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4f6c?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1594938298603-c8148c4b4f6c?w=800&q=80",
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80",
    ],
    tag: "New",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "Ecru", hex: "#f0ebe1" },
      { name: "Forest", hex: "#2d4a3e" },
      { name: "Camel", hex: "#c4956a" },
    ],
    description:
      "A transitional layer that works from the first cool days of autumn through to spring. The Structured Overshirt is cut from a medium-weight brushed cotton twill, giving it enough body to wear open as a light jacket, or buttoned as a shirt.",
    details: [
      "Medium-weight brushed cotton twill",
      "Boxy, relaxed fit",
      "Two chest patch pockets",
      "Two side seam pockets",
      "Horn buttons",
      "Single needle stitching throughout",
    ],
    care: [
      "Machine wash cold",
      "Lay flat to dry",
      "Steam or iron on medium",
    ],
    material: "100% Brushed Cotton Twill",
    fit: "Boxy — model is 6'1\" wearing size M",
    rating: 4.7,
    reviewCount: 89,
    inStock: true,
    isNew: true,
  },
  {
    id: "classic-tee",
    name: "Classic Tee",
    subtitle: "230gsm jersey, perfect weight",
    category: "Tees",
    price: 68,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80",
      "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&q=80",
    ],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "White", hex: "#fafaf9" },
      { name: "Sand", hex: "#d4c5a9" },
      { name: "Onyx", hex: "#1c1917" },
      { name: "Navy", hex: "#1e3a5f" },
      { name: "Sage", hex: "#87a878" },
    ],
    description:
      "The tee, perfected. 230gsm jersey hits the sweet spot — substantial enough to drape well and retain its shape, light enough for year-round wear. A slightly boxy, mid-length cut with a crew neck that sits just right.",
    details: [
      "230gsm ringspun cotton jersey",
      "Boxy, mid-length fit",
      "Crew neck",
      "Shoulder seams set slightly back",
      "Pre-washed for softness",
      "Side seam construction",
    ],
    care: [
      "Machine wash cold",
      "Tumble dry low",
      "Do not iron print if applicable",
    ],
    material: "100% Ringspun Cotton",
    fit: "Boxy — model is 6'1\" wearing size M",
    rating: 4.8,
    reviewCount: 547,
    inStock: true,
    isBestseller: true,
  },
  {
    id: "minimal-sweatpant",
    name: "Minimal Sweatpant",
    subtitle: "Loopback cotton, tapered leg",
    category: "Bottoms",
    price: 118,
    image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&q=80",
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "Heather", hex: "#9ca3af" },
      { name: "Onyx", hex: "#1c1917" },
      { name: "Chalk", hex: "#f5f5f0" },
    ],
    description:
      "Loopback cotton that gets softer with every wash. A tapered leg and clean elastic waistband give a modern silhouette that reads as intentional, not sloppy. Deep side pockets. Worn in or dressed up.",
    details: [
      "320gsm loopback cotton",
      "Tapered leg",
      "Elasticated waistband with internal drawcord",
      "Two deep side pockets",
      "Ribbed cuffs",
      "No external branding",
    ],
    care: [
      "Machine wash cold, inside out",
      "Tumble dry low",
      "Do not bleach",
    ],
    material: "80% Cotton, 20% Recycled Polyester",
    fit: "Slim tapered — model is 6'1\" wearing size M",
    rating: 4.6,
    reviewCount: 203,
    inStock: true,
  },
  {
    id: "wool-bomber",
    name: "Wool Bomber",
    subtitle: "Boiled wool, ribbed trim",
    category: "Outerwear",
    price: 298,
    originalPrice: 398,
    image: "https://images.unsplash.com/photo-1544923246-77307dd654cb?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1544923246-77307dd654cb?w=800&q=80",
    ],
    tag: "Sale",
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Camel", hex: "#c4956a" },
      { name: "Onyx", hex: "#1c1917" },
    ],
    description:
      "Boiled wool for honest warmth. The Wool Bomber is a piece that improves with age — wearing into a patina that is entirely your own. Ribbed wool trim at cuffs, collar, and hem. A front zip and two side pockets.",
    details: [
      "Boiled wool outer",
      "100% wool",
      "Quilted lining for warmth",
      "YKK zip",
      "Two zip side pockets",
      "Interior chest pocket",
      "Wool ribbed trim",
    ],
    care: [
      "Dry clean recommended",
      "Spot clean with cold water if needed",
      "Lay flat to dry",
    ],
    material: "100% Boiled Wool, Quilted Lining",
    fit: "Regular — model is 6'1\" wearing size M",
    rating: 4.9,
    reviewCount: 67,
    inStock: true,
  },
  {
    id: "ribbed-longsleeve",
    name: "Ribbed Longsleeve",
    subtitle: "Fine rib knit, slim cut",
    category: "Tees",
    price: 88,
    image: "https://images.unsplash.com/photo-1618354691792-d1d42acfd860?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1618354691792-d1d42acfd860?w=800&q=80",
    ],
    tag: "New",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "Chalk", hex: "#f5f5f0" },
      { name: "Clay", hex: "#b5906b" },
      { name: "Slate", hex: "#6b7280" },
      { name: "Wine", hex: "#722f37" },
    ],
    description:
      "A fine rib knit longsleeve that layers perfectly. The slim, body-skimming cut makes it an ideal base layer or standalone piece. Wear it tucked, half-tucked, or loose — it works all three ways.",
    details: [
      "Fine 1x1 rib knit",
      "Slim, body-skimming fit",
      "Crew neck",
      "Set-in sleeves",
      "Minimal branding",
    ],
    care: [
      "Machine wash cold, gentle cycle",
      "Lay flat to dry",
      "Do not bleach",
    ],
    material: "95% Cotton, 5% Elastane",
    fit: "Slim — model is 6'1\" wearing size M",
    rating: 4.7,
    reviewCount: 154,
    inStock: true,
    isNew: true,
  },
  {
    id: "canvas-cap",
    name: "Canvas Cap",
    subtitle: "6-panel, unstructured",
    category: "Accessories",
    price: 48,
    image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=80",
    ],
    sizes: ["ONE SIZE"],
    colors: [
      { name: "Ecru", hex: "#f0ebe1" },
      { name: "Onyx", hex: "#1c1917" },
      { name: "Slate", hex: "#6b7280" },
    ],
    description:
      "An unstructured 6-panel cap in washed cotton canvas. The low profile and curved brim give a clean, unfussy look. Adjustable strap at back.",
    details: [
      "Washed cotton canvas",
      "6-panel, unstructured",
      "Low profile",
      "Curved brim",
      "Adjustable strap at back",
      "Embroidered tonal logo at front",
    ],
    care: [
      "Spot clean with damp cloth",
      "Air dry only",
      "Do not machine wash",
    ],
    material: "100% Washed Cotton Canvas",
    fit: "One size fits most — adjustable",
    rating: 4.5,
    reviewCount: 98,
    inStock: true,
  },
  {
    id: "heavyweight-cargo",
    name: "Heavyweight Cargo",
    subtitle: "Cotton ripstop, relaxed fit",
    category: "Bottoms",
    price: 168,
    image: "https://images.unsplash.com/photo-1517438476312-10d79c077509?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1517438476312-10d79c077509?w=800&q=80",
    ],
    tag: "New",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "Olive", hex: "#6b7c5a" },
      { name: "Stone", hex: "#b5a89a" },
      { name: "Onyx", hex: "#1c1917" },
    ],
    description:
      "Utility meets refinement. The Heavyweight Cargo is cut from a durable cotton ripstop in a relaxed silhouette with six functional pockets. Designed to be lived in.",
    details: [
      "Heavyweight cotton ripstop",
      "Relaxed fit, tapered ankle",
      "6 pockets including cargo patch",
      "Drawcord at ankle",
      "Elasticated waistband with belt loops",
      "YKK zip fly",
    ],
    care: [
      "Machine wash cold",
      "Tumble dry low",
      "Iron on medium if needed",
    ],
    material: "100% Cotton Ripstop",
    fit: "Relaxed — model is 6'1\" wearing size M",
    rating: 4.8,
    reviewCount: 41,
    inStock: true,
    isNew: true,
  },
];

export const categories = [
  "All",
  "Hoodies",
  "Tees",
  "Outerwear",
  "Bottoms",
  "Accessories",
];

export const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];