alter table orders add column if not exists provider text not null default 'demo';
alter table orders add column if not exists provider_ref text;

insert into listings (id, seller_id, title, game, category, condition, price_cents, description, status)
values
  ('lst_playmat', 'shop', 'The Spade playmat — stitched edge', 'other', 'accessory', 'Sealed', 2499, 'Black field, silver spade. House mat. Pickup at the counter.', 'live'),
  ('lst_d20', 'shop', 'Penny d20 — pink resin', 'other', 'accessory', 'NM', 1800, 'One die. Reads as a warning and a blessing.', 'live'),
  ('lst_pin', 'shop', 'WildCard enamel pin', 'other', 'accessory', 'Sealed', 899, 'Spade mark. No ads on the card. Ever.', 'live')
on conflict (id) do nothing;
