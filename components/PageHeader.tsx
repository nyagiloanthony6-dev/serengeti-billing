export function PageHeader({ kicker, title, children }: { kicker?: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-1.5">
        {kicker && <div className="kicker">{kicker}</div>}
        <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[32px]">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
