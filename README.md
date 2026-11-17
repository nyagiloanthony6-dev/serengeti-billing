# Serengeti Labs · Billing admin

The private admin where Serengeti Labs (G2K GROUP TANZANIA LIMITED) bills clients for its products: TheDashboard, Shehena Cargo, Sipiki, WMS and FreightHub.

- **Clients and subscriptions**: each client, the products they use, and their setup fee, training fee and monthly fee.
- **Invoices**: numbered `SL-2026-0001`, amounts in TSh, optional 18% VAT, and a branded PDF with bank and mobile money details.
- **Payments and balances**: record mobile money, bank, cash or online payments. Invoices move to part paid or paid on their own, and the dashboard shows outstanding and overdue amounts.
- **Automatic monthly billing**: every day at 07:00 (Dar es Salaam time) the app creates that day's monthly invoices, one per client, with setup and training fees added to the first invoice. It then sends reminders 3 days before the due date, on the due date, and 3, 7, 14 and 30 days late.
- **Sales team and prospects**: sales officers sign in with their own account and only see their own prospects. For each business they record the name, contact person, phone, location (with an optional GPS pin), the product pitched, the day visited, and every follow-up after that. You see everyone's prospects, follow-ups that are due or overdue, and a scorecard for each officer, and you can turn a won prospect into a billing client with one click.
- **Messages**: a WhatsApp button on every invoice works with no setup. SMS (Africa's Talking) and email (Resend) start working once you add their keys.

Built with Next.js 14, Supabase (database and login) and Vercel (hosting and the daily job).

---

## Setup (about 15 minutes)

### 1. Supabase: database and login
1. Create a project at [supabase.com](https://supabase.com). The region closest to Tanzania is fine, for example `eu-central` or `ap-south`.
2. Open **SQL Editor › New query**, paste everything from `supabase/migrations/0001_billing.sql` and click **Run**.
3. Go to **Authentication › Sign In / Providers** and turn **off** "Allow new users to sign up", so nobody else can create an account.
4. Go to **Authentication › Users › Add user**. Enter your email and a strong password, and tick "Auto confirm".
5. Back in **SQL Editor**, make that user an admin. Change the email to yours, then run:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```
6. Copy three values:
   - **Project URL**: click **Connect** at the top of the project page, or go to **Project Settings › Data API**. It looks like `https://xxxx.supabase.co`.
   - **Publishable key** (`sb_publishable_…`) from **Project Settings › API Keys**.
   - **Secret key** (`sb_secret_…`) from the same page. Click to reveal or create one, and keep it private.
   - Older projects can use the **anon** and **service_role** keys from the **Legacy API Keys** tab instead.

### 2. Vercel: hosting
1. **Add New › Project** and import this GitHub repository. Leave the framework as Next.js.
2. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`) |
   | `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_…`) |
   | `CRON_SECRET` | any long random text, for example from a password generator |
   | `APP_URL` | `https://admin.serengetilabs.co.tz` |

3. Click **Deploy**, open the link and sign in.
4. Optional: in **Settings › Domains** add `admin.serengetilabs.co.tz`. At your domain provider, add a **CNAME** record with name `admin`, pointing to the target Vercel shows.

The daily billing job in `vercel.json` turns on automatically after the first deploy. Vercel calls `/api/cron/billing` with your `CRON_SECRET`.

### 3. First things to do in the app
1. **Settings**: add your TIN, bank account, mobile money details (for example your Lipa Namba) and VAT rate. Use 0 if you aren't VAT registered.
2. **Products & prices**: set list prices for each product.
3. **Clients**: add a client, then add a subscription. Prices fill in from the product and can be changed for that client.
4. Click **Invoice setup now** to bill setup and training right away, or let the daily job do it. You can also click **Run billing now** on the dashboard at any time.

### Sales team (added later)
1. In Supabase **SQL Editor › New query**, paste everything from `supabase/migrations/0002_sales.sql` and click **Run**. You only do this once.
2. In the app, open **Sales team** and add each sales officer with their name, phone, email and a starting password. Their account is created on the spot, and this needs `SUPABASE_SECRET_KEY` to be set in Vercel.
3. Share the email and password with them. They sign in at the same address, for example `admin.serengetilabs.co.tz`, and land on **My prospects**. They can't see invoices, clients, payments or settings.
4. If someone leaves, click **Turn off access**. Their prospects stay with you.

### Optional: SMS and email
Add these in Vercel › Settings › Environment Variables, then redeploy:
- **SMS ([Africa's Talking](https://africastalking.com))**: `AT_USERNAME`, `AT_API_KEY`, and `AT_SENDER_ID` if you have a registered sender name.
- **Email ([Resend](https://resend.com))**: `RESEND_API_KEY` and `EMAIL_FROM`, for example `Serengeti Labs <billing@serengetilabs.co.tz>`. Verify the domain in Resend first.

### Collecting payments online
The first version records payments made by mobile money or bank. Online collection (Selcom, AzamPay, ClickPesa or Pesapal) plugs into the invoice page once a provider account is ready.

---

## Run locally
```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev
```

## Security
- Every table has row level security. Only users listed in `public.admins` can read or change billing data.
- Sales staff (listed in `public.sales_staff` and active) can only read, add and edit their own prospects and follow-ups, and read the product list. Only admins can delete prospects.
- The secret key is used only by the daily job on the server. Never put it in a `NEXT_PUBLIC_` variable.
