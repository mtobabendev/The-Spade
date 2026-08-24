export type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";

export const ABILITIES: { id: Ability; label: string }[] = [
  { id: "str", label: "STR" },
  { id: "dex", label: "DEX" },
  { id: "con", label: "CON" },
  { id: "int", label: "INT" },
  { id: "wis", label: "WIS" },
  { id: "cha", label: "CHA" },
];

export type SheetData = {
  className: string;
  level: number;
  ancestry: string;
  background: string;
  alignment: string;
  hp: number;
  hpMax: number;
  ac: number;
  speed: number;
  abilities: Record<Ability, number>;
  notes: string;
};

export function emptySheet(): SheetData {
  return {
    className: "",
    level: 1,
    ancestry: "",
    background: "",
    alignment: "",
    hp: 10,
    hpMax: 10,
    ac: 10,
    speed: 30,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    notes: "",
  };
}

export function mod(score: number) {
  return Math.floor((score - 10) / 2);
}

export function modLabel(score: number) {
  const m = mod(score);
  return m >= 0 ? `+${m}` : String(m);
}
