export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`inline-flex items-center justify-center rounded-[10px] bg-indigo font-extrabold tracking-tighter text-white ${small ? 'h-8 w-8 text-base' : 'h-10 w-10 text-lg'}`}>
        s<span className="font-medium text-saffron">/</span>
      </span>
      <span className={`font-extrabold tracking-tighter ${small ? 'text-lg' : 'text-xl'}`}>
        serengeti<span className="font-medium text-coral">/</span><span className="font-medium text-indigo">labs</span>
      </span>
    </span>
  );
}
