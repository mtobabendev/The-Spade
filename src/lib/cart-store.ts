import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isUniqueSku } from "@/lib/nav-tree";

export type CartItem = {
  id: string;
  title: string;
  price_cents: number;
  game: string;
  category: string;
  qty: number;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: () => number;
  totalCents: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        const unique = isUniqueSku(item.category);
        const existing = get().items.find((i) => i.id === item.id);
        if (existing) {
          if (unique) return;
          set({
            items: get().items.map((i) =>
              i.id === item.id ? { ...i, qty: Math.min(20, i.qty + (item.qty ?? 1)) } : i,
            ),
          });
          return;
        }
        set({
          items: [...get().items, { ...item, qty: unique ? 1 : Math.max(1, item.qty ?? 1) }],
        });
      },
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      setQty: (id, qty) => {
        if (qty < 1) {
          set({ items: get().items.filter((i) => i.id !== id) });
          return;
        }
        set({
          items: get().items.map((i) => {
            if (i.id !== id) return i;
            const cap = isUniqueSku(i.category) ? 1 : 20;
            return { ...i, qty: Math.min(cap, qty) };
          }),
        });
      },
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((n, i) => n + i.qty, 0),
      totalCents: () => get().items.reduce((n, i) => n + i.price_cents * i.qty, 0),
    }),
    { name: "spade-cart" },
  ),
);
