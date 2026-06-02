// Base model the garments are placed on.
//
// Default is a sentinel ("mannequin") rather than an image: the AI invents a
// neutral mannequin from the first garment, so we don't ship/send a base image.
// Users can instead upload a real front-facing photo (a data URL) for try-on on
// an actual person.

export const MANNEQUIN = "mannequin";

export const DEFAULT_BASE_MODEL = MANNEQUIN;
