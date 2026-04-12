export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return (
    // Серый фон для всего экрана
    <div className="min-h-screen bg-gray-100 flex justify-center">
      {/* Белый контейнер, имитирующий экран телефона (макс. ширина 480px) */}
      <div className="w-full max-w-[480px] bg-white min-h-screen shadow-2xl relative flex flex-col">
        {children}
      </div>
    </div>
  );
}