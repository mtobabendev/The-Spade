/** Spade Clash — original TCG, not Magic. Penny plays this when the table is empty. */

export type Faction = "spade" | "heart" | "club" | "diamond";

export type CardDef = {
  id: string;
  name: string;
  faction: Faction;
  cost: number;
  type: "creature" | "spell";
  atk?: number;
  hp?: number;
  text: string;
  effect?: "damage" | "heal" | "draw" | "pump";
  amount?: number;
};

export type Instance = {
  iid: string;
  defId: string;
  hp: number;
  sick: boolean;
};

export type PlayerState = {
  id: "you" | "penny";
  life: number;
  energy: number;
  maxEnergy: number;
  deck: string[];
  hand: string[];
  board: Instance[];
};

export type DuelState = {
  turn: "you" | "penny";
  phase: "main" | "over";
  winner: "you" | "penny" | null;
  you: PlayerState;
  penny: PlayerState;
  log: string[];
};

export const LIBRARY: CardDef[] = [
  { id: "ace", name: "Ace of Spades", faction: "spade", cost: 5, type: "creature", atk: 6, hp: 5, text: "The table's favorite argument." },
  { id: "jack", name: "Jack of Clubs", faction: "club", cost: 3, type: "creature", atk: 3, hp: 3, text: "Always has a sleeve somewhere." },
  { id: "queen", name: "Queen of Hearts", faction: "heart", cost: 4, type: "creature", atk: 3, hp: 5, text: "Holds the line." },
  { id: "king", name: "King of Diamonds", faction: "diamond", cost: 4, type: "creature", atk: 5, hp: 3, text: "Pays for itself in theory." },
  { id: "deuce", name: "Two of Spades", faction: "spade", cost: 1, type: "creature", atk: 1, hp: 2, text: "Blocks. That's the job." },
  { id: "three", name: "Three of Clubs", faction: "club", cost: 2, type: "creature", atk: 2, hp: 2, text: "Draft chaff with a chip on its shoulder." },
  { id: "four", name: "Four of Hearts", faction: "heart", cost: 2, type: "creature", atk: 1, hp: 4, text: "Wall with opinions." },
  { id: "seven", name: "Lucky Seven", faction: "diamond", cost: 3, type: "creature", atk: 4, hp: 2, text: "Hits hard. Leaves early." },
  { id: "cut", name: "Cut the Deck", faction: "spade", cost: 2, type: "spell", text: "Deal 3 to the opponent.", effect: "damage", amount: 3 },
  { id: "shuffle", name: "Shuffle Up", faction: "club", cost: 1, type: "spell", text: "Draw a card.", effect: "draw", amount: 1 },
  { id: "bind", name: "Binder Check", faction: "heart", cost: 2, type: "spell", text: "Gain 4 life.", effect: "heal", amount: 4 },
  { id: "foil", name: "Foil Finish", faction: "diamond", cost: 3, type: "spell", text: "Give a creature +2/+2.", effect: "pump", amount: 2 },
];

const DECK_PLAN: string[] = [
  "ace", "jack", "queen", "king",
  "deuce", "deuce", "three", "three", "four", "four", "seven", "seven",
  "cut", "cut", "shuffle", "shuffle", "bind", "bind", "foil", "foil",
];

function def(id: string) {
  const c = LIBRARY.find((x) => x.id === id);
  if (!c) throw new Error(`missing card ${id}`);
  return c;
}

function fisherYates(items: string[]) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function draw(p: PlayerState, n: number, log: string[], who: string) {
  for (let i = 0; i < n; i++) {
    const top = p.deck.shift();
    if (!top) {
      p.life -= 2;
      log.push(`${who} mills out. −2 life.`);
      continue;
    }
    if (p.hand.length >= 7) {
      log.push(`${who} discards ${def(top).name} (hand full).`);
    } else {
      p.hand.push(top);
    }
  }
}

function makePlayer(id: "you" | "penny"): PlayerState {
  const deck = fisherYates(DECK_PLAN);
  const hand = deck.splice(0, 4);
  return { id, life: 20, energy: 1, maxEnergy: 1, deck, hand, board: [] };
}

export function newDuel(): DuelState {
  const you = makePlayer("you");
  const penny = makePlayer("penny");
  const log = ["Penny sits. She cuts. You play first."];
  return { turn: "you", phase: "main", winner: null, you, penny, log };
}

function checkWinner(state: DuelState) {
  if (state.you.life <= 0) {
    state.winner = "penny";
    state.phase = "over";
    state.log.push("Penny stacks the deck. You are at 0.");
  } else if (state.penny.life <= 0) {
    state.winner = "you";
    state.phase = "over";
    state.log.push("Penny nods. Table is yours.");
  }
}

function applySpell(state: DuelState, actor: PlayerState, foe: PlayerState, card: CardDef) {
  if (card.effect === "damage") {
    foe.life -= card.amount ?? 0;
    state.log.push(`${actor.id === "you" ? "You" : "Penny"} casts ${card.name} for ${card.amount}.`);
  } else if (card.effect === "heal") {
    actor.life += card.amount ?? 0;
    state.log.push(`${card.name}: +${card.amount} life.`);
  } else if (card.effect === "draw") {
    draw(actor, card.amount ?? 1, state.log, actor.id === "you" ? "You" : "Penny");
    state.log.push(`${card.name}: draw.`);
  } else if (card.effect === "pump") {
    const t = actor.board[0];
    if (t) {
      t.hp += card.amount ?? 0;
      state.log.push(`${card.name} pumps ${def(t.defId).name}.`);
    } else {
      state.log.push(`${card.name} fizzles. No creature.`);
    }
  }
}

export function playCard(state: DuelState, who: "you" | "penny", handIndex: number): DuelState {
  if (state.phase !== "main" || state.turn !== who) return state;
  const actor = state[who];
  const foe = state[who === "you" ? "penny" : "you"];
  const cardId = actor.hand[handIndex];
  if (!cardId) return state;
  const card = def(cardId);
  if (actor.energy < card.cost) return state;
  actor.energy -= card.cost;
  actor.hand.splice(handIndex, 1);
  if (card.type === "creature") {
    actor.board.push({
      iid: crypto.randomUUID(),
      defId: card.id,
      hp: card.hp ?? 1,
      sick: true,
    });
    state.log.push(`${who === "you" ? "You" : "Penny"} plays ${card.name}.`);
  } else {
    applySpell(state, actor, foe, card);
  }
  checkWinner(state);
  return { ...state };
}

export function attackAll(state: DuelState, who: "you" | "penny"): DuelState {
  if (state.phase !== "main" || state.turn !== who) return state;
  const actor = state[who];
  const foe = state[who === "you" ? "penny" : "you"];
  const ready = actor.board.filter((c) => !c.sick);
  if (!ready.length) {
    state.log.push(`${who === "you" ? "You" : "Penny"} have no ready creatures.`);
    return passTurn(state, who);
  }
  let damage = 0;
  for (const c of ready) {
    damage += def(c.defId).atk ?? 0;
  }
  foe.life -= damage;
  state.log.push(`${who === "you" ? "You" : "Penny"} swing for ${damage}.`);
  checkWinner(state);
  if (state.winner) return { ...state };
  return passTurn(state, who);
}

export function passTurn(state: DuelState, who: "you" | "penny"): DuelState {
  if (state.phase !== "main" || state.turn !== who) return state;
  const next = who === "you" ? "penny" : "you";
  const p = state[next];
  p.maxEnergy = Math.min(8, p.maxEnergy + 1);
  p.energy = p.maxEnergy;
  for (const c of p.board) c.sick = false;
  draw(p, 1, state.log, next === "you" ? "You" : "Penny");
  state.turn = next;
  state.log.push(`${next === "you" ? "Your" : "Penny's"} turn. Energy ${p.energy}.`);
  checkWinner(state);
  return { ...state };
}

/** Heuristic Penny: spend down the hand, then attack or pass. */
export function pennyTurn(state: DuelState): DuelState {
  if (state.turn !== "penny" || state.phase !== "main") return state;
  let safety = 12;
  while (safety-- > 0) {
    const playable = state.penny.hand
      .map((id, i) => ({ i, c: def(id) }))
      .filter((x) => x.c.cost <= state.penny.energy)
      .sort((a, b) => b.c.cost - a.c.cost);
    if (!playable[0]) break;
    playCard(state, "penny", playable[0].i);
    if (state.winner) return { ...state };
  }
  const ready = state.penny.board.some((c) => !c.sick);
  if (ready) return attackAll(state, "penny");
  return passTurn(state, "penny");
}

export { def as cardDef };
