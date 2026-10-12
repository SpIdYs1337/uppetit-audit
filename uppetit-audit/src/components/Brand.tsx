import Image from 'next/image';

export function Brand({ compact = false }: { compact?: boolean }) {
  if (compact) return <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] text-sm font-extrabold" title="UPPETIT">UP</span>;
  return <span className="inline-block shrink-0"><Image src="/logo3.png" alt="UPPETIT" width={132} height={34} style={{ height: 'auto' }} className="dark:hidden object-contain" priority unoptimized /><Image src="/logo.jpg" alt="UPPETIT" width={132} height={34} style={{ height: 'auto' }} className="hidden dark:block object-contain" priority unoptimized /></span>;
}
