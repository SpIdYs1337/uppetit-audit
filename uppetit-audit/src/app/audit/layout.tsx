export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white md:bg-[#F5F6F8]">
      <div className="w-full max-w-5xl mx-auto min-h-screen flex flex-col relative">
        {children}
      </div>
    </div>
  );
}