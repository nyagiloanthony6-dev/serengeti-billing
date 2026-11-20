export function Logo({ small = false, onDark = false }: { small?: boolean; onDark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`inline-flex items-center justify-center rounded-[10px] font-extrabold tracking-tighter text-white ${onDark ? 'bg-[#3B3FC4] shadow-[0_6px_16px_-6px_rgba(59,63,196,.9)]' : 'bg-indigo'} ${small ? 'h-8 w-8 text-base' : 'h-10 w-10 text-lg'}`}>
        s<span className={`font-medium ${onDark ? 'text-[#FFC043]' : 'text-saffron'}`}>/</span>
      </span>
      <span className={`font-extrabold tracking-tighter ${onDark ? 'text-white' : ''} ${small ? 'text-lg' : 'text-xl'}`}>
        serengeti<span className={`font-medium ${onDark ? 'text-[#FF7A55]' : 'text-coral'}`}>/</span><span className={`font-medium ${onDark ? 'text-[#8C90FF]' : 'text-indigo'}`}>labs</span>
      </span>
    </span>
  );
}
