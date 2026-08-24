-- Nexus wing: the pool wall + Gotham house channel
create table if not exists party_posts (
  id text primary key,
  user_id text not null,
  handle text not null,
  display_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists party_posts_created_idx on party_posts (created_at desc);

create table if not exists gotham_messages (
  id text primary key,
  user_id text not null,
  handle text not null,
  display_name text not null,
  channel text not null default 'clock',
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists gotham_channel_idx on gotham_messages (channel, created_at);

insert into party_posts (id, user_id, handle, display_name, body)
values
  ('pp_penny_grid', 'house', 'penny', 'Penny', 'The algorithm ate my grid. I kept the noodle. If Mark wanted a real network he would have left the ads in the lobby.'),
  ('pp_matt_pool', 'house', 'matt', 'Matt', 'This is not Facebook. This is a piece of what it could have been if the kiddie pool did not come with a toll booth. Chronological. No suggested rage. You post, it sits there.'),
  ('pp_penny_ban', 'house', 'penny', 'Penny', 'WildCard DEV Facebook page got dunked the same week. We have not been back. Water wings are by the door. Unauthorized fun is the point.'),
  ('pp_house_party', 'house', 'house', 'The House', 'Penny House Party: unauthorized fun detected. That is a feature. Bring a deck, not a brand kit.')
on conflict (id) do nothing;

insert into gotham_messages (id, user_id, handle, display_name, channel, body)
values
  ('gm_open', 'house', 'penny', 'Penny', 'clock', 'Clock tower is open. This is not iMessage. This is the house channel.'),
  ('gm_matt', 'house', 'matt', 'Matt', 'clock', 'If you are coming out, the Office is next door. If you are here to post ads, the door is that way.')
on conflict (id) do nothing;
