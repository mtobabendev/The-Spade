/** Stable public jump. Phones scan this — not a preview origin. */
export const PUBLIC_MEETINGS_URL = "https://the-spade.vercel.app/meetings";
export const PUBLIC_EASY_URL = "https://the-spade.vercel.app/easy";

export const EASY_QR = {
  errorCorrection: "H" as const,
  /** Center badge as a fraction of the QR module grid. Stay under ~0.32 so it still scans. */
  holeRatio: 0.3,
} as const;
