-- The Spade — members, vault, sheets, penny, events
create table if not exists profiles (
  user_id text primary key,
  handle text not null unique,
  display_name text not null,
  bio text not null default '',
  invited boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists listings (
  id text primary key,
  seller_id text not null,
  title text not null,
  game text not null,
  category text not null,
  condition text not null,
  price_cents int not null,
  description text not null default '',
  status text not null default 'live',
  created_at timestamptz not null default now()
);
create index if not exists listings_status_idx on listings (status, created_at desc);
create index if not exists listings_seller_idx on listings (seller_id);

create table if not exists orders (
  id text primary key,
  buyer_id text not null,
  listing_id text not null,
  seller_id text not null,
  amount_cents int not null,
  status text not null,
  card_last4 text,
  card_brand text,
  created_at timestamptz not null default now()
);
create index if not exists orders_buyer_idx on orders (buyer_id, created_at desc);

create table if not exists sheets (
  id text primary key,
  user_id text not null,
  system text not null,
  name text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists sheets_user_idx on sheets (user_id, updated_at desc);

create table if not exists penny_threads (
  id text primary key,
  user_id text not null,
  mode text not null,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists penny_messages (
  id text primary key,
  thread_id text not null,
  user_id text not null,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists penny_messages_thread_idx on penny_messages (thread_id, created_at);

create table if not exists events (
  id text primary key,
  title text not null,
  game text not null,
  starts_at timestamptz not null,
  seats int not null,
  blurb text not null,
  host text not null default 'Penny'
);

create table if not exists rsvps (
  event_id text not null,
  user_id text not null,
  primary key (event_id, user_id)
);

insert into listings (id, seller_id, title, game, category, condition, price_cents, description, status)
values
  ('lst_lotus', 'shop', 'Black Lotus — Alpha, lightly loved', 'mtg', 'single', 'LP', 1850000, 'Shop hold. Pickup at the counter after checkout. Authenticity photo on request.', 'live'),
  ('lst_bolas', 'shop', 'Nicol Bolas, Dragon-God foil', 'mtg', 'single', 'NM', 4200, 'War of the Spark. Sleeve from open. Spade slot image until the shop drops a photo.', 'live'),
  ('lst_ub', 'shop', 'Foundations booster box', 'mtg', 'sealed', 'Sealed', 12999, 'Still in shrink. Friday night crack optional.', 'live'),
  ('lst_luke', 'shop', 'Luke Skywalker — Hero of the Rebellion', 'swu', 'single', 'NM', 2800, 'Spark of Rebellion. Playable in Premier.', 'live'),
  ('lst_vader', 'shop', 'Darth Vader showcase', 'swu', 'single', 'LP', 3400, 'Corner nick. Plays fine. Penny will inspect if you are polite.', 'live'),
  ('lst_swu_box', 'shop', 'Shadows of the Galaxy booster box', 'swu', 'sealed', 'Sealed', 10999, 'Sealed case break Saturday if we fill a table.', 'live'),
  ('lst_phb', 'shop', 'Player''s Handbook 2024', 'dnd', 'book', 'NM', 4999, 'Shelf copy. Character sheets in the app so you can leave the book here.', 'live'),
  ('lst_mm', 'shop', 'Monster Manual 2024', 'dnd', 'book', 'NM', 4999, 'Penny DMs out of this when nobody else will.', 'live'),
  ('lst_pf_core', 'shop', 'Pathfinder Player Core', 'pathfinder', 'book', 'NM', 5999, 'Remaster. Bring a sheet, not a binder war.', 'live'),
  ('lst_asm', 'shop', 'Amazing Spider-Man #300', 'comic', 'comic', 'VF', 8900, 'First Venom. Bagged and boarded. Counter pickup only.', 'live'),
  ('lst_watchmen', 'shop', 'Watchmen #1', 'comic', 'comic', 'NM', 4500, 'Miller cover. Shop copy.', 'live'),
  ('lst_sleeves', 'shop', 'Dragon Shield dual matte — 100', 'other', 'accessory', 'Sealed', 1299, 'Jet black. Matches the table.', 'live')
on conflict (id) do nothing;

insert into events (id, title, game, starts_at, seats, blurb, host)
values
  ('ev_fnm', 'Friday Night Magic — Pioneer', 'mtg', '2026-08-28 18:30:00-05', 16, 'Standard-ish Pioneer. $10 entry, packs to top 8. Pay in the Vault.', 'Penny'),
  ('ev_swu', 'Star Wars Unlimited — Premier', 'swu', '2026-08-29 13:00:00-05', 12, 'Bring a 50. Penny judges. Winner gets store credit.', 'Penny'),
  ('ev_dnd', 'D&D one-shot — The Spade Below', 'dnd', '2026-08-30 11:00:00-05', 5, 'Level 3 pregens or bring a sheet. Penny DMs. Four hours.', 'Penny'),
  ('ev_pf', 'Pathfinder Society table', 'pathfinder', '2026-09-02 18:00:00-05', 6, 'Beginner-friendly. Sheets in the binder. No homework.', 'Penny')
on conflict (id) do nothing;
