-- eFootball Market schema. Run in the Supabase SQL editor.

create type playstyle as enum ('possession','quick_counter','long_ball_counter','out_wide','long_ball');

create table listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 50),
  strength int not null check (strength between 1000 and 5000),
  formation text not null,
  playstyle playstyle not null,
  platform text not null check (platform in ('Android','iOS')),
  kit int not null default 5,
  coins int not null default 0,
  gp bigint not null default 0,
  player_types text[] not null default '{}',
  star_player text,
  star_player_rating int,
  star_player_playstyle text,
  star_player_image text,
  description text,
  price int,
  old_price int,
  whatsapp text not null,
  images text[] not null default '{}',
  status text not null default 'pending_payment' check (status in ('pending_payment','active','sold')),
  created_at timestamptz not null default now()
);
create index on listings (status, created_at desc);

create table payments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  seller_id uuid not null,
  amount int not null,
  network text not null,
  phone text not null,
  reference text not null unique,
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  created_at timestamptz not null default now()
);

alter table listings enable row level security;
alter table payments enable row level security;

-- Pay-first rule: the public only ever sees ACTIVE listings.
create policy "public reads active" on listings for select using (status = 'active');
create policy "seller reads own" on listings for select to authenticated using (seller_id = auth.uid());
-- Sellers can only create listings in the unpaid state. Only the payment function (service role) can activate one.
create policy "seller inserts pending" on listings for insert to authenticated
  with check (seller_id = auth.uid() and status = 'pending_payment');
create policy "seller deletes own" on listings for delete to authenticated using (seller_id = auth.uid());
create policy "seller edits own" on listings for update to authenticated using (seller_id = auth.uid()) with check (seller_id = auth.uid());
-- Column-level lock: sellers cannot touch status.
revoke update on listings from authenticated;
grant update (price, old_price, description, whatsapp, star_player) on listings to authenticated;

create policy "seller reads own payments" on payments for select to authenticated using (seller_id = auth.uid());
-- No insert/update policies on payments: only the service role (Edge Functions) writes there.

create function mark_sold(p_id uuid) returns void language sql security definer set search_path = public as $$
  update listings set status = 'sold' where id = p_id and seller_id = auth.uid() and status = 'active';
$$;

-- Screenshots bucket
insert into storage.buckets (id, name, public) values ('screenshots', 'screenshots', true) on conflict do nothing;
create policy "public reads screenshots" on storage.objects for select using (bucket_id = 'screenshots');
create policy "seller uploads to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
