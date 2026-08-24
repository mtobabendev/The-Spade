export const NEXUS_GITHUB = "https://github.com/mtobabendev";

export const REPOS = {
  fleck: "https://github.com/mtobabendev/Arthur-Fleck-FB",
  nexus: "https://github.com/mtobabendev/The-Nexus",
  labs: "https://github.com/mtobabendev/WildCard-Labs",
  party: "https://github.com/mtobabendev/wildcard-party",
  office: "https://github.com/mtobabendev/wildcard-office",
  gotham: "https://github.com/mtobabendev/Gotham-Messenger",
  garage: "https://github.com/mtobabendev/Rick-Garage",
  starter: "https://github.com/mtobabendev/AI-Starter-Stuff",
  approachArchive: "https://github.com/mtobabendev/differentapproach-reference-archive",
} as const;

export const LIVE = {
  party: "https://wildcard-party.vercel.app",
  office: "https://wildcard-office.vercel.app",
  labs: "https://wild-card-labs.vercel.app",
  markV: "https://wild-card-mark-v.vercel.app",
  da: "https://differentapproachomaha.org",
} as const;

export const JUSTIN = {
  name: "Justin Luce",
  url: "https://www.justinlucedev.com/",
  note: "The teacher who started this. Collaborator on some of these builds. Penny had her name before we knew Justin — the overlap is a coincidence and a compliment.",
} as const;

export type NexusPath =
  | "/nexus"
  | "/nexus/party"
  | "/nexus/labs"
  | "/nexus/office"
  | "/nexus/messenger"
  | "/nexus/garage"
  | "/nexus/approach";

export type NexusRoom = {
  id: string;
  label: string;
  rank: string;
  to: NexusPath;
  kicker: string;
  blurb: string;
  repo: string;
};

export const NEXUS_ROOMS: NexusRoom[] = [
  {
    id: "hub",
    label: "Hub",
    rank: "A",
    to: "/nexus",
    kicker: "Personal page",
    blurb: "Matt owns it. Matt pays for it. Top admin for the whole deck.",
    repo: REPOS.nexus,
  },
  {
    id: "party",
    label: "Pool",
    rank: "2",
    to: "/nexus/party",
    kicker: "What Facebook could be",
    blurb: "A kiddie pool with no ads. Bring water wings. Meta already banned the last one.",
    repo: REPOS.party,
  },
  {
    id: "labs",
    label: "Labs",
    rank: "3",
    to: "/nexus/labs",
    kicker: "Placeholder",
    blurb: "Watch first. Phone and desktop are the theater. Official surfaces only.",
    repo: REPOS.labs,
  },
  {
    id: "office",
    label: "Office",
    rank: "4",
    to: "/nexus/office",
    kicker: "Coming home",
    blurb: "For the guys and gals coming out of prison. Matt included.",
    repo: REPOS.office,
  },
  {
    id: "messenger",
    label: "Gotham",
    rank: "5",
    to: "/nexus/messenger",
    kicker: "House chat",
    blurb: "The messenger without the ad farm. Clock tower, not a newsfeed.",
    repo: REPOS.gotham,
  },
  {
    id: "garage",
    label: "Garage",
    rank: "6",
    to: "/nexus/garage",
    kicker: "Ask Rick",
    blurb: "A real garage AI. Impatient, useful, slightly feral.",
    repo: REPOS.garage,
  },
  {
    id: "approach",
    label: "Mark I",
    rank: "7",
    to: "/nexus/approach",
    kicker: "Proof of fuckery",
    blurb: "ChatGPT's archived site next to the Grok rebuild. Same tab. Even on a phone.",
    repo: REPOS.approachArchive,
  },
];
