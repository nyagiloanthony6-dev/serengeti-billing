export type Settings = {
  id: number; company_name: string; brand_name: string; address: string | null; phone: string | null;
  email: string | null; tin: string | null; vrn: string | null; bank_name: string | null;
  bank_account_name: string | null; bank_account_number: string | null; bank_branch: string | null;
  bank_swift: string | null; mobile_money: string | null; invoice_prefix: string; next_invoice_no: number;
  default_due_days: number; vat_rate: number; invoice_footer: string | null;
};
export type Product = { id: string; name: string; code: string; description: string | null; setup_fee: number; training_fee: number; monthly_fee: number; active: boolean };
export type Client = { id: string; name: string; contact_person: string | null; phone: string | null; email: string | null; tin: string | null; address: string | null; notes: string | null; active: boolean; created_at: string };
export type Subscription = { id: string; client_id: string; product_id: string; setup_fee: number; training_fee: number; monthly_fee: number; billing_day: number; start_date: string; status: 'active' | 'paused' | 'cancelled'; setup_invoiced: boolean; notes: string | null; products?: Product };
export type Invoice = { id: string; number: string; client_id: string; issue_date: string; due_date: string; period_start: string | null; period_end: string | null; status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'void'; vat_rate: number; subtotal: number; vat_amount: number; total: number; amount_paid: number; notes: string | null; auto_generated: boolean; last_reminder_at: string | null; created_at: string; clients?: Client };
export type InvoiceItem = { id: string; invoice_id: string; subscription_id: string | null; kind: 'setup' | 'training' | 'monthly' | 'other'; description: string; quantity: number; unit_price: number; amount: number; sort: number };
export type Payment = { id: string; invoice_id: string; amount: number; method: string; reference: string | null; paid_at: string; notes: string | null; created_at: string };
