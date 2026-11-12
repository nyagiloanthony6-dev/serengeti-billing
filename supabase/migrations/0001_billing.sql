-- Serengeti Labs billing admin: schema, security and seed data.
-- Run once in Supabase: SQL Editor > New query > paste > Run.


-- ---------- Admins ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- Company settings (one row) ----------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  company_name text not null default 'G2K GROUP TANZANIA LIMITED',
  brand_name text not null default 'Serengeti Labs',
  address text default 'Dar es Salaam, Tanzania',
  phone text default '+255 754 711 063',
  email text default '',
  tin text default '',
  vrn text default '',
  bank_name text default '',
  bank_account_name text default 'G2K GROUP TANZANIA LIMITED',
  bank_account_number text default '',
  bank_branch text default '',
  bank_swift text default '',
  mobile_money text default '',
  invoice_prefix text not null default 'SL',
  next_invoice_no int not null default 1,
  default_due_days int not null default 7,
  vat_rate numeric(5,2) not null default 0,
  invoice_footer text default 'Thank you for choosing Serengeti Labs.',
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------- Products ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text default '',
  setup_fee numeric(14,2) not null default 0,
  training_fee numeric(14,2) not null default 0,
  monthly_fee numeric(14,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.products (name, code, description) values
  ('TheDashboard', 'DASH', 'Point of sale and stock management'),
  ('Shehena Cargo', 'SHEHENA', 'Road and air cargo management'),
  ('Sipiki', 'SIPIKI', 'Multivendor marketplace'),
  ('WMS', 'WMS', 'Warehouse management system'),
  ('FreightHub', 'FHUB', 'LCL and FCL tracking')
on conflict (code) do nothing;

-- ---------- Clients ----------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text default '',
  phone text default '',
  email text default '',
  tin text default '',
  address text default '',
  notes text default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Subscriptions ----------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  product_id uuid not null references public.products(id),
  setup_fee numeric(14,2) not null default 0,
  training_fee numeric(14,2) not null default 0,
  monthly_fee numeric(14,2) not null default 0,
  billing_day int not null default 1 check (billing_day between 1 and 28),
  start_date date not null default current_date,
  status text not null default 'active' check (status in ('active','paused','cancelled')),
  setup_invoiced boolean not null default false,
  notes text default '',
  created_at timestamptz not null default now()
);
create index if not exists subscriptions_client_idx on public.subscriptions(client_id);

-- ---------- Invoices ----------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  client_id uuid not null references public.clients(id),
  issue_date date not null default current_date,
  due_date date not null,
  period_start date,
  period_end date,
  status text not null default 'draft'
    check (status in ('draft','sent','partially_paid','paid','void')),
  vat_rate numeric(5,2) not null default 0,
  subtotal numeric(14,2) not null default 0,
  vat_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  notes text default '',
  auto_generated boolean not null default false,
  last_reminder_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists invoices_client_idx on public.invoices(client_id);
create index if not exists invoices_status_idx on public.invoices(status);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  kind text not null default 'other' check (kind in ('setup','training','monthly','other')),
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  amount numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  sort int not null default 0
);
create index if not exists invoice_items_invoice_idx on public.invoice_items(invoice_id);

-- ---------- Payments ----------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  method text not null default 'mobile_money'
    check (method in ('mobile_money','bank','cash','online','other')),
  reference text default '',
  paid_at date not null default current_date,
  notes text default '',
  created_at timestamptz not null default now()
);
create index if not exists payments_invoice_idx on public.payments(invoice_id);

-- ---------- Reminder log ----------
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  channel text not null check (channel in ('sms','email','whatsapp')),
  status text not null default 'sent',
  detail text default '',
  created_at timestamptz not null default now()
);

-- ---------- Totals: keep invoice totals and status in step ----------
create or replace function public.recalc_invoice(p_invoice uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_sub numeric(14,2);
  v_rate numeric(5,2);
  v_paid numeric(14,2);
  v_total numeric(14,2);
  v_status text;
begin
  if coalesce(auth.role(),'') <> 'service_role' and not public.is_admin() then
    raise exception 'not allowed';
  end if;
  select coalesce(sum(amount),0) into v_sub from invoice_items where invoice_id = p_invoice;
  select vat_rate, status into v_rate, v_status from invoices where id = p_invoice;
  select coalesce(sum(amount),0) into v_paid from payments where invoice_id = p_invoice;
  v_total := v_sub + round(v_sub * v_rate / 100, 2);
  update invoices set
    subtotal = v_sub,
    vat_amount = round(v_sub * v_rate / 100, 2),
    total = v_total,
    amount_paid = v_paid,
    status = case
      when v_status in ('void','draft') then v_status
      when v_paid >= v_total and v_total > 0 then 'paid'
      when v_paid > 0 then 'partially_paid'
      else 'sent' end
  where id = p_invoice;
end $$;

create or replace function public.trg_items_recalc() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform recalc_invoice(coalesce(new.invoice_id, old.invoice_id));
  return null;
end $$;

drop trigger if exists items_recalc on public.invoice_items;
create trigger items_recalc after insert or update or delete on public.invoice_items
  for each row execute function public.trg_items_recalc();

drop trigger if exists payments_recalc on public.payments;
create trigger payments_recalc after insert or update or delete on public.payments
  for each row execute function public.trg_items_recalc();

-- ---------- Invoice numbers: SL-2026-0001 ----------
create or replace function public.next_invoice_number() returns text
language plpgsql security definer set search_path = public as $$
declare v_no int; v_prefix text;
begin
  if coalesce(auth.role(),'') <> 'service_role' and not public.is_admin() then
    raise exception 'not allowed';
  end if;
  update settings set next_invoice_no = next_invoice_no + 1 where id = 1
    returning next_invoice_no - 1, invoice_prefix into v_no, v_prefix;
  return v_prefix || '-' || to_char(current_date, 'YYYY') || '-' || lpad(v_no::text, 4, '0');
end $$;

-- ---------- Balances view ----------
create or replace view public.client_balances with (security_invoker = true) as
select c.id as client_id, c.name,
  coalesce(sum(i.total) filter (where i.status not in ('void','draft')),0) as billed,
  coalesce(sum(i.amount_paid) filter (where i.status not in ('void','draft')),0) as paid,
  coalesce(sum(i.total - i.amount_paid) filter (where i.status in ('sent','partially_paid')),0) as outstanding,
  coalesce(sum(i.total - i.amount_paid) filter (where i.status in ('sent','partially_paid') and i.due_date < current_date),0) as overdue
from clients c left join invoices i on i.client_id = c.id
group by c.id, c.name;

-- ---------- Row level security: admins only ----------
do $$
declare t text;
begin
  foreach t in array array['settings','products','clients','subscriptions','invoices','invoice_items','payments','reminders','admins']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format('create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

grant execute on function public.next_invoice_number() to authenticated;
grant execute on function public.recalc_invoice(uuid) to authenticated;
