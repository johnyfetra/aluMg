// Données de démonstration : 6 menuisiers (avec logo, photo de profil, réalisations) et 4 clients.
// Les images sont produites par scripts/make-demo-assets.mjs (rendus 3D maison et illustrations SVG) : aucune image externe.
const q = (o) => new URLSearchParams(o).toString();

// Mises en scène : id -> paramètres de /demo-render. Chaque réalisation reprend 3 prises de vue.
export const SCENES = {
  baie3: q({ cat: "fenetre", op: "coulissant", leaves: 3, w: 2400, h: 1300, finish: "anthracite", open: 1, wall: "c9a27a", ground: "8f8a6a", sky: "bcd9f2" }),
  coul2: q({ cat: "fenetre", op: "coulissant", leaves: 2, w: 1800, h: 1200, finish: "blanc", open: 0.7, wall: "d9d4c7", ground: "9a9276", sky: "c3dcf3", glass: "teinte-gris" }),
  porteCoul: q({ cat: "porte", op: "coulissant", leaves: 2, w: 2200, h: 2100, finish: "bronze", open: 1, sill: 0, wall: "bfc6c9", ground: "8d8a7a", sky: "b9d6ee" }),
  porteOuv: q({ cat: "porte", op: "ouvrant", leaves: 2, infill: "semi", w: 1500, h: 2150, finish: "noyer", open: 0.65, sill: 0, wall: "e4dccd", ground: "a39b84", sky: "c7def2" }),
  volet: q({ cat: "volet", shutter: "roulant", control: "motorise", w: 1800, h: 1700, finish: "bronze", open: 0.55, sill: 0.5, wall: "ecdcc0", ground: "9a9170", sky: "c6ddf1" }),
  rideau: q({ cat: "volet", shutter: "rideau", control: "manuel", w: 2400, h: 2300, finish: "anthracite", open: 0.5, sill: 0, wall: "9c8f86", ground: "7d7a70", sky: "b4cfe6" }),
  naco: q({ cat: "fenetre", op: "jalousie", leaves: 1, w: 1000, h: 1300, finish: "champagne", open: 1, wall: "d7b9a0", ground: "958b6e", sky: "bfd9ef" }),
  oscillo: q({ cat: "fenetre", op: "oscillo", leaves: 1, w: 1100, h: 1400, finish: "noir", open: 1, wall: "b5523d", ground: "8a8468", sky: "c4dcf1" }),
  gardeVerre: q({ cat: "garde-corps", guard: "verre", w: 3000, h: 1000, finish: "naturel", sill: 0.3, wall: "ede7db", ground: "a59d86", sky: "c4dcf1" }),
  gardeBar: q({ cat: "garde-corps", guard: "barreaudage", w: 2600, h: 1000, finish: "noir", sill: 0.3, wall: "dad2c0", ground: "9d9576", sky: "c4dcf1" }),
  cloison: q({ cat: "cloison", leaves: 4, w: 3400, h: 2500, finish: "noir", sill: 0, wall: "f1efe9", ground: "bdb7a6", interior: "c9b79a", sky: "d6e6f4" }),
  baieFixe: q({ cat: "fenetre", op: "fixe", leaves: 1, w: 2200, h: 1500, finish: "chene-dore", wall: "e8e1d2", ground: "9a9276", sky: "c3dcf3", glass: "teinte-bronze" }),
  ouv2: q({ cat: "fenetre", op: "ouvrant", leaves: 2, w: 1500, h: 1300, finish: "blanc", open: 0.8, wall: "a9bfa4", ground: "8b8d6a", sky: "c3dcf3" }),
  coul4: q({ cat: "fenetre", op: "coulissant", leaves: 4, w: 3200, h: 1400, finish: "champagne", open: 1, wall: "e2c9a8", ground: "958b6e", sky: "bfd9ef", glass: "teinte-bronze" }),
};
// prises de vue (azimut, élévation, distance) pour obtenir 3 photos différentes d'un même ouvrage
export const VIEWS = [
  { az: -26, el: 5, dist: 1.3 },
  { az: 24, el: 9, dist: 1.1 },
  { az: -8, el: 2, dist: 0.8 },
];

export const AVATARS = {
  rija: { skin: "#a8764f", hair: "#1c1410", style: "short", shirt: "#2f4f8f", bg: ["#dbe7ff", "#b8cdf5"] },
  faly: { skin: "#8a5a3c", hair: "#120d0a", style: "short", shirt: "#3b6b4f", bg: ["#dff3e6", "#b9e0c7"], beard: true },
  hanta: { skin: "#b9825a", hair: "#1b1310", style: "long", shirt: "#8f3b5e", bg: ["#fbe1ec", "#f3bfd6"] },
  mamy: { skin: "#9a6a47", hair: "#16100c", style: "short", shirt: "#c26a2e", bg: ["#ffe9d3", "#fbcf9f"], glasses: true },
  tahina: { skin: "#7d4f33", hair: "#0f0a08", style: "curly", shirt: "#27506b", bg: ["#d9eef7", "#aed6e8"] },
  voahangy: { skin: "#b07a52", hair: "#1a120e", style: "long", shirt: "#5a4a8f", bg: ["#e7e2fa", "#c9c0f0"], glasses: true },
  hery: { skin: "#a06c47", hair: "#1a120e", style: "short", shirt: "#555d6b", bg: ["#e9ecf1", "#cfd5df"] },
  noro: { skin: "#b27c55", hair: "#19110d", style: "long", shirt: "#c0485f", bg: ["#ffe2e6", "#f7bcc6"] },
  toky: { skin: "#8d5c3b", hair: "#120c09", style: "curly", shirt: "#3a7d7a", bg: ["#d9f1ef", "#aedcd8"], beard: true },
  lalao: { skin: "#a9724b", hair: "#1c130e", style: "short", shirt: "#d19a2a", bg: ["#fff1cf", "#f7dc97"], glasses: true },
};

export const LOGOS = {
  alumada: { kind: "grid", a: "#1d4ed8", b: "#0b1f6b", text: "AM" },
  sud: { kind: "sun", a: "#f59e0b", b: "#b45309", text: "FS" },
  tana: { kind: "hex", a: "#0d9488", b: "#115e59", text: "TA" },
  nosybe: { kind: "wave", a: "#0284c7", b: "#0c4a6e", text: "NB" },
  fianar: { kind: "arch", a: "#7c3aed", b: "#4c1d95", text: "FM" },
  mahajanga: { kind: "shield", a: "#dc2626", b: "#7f1d1d", text: "MA" },
};

const pwd = "motdepasse123";
export const PASSWORD = pwd;

export const MENUISIERS = [
  { email: "test@alumada.mg", name: "Rija Andriamanana", display: "Alu Mada", city: "Antananarivo", avatar: "rija", logo: "alumada", phone: "034 12 345 67", verified: true,
    specialties: ["fenetres", "portes", "volets", "garde-corps"],
    bio: "Menuiserie aluminium et vitrerie à Antananarivo depuis 2014.\nFenêtres coulissantes, portes-fenêtres, volets roulants et garde-corps sur mesure, fabriqués dans notre atelier d'Ivandry. Devis détaillé sous 48 h, pose par notre équipe.",
    works: [
      { title: "Baie vitrée coulissante, villa à Ivandry", category: "fenetres", year: 2025, scene: "baie3", text: "Baie de 2,40 m à trois vantaux en aluminium anthracite, double rail, ouverture sur la terrasse." },
      { title: "Porte-fenêtre coulissante bronze", category: "portes", year: 2025, scene: "porteCoul", text: "Porte-fenêtre de salon en aluminium bronze, vitrage feuilleté de sécurité." },
      { title: "Volets roulants motorisés", category: "volets", year: 2024, scene: "volet", text: "Quatre volets roulants motorisés avec télécommande, lames aluminium isolées." },
      { title: "Garde-corps en verre, terrasse", category: "garde-corps", year: 2024, scene: "gardeVerre", text: "Garde-corps verre feuilleté 10 mm sur profilés anodisés." },
    ] },
  { email: "sud@alumada.mg", name: "Faly Randria", display: "Fenêtres du Sud", city: "Toliara", avatar: "faly", logo: "sud", phone: "032 11 222 33", verified: false,
    specialties: ["vitrerie", "cloisons", "fenetres"],
    bio: "Spécialiste vitrerie et cloisons vitrées pour commerces et hôtels du sud de Madagascar. Verres teintés, réfléchissants et trempés ; chantiers livrés dans les délais.",
    works: [
      { title: "Cloison vitrée, showroom à Toliara", category: "cloisons", year: 2025, scene: "cloison", text: "Cloison de 3,40 m à quatre panneaux, profilés noirs, verre clair 8 mm." },
      { title: "Fenêtres teintées, hôtel en bord de mer", category: "fenetres", year: 2024, scene: "coul2", text: "Vingt fenêtres coulissantes à verre teinté gris, gamme européenne." },
      { title: "Grande baie fixe, restaurant", category: "vitrerie", year: 2024, scene: "baieFixe", text: "Baie fixe imitation chêne doré, verre teinté bronze." },
    ] },
  { email: "tana@demo.mg", name: "Hanta Rasoamanana", display: "Tana Alu Design", city: "Antananarivo", avatar: "hanta", logo: "tana", phone: "034 22 456 78", verified: true,
    specialties: ["fenetres", "portes", "sur-mesure", "renovation"],
    bio: "Design et menuiserie aluminium haut de gamme : fenêtres oscillo-battantes, portes d'entrée et rénovation de façades. Conseil gratuit sur place à Antananarivo et alentours.",
    works: [
      { title: "Fenêtres oscillo-battantes noires", category: "fenetres", year: 2025, scene: "oscillo", text: "Rénovation d'une façade en brique : profilés noirs, ouverture oscillo-battante." },
      { title: "Porte d'entrée vitrée, imitation noyer", category: "portes", year: 2025, scene: "porteOuv", text: "Porte à deux vantaux semi-pleins, finition imitation noyer." },
      { title: "Baie à quatre vantaux champagne", category: "fenetres", year: 2024, scene: "coul4", text: "Baie de 3,20 m en aluminium champagne anodisé." },
      { title: "Fenêtre naco rénovée", category: "renovation", year: 2023, scene: "naco", text: "Remplacement de lames de verre sur une façade ancienne." },
    ] },
  { email: "nosybe@demo.mg", name: "Mamy Rakotoarisoa", display: "Nosy Be Vitrerie & Alu", city: "Nosy Be", avatar: "mamy", logo: "nosybe", phone: "033 45 678 90", verified: false,
    specialties: ["fenetres", "garde-corps", "volets"],
    bio: "Menuiserie aluminium résistante à l'air marin : profilés laqués, quincaillerie inox, garde-corps pour bungalows et hôtels. Livraison sur toute l'île.",
    works: [
      { title: "Garde-corps barreaudage, bungalows", category: "garde-corps", year: 2025, scene: "gardeBar", text: "Garde-corps à barreaux noirs laqués pour une terrasse de bungalow." },
      { title: "Fenêtres ouvrantes blanches", category: "fenetres", year: 2024, scene: "ouv2", text: "Fenêtres à deux vantaux ouvrants pour une maison d'hôtes." },
    ] },
  { email: "fianar@demo.mg", name: "Tahina Ravelojaona", display: "Atelier Fianar Métal", city: "Fianarantsoa", avatar: "tahina", logo: "fianar", phone: "034 67 890 12", verified: false,
    specialties: ["volets", "portes", "sur-mesure"],
    bio: "Rideaux métalliques, volets roulants et portes sur mesure pour boutiques et ateliers des Hautes Terres. Fabrication locale, installation et entretien.",
    works: [
      { title: "Rideau métallique, boutique du centre-ville", category: "volets", year: 2025, scene: "rideau", text: "Rideau métallique anthracite à ouverture manuelle, coulisses renforcées." },
      { title: "Volets roulants bronze", category: "volets", year: 2024, scene: "volet", text: "Volets roulants aluminium pour une maison familiale." },
    ] },
  { email: "mahajanga@demo.mg", name: "Voahangy Razafindrabe", display: "Mahajanga Alu Pro", city: "Mahajanga", avatar: "voahangy", logo: "mahajanga", phone: "032 98 765 43", verified: true,
    specialties: ["fenetres", "portes", "garde-corps", "cloisons"],
    bio: "Équipe de douze personnes, plus de 400 chantiers livrés sur la côte ouest. Ouvrages standard et sur mesure, pose garantie deux ans.",
    works: [
      { title: "Fenêtres coulissantes blanches, résidence", category: "fenetres", year: 2025, scene: "coul2", text: "Résidence de 24 logements : fenêtres coulissantes blanches." },
      { title: "Garde-corps verre, front de mer", category: "garde-corps", year: 2025, scene: "gardeVerre", text: "Garde-corps verre sur 40 mètres de balcons." },
      { title: "Cloison vitrée, bureaux", category: "cloisons", year: 2024, scene: "cloison", text: "Cloisons de bureaux : profilés noirs, verre clair." },
    ] },
];

export const CLIENTS = [
  { email: "hery@client.mg", name: "Hery Rakoto", phone: "033 12 345 67", avatar: "hery" },
  { email: "noro@client.mg", name: "Noro Andriamihaja", phone: "034 55 120 44", avatar: "noro" },
  { email: "toky@client.mg", name: "Toky Rabemanana", phone: "032 77 410 28", avatar: "toky" },
  { email: "lalao@client.mg", name: "Lalao Ramanantsoa", phone: "033 90 214 65", avatar: "lalao" },
];
