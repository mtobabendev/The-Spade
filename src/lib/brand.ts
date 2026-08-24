/**
 * White-label contract.
 * Swap this file (and /public/brand/*) for the next shop.
 * Anything rendered through BrandMark / BrandSlot is a client-art placeholder.
 */
export const brand = {
  name: "The Spade",
  legalName: "WildCard DEV",
  shop: "WildCard Games",
  tagline: "Members table. Trade. Play. Sit down.",
  city: "Omaha",
  hostName: "Penny",
  hostRole: "Concierge, judge, and fill-in DM",
  inviteCode: "ACEOFSPADES",
  inviteHint: "Ask the counter. Or Matt.",
  supportEmail: "matt@wildcarddev.com",
  publicMeetingsUrl: "https://the-spade.vercel.app/meetings",
  publicEasyUrl: "https://the-spade.vercel.app/easy",
  colors: {
    black: "#07060c",
    purple: "#7c3aed",
    pink: "#f472b6",
    blue: "#5b8def",
    silver: "#c9cdd8",
  },
} as const;

export const GAMES = [
  { id: "mtg", label: "Magic: The Gathering" },
  { id: "swu", label: "Star Wars Unlimited" },
  { id: "dnd", label: "Dungeons & Dragons" },
  { id: "pathfinder", label: "Pathfinder" },
  { id: "comic", label: "Comics" },
  { id: "other", label: "Other" },
] as const;

export type GameId = (typeof GAMES)[number]["id"];

export const CONDITIONS = ["NM", "LP", "MP", "HP", "Sealed"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const TABLES = [
  {
    id: "commander",
    name: "Commander",
    game: "mtg" as GameId,
    seats: 4,
    blurb: "Four-player kitchen table. Bring a deck, not an ego.",
  },
  {
    id: "unlimited",
    name: "Unlimited",
    game: "swu" as GameId,
    seats: 4,
    blurb: "Star Wars Unlimited. Penny will judge if you ask.",
  },
  {
    id: "pathfinder",
    name: "Society",
    game: "pathfinder" as GameId,
    seats: 6,
    blurb: "Pathfinder two-shot. Sheets live in the binder.",
  },
  {
    id: "dungeon",
    name: "Dungeon",
    game: "dnd" as GameId,
    seats: 6,
    blurb: "D&D one-shot. Penny DMs if nobody else will.",
  },
  {
    id: "draft",
    name: "Draft Hall",
    game: "mtg" as GameId,
    seats: 8,
    blurb: "Pick, pass, pay at the Vault if you crack something spicy.",
  },
] as const;

export type TableId = (typeof TABLES)[number]["id"];
