-- Daily WhatsApp Challenge - initial schema (plaintext credentials as requested; harden later)
create table if not exists public.app_users (
  username text primary key,
  password text not null,
  name text not null,
  phone text not null,
  referral_code text unique not null,
  referred_by text,
  wallet numeric not null default 0,
  tasks_done int not null default 0,
  first_task_done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.businesses (
  username text primary key,
  password text not null,
  name text not null,
  phone text not null,
  category text,
  employees text,
  target_audience text,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('free','paid')),
  name text not null,
  image_url text not null,
  required_views int not null,
  payout numeric not null,
  unlock_amount numeric default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_username text not null,
  whatsapp_number text not null,
  unlock_transaction_id text,
  proof_image_url text,
  views int,
  status text not null default 'assigned' check (status in ('assigned','submitted','approved','rejected')),
  reject_reason text,
  assigned_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  business_username text not null,
  image_url text not null,
  transaction_id text not null,
  amount numeric not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reject_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_username text not null,
  amount numeric not null,
  method text not null,
  details text not null,
  status text not null default 'pending' check (status in ('pending','done')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.wallet_history (
  id uuid primary key default gen_random_uuid(),
  user_username text not null,
  amount numeric not null,
  type text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.settings (key, value) values
  ('upi_id', '"admin@upi"'::jsonb),
  ('terms_url', '""'::jsonb),
  ('about_url', '""'::jsonb),
  ('rejection_terms_url', '""'::jsonb),
  ('carousel_images', '[]'::jsonb),
  ('max_free_task_per_user', '5'::jsonb),
  ('referral_percent', '10'::jsonb),
  ('business_package', '{"name":"","amount":0,"views":0,"short":"","long_url":"","duration":""}'::jsonb)
on conflict (key) do nothing;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
