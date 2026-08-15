export type LibItem = {
  kind: string;
  label: string;
  /** default size in mm */
  w: number;
  h: number;
  layer: string;
  group: "Bedroom" | "Living" | "Kitchen" | "Bathroom" | "Storage" | "Outdoor" | "Electrical" | "Plumbing";
};

export const LIBRARY: LibItem[] = [
  { kind: "bed-double", label: "Double bed", w: 1600, h: 2000, layer: "furniture", group: "Bedroom" },
  { kind: "bed-single", label: "Single bed", w: 900, h: 2000, layer: "furniture", group: "Bedroom" },
  { kind: "wardrobe", label: "Wardrobe", w: 1800, h: 600, layer: "furniture", group: "Bedroom" },
  { kind: "nightstand", label: "Nightstand", w: 450, h: 450, layer: "furniture", group: "Bedroom" },

  { kind: "sofa", label: "Sofa", w: 2100, h: 900, layer: "furniture", group: "Living" },
  { kind: "armchair", label: "Armchair", w: 800, h: 800, layer: "furniture", group: "Living" },
  { kind: "coffee-table", label: "Coffee table", w: 1100, h: 600, layer: "furniture", group: "Living" },
  { kind: "tv-unit", label: "TV unit", w: 1800, h: 450, layer: "furniture", group: "Living" },
  { kind: "dining-table", label: "Dining table", w: 1800, h: 900, layer: "furniture", group: "Living" },
  { kind: "chair", label: "Chair", w: 450, h: 450, layer: "furniture", group: "Living" },

  { kind: "counter", label: "Kitchen counter", w: 2400, h: 600, layer: "furniture", group: "Kitchen" },
  { kind: "sink", label: "Kitchen sink", w: 800, h: 600, layer: "plumbing", group: "Kitchen" },
  { kind: "stove", label: "Stove", w: 600, h: 600, layer: "furniture", group: "Kitchen" },
  { kind: "fridge", label: "Refrigerator", w: 700, h: 700, layer: "furniture", group: "Kitchen" },

  { kind: "toilet", label: "Toilet", w: 400, h: 700, layer: "plumbing", group: "Bathroom" },
  { kind: "washbasin", label: "Wash basin", w: 600, h: 450, layer: "plumbing", group: "Bathroom" },
  { kind: "shower", label: "Shower", w: 900, h: 900, layer: "plumbing", group: "Bathroom" },
  { kind: "bathtub", label: "Bathtub", w: 1700, h: 750, layer: "plumbing", group: "Bathroom" },

  { kind: "shelf", label: "Shelving", w: 1200, h: 400, layer: "furniture", group: "Storage" },
  { kind: "desk", label: "Desk", w: 1400, h: 700, layer: "furniture", group: "Storage" },

  { kind: "car", label: "Car", w: 1900, h: 4500, layer: "furniture", group: "Outdoor" },
  { kind: "plant", label: "Planter", w: 600, h: 600, layer: "furniture", group: "Outdoor" },

  { kind: "socket", label: "Socket", w: 300, h: 300, layer: "electrical", group: "Electrical" },
  { kind: "switch", label: "Switch", w: 300, h: 300, layer: "electrical", group: "Electrical" },
  { kind: "light", label: "Ceiling light", w: 400, h: 400, layer: "electrical", group: "Electrical" },
  { kind: "db-board", label: "Distribution board", w: 600, h: 300, layer: "electrical", group: "Electrical" },

  { kind: "water-tap", label: "Tap point", w: 250, h: 250, layer: "plumbing", group: "Plumbing" },
  { kind: "drain", label: "Floor drain", w: 250, h: 250, layer: "plumbing", group: "Plumbing" },
  { kind: "water-tank", label: "Water tank", w: 1200, h: 1200, layer: "plumbing", group: "Plumbing" },
];

export const LIB_GROUPS = Array.from(new Set(LIBRARY.map((l) => l.group)));

export function libItem(kind: string) {
  return LIBRARY.find((l) => l.kind === kind);
}
