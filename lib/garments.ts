// Garment domain model shared by the UI and the try-on pipeline.

export const GARMENT_TYPES = [
  "top",
  "bottom",
  "dress",
  "jacket",
  "shoes",
  "hat",
] as const;

export type GarmentType = (typeof GARMENT_TYPES)[number];

export interface Garment {
  id: string;
  type: GarmentType;
  label: string;
  /** Either a remote image URL (from scraping) or an inline data URL (from upload). */
  imageUrl: string;
  /** Original product page, when the garment came from a URL. */
  sourceUrl?: string;
}

// Human-friendly labels for the type selector.
export const GARMENT_TYPE_LABELS: Record<GarmentType, string> = {
  top: "Top / Shirt",
  bottom: "Bottom / Pants",
  dress: "Dress",
  jacket: "Jacket / Outerwear",
  shoes: "Shoes",
  hat: "Hat",
};

// Lower number = applied to the model first (closer to the skin).
const LAYER_ORDER: Record<GarmentType, number> = {
  dress: 10,
  top: 20,
  bottom: 30,
  shoes: 40,
  jacket: 50,
  hat: 60,
};

/**
 * Sort garments into the order they should be applied to the model so that
 * layering reads correctly.
 * Stable: items of the same type keep their relative order.
 */
export function sortByLayer<T extends { type: GarmentType }>(garments: T[]): T[] {
  return garments
    .map((g, i) => ({ g, i }))
    .sort((a, b) => {
      const diff = LAYER_ORDER[a.g.type] - LAYER_ORDER[b.g.type];
      return diff !== 0 ? diff : a.i - b.i;
    })
    .map(({ g }) => g);
}
