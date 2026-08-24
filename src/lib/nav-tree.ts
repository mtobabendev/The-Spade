import { TABLES } from "@/lib/brand";

export type SpinnerNode = {
  id: string;
  label: string;
  rank: string;
  to?: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
  penny?: boolean;
  children?: SpinnerNode[];
};

export const MAIN_SPINNER: SpinnerNode[] = [
  { id: "hall", label: "Hall", rank: "A", to: "/hall" },
  {
    id: "floor",
    label: "Floor",
    rank: "K",
    to: "/floor",
    children: TABLES.map((t) => ({
      id: `table-${t.id}`,
      label: t.name,
      rank: t.seats >= 6 ? "8" : "4",
      to: "/floor/$tableId",
      params: { tableId: t.id },
    })),
  },
  {
    id: "vault",
    label: "Vault",
    rank: "Q",
    to: "/vault",
    children: [
      { id: "vault-all", label: "All", rank: "A", to: "/vault", search: { game: "all" } },
      { id: "vault-mtg", label: "Magic", rank: "M", to: "/vault", search: { game: "mtg" } },
      { id: "vault-swu", label: "Unlimited", rank: "S", to: "/vault", search: { game: "swu" } },
      { id: "vault-dnd", label: "D&D", rank: "D", to: "/vault", search: { game: "dnd" } },
      { id: "vault-pf", label: "Pathfinder", rank: "P", to: "/vault", search: { game: "pathfinder" } },
      { id: "vault-comic", label: "Comics", rank: "C", to: "/vault", search: { game: "comic" } },
      { id: "vault-sell", label: "List", rank: "L", to: "/sell" },
      { id: "vault-cart", label: "Cart", rank: "9", to: "/cart" },
    ],
  },
  {
    id: "sheets",
    label: "Binder",
    rank: "J",
    to: "/sheets",
    children: [
      { id: "sheet-list", label: "Sheets", rank: "J", to: "/sheets" },
      { id: "sheet-duel", label: "Duel", rank: "2", to: "/duel" },
    ],
  },
  { id: "events", label: "Nights", rank: "10", to: "/events" },
  {
    id: "nexus",
    label: "Nexus",
    rank: "3",
    to: "/nexus",
    children: [
      { id: "nexus-hub", label: "Hub", rank: "A", to: "/nexus" },
      { id: "nexus-party", label: "Pool", rank: "2", to: "/nexus/party" },
      { id: "nexus-labs", label: "Labs", rank: "3", to: "/nexus/labs" },
      { id: "nexus-office", label: "Office", rank: "4", to: "/nexus/office" },
      { id: "nexus-meetings", label: "Meetings", rank: "8", to: "/meetings" },
      { id: "nexus-easy", label: "Easy", rank: "E", to: "/easy" },
      { id: "nexus-gotham", label: "Gotham", rank: "5", to: "/nexus/messenger" },
      { id: "nexus-garage", label: "Garage", rank: "6", to: "/nexus/garage" },
      { id: "nexus-mark", label: "Mark I", rank: "7", to: "/nexus/approach" },
    ],
  },
  {
    id: "penny",
    label: "Penny",
    rank: "Q",
    to: "/penny",
    penny: true,
    children: [
      { id: "penny-desk", label: "Desk", rank: "Q", to: "/penny", penny: true },
      { id: "penny-meetings", label: "Meetings", rank: "8", to: "/meetings" },
      { id: "penny-easy", label: "Easy", rank: "E", to: "/easy" },
      { id: "penny-duel", label: "Duel", rank: "2", to: "/duel" },
    ],
  },
];

export function folderForPath(pathname: string): SpinnerNode | null {
  if (pathname.startsWith("/floor")) return MAIN_SPINNER.find((n) => n.id === "floor") ?? null;
  if (pathname.startsWith("/vault") || pathname.startsWith("/sell") || pathname.startsWith("/cart")) {
    return MAIN_SPINNER.find((n) => n.id === "vault") ?? null;
  }
  if (pathname.startsWith("/sheets") || pathname.startsWith("/duel")) {
    return MAIN_SPINNER.find((n) => n.id === "sheets") ?? null;
  }
  if (pathname.startsWith("/nexus") || pathname.startsWith("/meetings") || pathname.startsWith("/easy")) {
    return MAIN_SPINNER.find((n) => n.id === "nexus") ?? null;
  }
  if (pathname.startsWith("/penny")) return MAIN_SPINNER.find((n) => n.id === "penny") ?? null;
  if (pathname.startsWith("/events")) return MAIN_SPINNER.find((n) => n.id === "events") ?? null;
  return MAIN_SPINNER.find((n) => n.id === "hall") ?? null;
}

export function isUniqueSku(category: string) {
  return category === "single" || category === "comic";
}
