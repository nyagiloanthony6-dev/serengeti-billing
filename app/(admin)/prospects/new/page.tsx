import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { todayTZ } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { ProspectForm } from '../ProspectForm';

export const dynamic = 'force-dynamic';

export default async function NewProspect() {
  const s = await requireStaff();
  const supabase = createClient();
  const [{ data: products }, { data: staff }] = await Promise.all([
    supabase.from('products').select('name').eq('active', true).order('name'),
    s.role === 'admin' ? supabase.from('sales_staff').select('user_id, full_name').eq('active', true).order('full_name') : Promise.resolve({ data: null }),
  ]);
  return (
    <>
      <PageHeader kicker="Prospects" title="Add a prospect" />
      <div className="card p-5 sm:p-6">
        {s.role === 'admin' && !staff?.length
          ? <p className="text-sm text-muted">Add a sales officer under <a href="/sales-team" className="font-medium text-indigo underline">Sales team</a> first. Each prospect belongs to one officer.</p>
          : <ProspectForm products={(products ?? []).map((p: any) => p.name)} staff={s.role === 'admin' ? (staff as any[]) : undefined} today={todayTZ()} />}
      </div>
    </>
  );
}
