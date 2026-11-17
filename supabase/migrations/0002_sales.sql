-- Serengeti Labs: sales staff and prospects.
-- Run once in Supabase after 0001: SQL Editor > New query > paste > Run.

-- ---------- Sales staff ----------
create table if not exists public.sales_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text default '',
  email text default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_sales() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sales_staff where user_id = auth.uid() and active);
$$;

-- ---------- Prospects: businesses a sales officer has contacted ----------
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  sales_user_id uuid not null default auth.uid() references public.sales_staff(user_id),
  business_name text not null,
  contact_person text default '',
  phone text default '',
  location text default '',
  latitude double precision,
  longitude double precision,
  products text[] not null default '{}',
  visited_on date not null default current_date,
  status text not null default 'new'
    check (status in ('new','interested','demo','negotiating','won','lost')),
  next_followup date,
  notes text default '',
  client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prospects_sales_idx on public.prospects(sales_user_id);
create index if not exists prospects_followup_idx on public.prospects(next_followup);

-- ---------- Follow-ups: every call, visit or message after the first ----------
create table if not exists public.prospect_followups (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  sales_user_id uuid not null default auth.uid() references auth.users(id),
  done_on date not null default current_date,
  method text not null default 'visit' check (method in ('visit','call','whatsapp','sms','demo')),
  outcome text not null default '',
  next_followup date,
  created_at timestamptz not null default now()
);
create index if not exists followups_prospect_idx on public.prospect_followups(prospect_id);

-- A new follow-up moves the prospect's next follow-up date along.
create or replace function public.trg_followup_next() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update prospects set next_followup = new.next_followup, updated_at = now() where id = new.prospect_id;
  return null;
end $$;
drop trigger if exists followup_next on public.prospect_followups;
create trigger followup_next after insert on public.prospect_followups
  for each row execute function public.trg_followup_next();

-- ---------- Row level security ----------
alter table public.sales_staff enable row level security;
alter table public.prospects enable row level security;
alter table public.prospect_followups enable row level security;

drop policy if exists admin_all on public.sales_staff;
create policy admin_all on public.sales_staff for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists sales_self on public.sales_staff;
create policy sales_self on public.sales_staff for select to authenticated using (user_id = auth.uid());

drop policy if exists admin_all on public.prospects;
create policy admin_all on public.prospects for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Sales staff see, add and edit only their own prospects. Only admins delete.
drop policy if exists sales_own on public.prospects;
drop policy if exists sales_select on public.prospects;
drop policy if exists sales_insert on public.prospects;
drop policy if exists sales_update on public.prospects;
create policy sales_select on public.prospects for select to authenticated
  using (public.is_sales() and sales_user_id = auth.uid());
create policy sales_insert on public.prospects for insert to authenticated
  with check (public.is_sales() and sales_user_id = auth.uid() and client_id is null);
create policy sales_update on public.prospects for update to authenticated
  using (public.is_sales() and sales_user_id = auth.uid())
  with check (public.is_sales() and sales_user_id = auth.uid());

drop policy if exists admin_all on public.prospect_followups;
create policy admin_all on public.prospect_followups for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists sales_own on public.prospect_followups;
drop policy if exists sales_select on public.prospect_followups;
drop policy if exists sales_insert on public.prospect_followups;
create policy sales_select on public.prospect_followups for select to authenticated
  using (public.is_sales() and exists (select 1 from prospects p where p.id = prospect_id and p.sales_user_id = auth.uid()));
create policy sales_insert on public.prospect_followups for insert to authenticated
  with check (public.is_sales() and sales_user_id = auth.uid()
    and exists (select 1 from prospects p where p.id = prospect_id and p.sales_user_id = auth.uid()));

-- Sales staff can see the product list (to pick what they pitched), nothing else from billing.
drop policy if exists sales_read on public.products;
create policy sales_read on public.products for select to authenticated using (public.is_sales());

grant execute on function public.is_sales() to authenticated;
