-- ============================================================
-- EMPIRE — Esquema de base de datos (Supabase / Postgres)
-- Copia y pega este archivo completo en:
-- Supabase → SQL Editor → New query → Run
-- ============================================================

-- Perfiles de usuario (se crea solo al registrarse)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  plan text default 'Fundador',
  created_at timestamptz default now()
);

-- Hábitos
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text default 'General',
  created_at timestamptz default now()
);

-- Registro diario de cumplimiento de hábitos
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references habits(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  done_on date default current_date not null,
  unique (habit_id, done_on)
);

-- Trading
create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  pair text not null,
  type text check (type in ('Long','Short')) not null,
  result text check (result in ('win','loss')) not null,
  pnl numeric not null,
  traded_at timestamptz default now()
);

-- Finanzas
create table if not exists finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('income','expense','saving','investment')) not null,
  amount numeric not null,
  note text,
  created_at timestamptz default now()
);

-- Entrenamiento
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  duration_minutes int not null,
  note text,
  created_at timestamptz default now()
);

create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  kg numeric not null,
  logged_at date default current_date
);

-- Dropshipping
create table if not exists dropship_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  price numeric default 0,
  created_at timestamptz default now()
);

create table if not exists dropship_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references dropship_products(id) on delete set null,
  product_name text,
  revenue numeric not null,
  cost numeric default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- Crear perfil automáticamente al registrarse
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Fundador'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- Seguridad: cada usuario solo ve y edita SUS PROPIOS datos
-- ============================================================
alter table profiles enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table trades enable row level security;
alter table finance_transactions enable row level security;
alter table workouts enable row level security;
alter table weight_logs enable row level security;
alter table dropship_products enable row level security;
alter table dropship_orders enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own habits" on habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own habit_logs" on habit_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own trades" on trades for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own finance" on finance_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own workouts" on workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own weight" on weight_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own products" on dropship_products for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own orders" on dropship_orders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
