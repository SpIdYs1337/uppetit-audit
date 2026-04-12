'use client';

import { useState, useEffect } from 'react';

export default function AdminSchedulePage() {
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/schedule').then(res => res.json()).then(setPlans);
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-black text-gray-900 mb-8">Планы объездов</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white p-6 rounded-3xl shadow-sm border border-l-4 border-l-[#F25C05] border-gray-100">
            <div className="text-sm font-bold text-gray-400 mb-2">{new Date(plan.date).toLocaleDateString('ru-RU')}</div>
            <div className="text-xl font-black text-gray-900 mb-1">{plan.location?.name}</div>
            <div className="text-sm font-bold text-blue-600 bg-blue-50 inline-block px-3 py-1 rounded-lg mt-2">
              Аудитор: {plan.user?.login}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}