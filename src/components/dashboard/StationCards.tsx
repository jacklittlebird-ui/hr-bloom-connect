import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StationData {
  id: string;
  name_ar: string;
  name_en: string;
  emp_count: number;
}

export const StationCards = () => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [stations, setStations] = useState<StationData[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data: stationsData } = await supabase
        .from('stations')
        .select('id, name_ar, name_en')
        .eq('is_active', true);

      const { data: empsData } = await supabase
        .from('employees')
        .select('station_id')
        .eq('status', 'active');

      if (stationsData) {
        const countMap: Record<string, number> = {};
        empsData?.forEach(e => {
          if (e.station_id) countMap[e.station_id] = (countMap[e.station_id] || 0) + 1;
        });

        const result = stationsData
          .map(s => ({ ...s, emp_count: countMap[s.id] || 0 }))
          .sort((a, b) => b.emp_count - a.emp_count);

        setStations(result);
      }
    };
    fetch();
  }, []);

  const colors = [
    'from-blue-500 to-blue-600',
    'from-emerald-500 to-teal-600',
    'from-violet-500 to-purple-600',
    'from-amber-500 to-orange-600',
    'from-pink-500 to-rose-600',
    'from-cyan-500 to-sky-600',
    'from-indigo-500 to-blue-700',
    'from-lime-500 to-green-600',
    'from-fuchsia-500 to-pink-600',
    'from-red-500 to-rose-700',
    'from-teal-500 to-cyan-600',
    'from-orange-500 to-amber-600',
    'from-sky-500 to-indigo-600',
    'from-green-500 to-emerald-600',
  ];

  if (!stations.length) return null;

  const totalEmployees = stations.reduce((s, st) => s + st.emp_count, 0);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">
          {ar ? 'الموظفون حسب المحطة' : 'Employees by Station'}
        </h3>
        <span className="text-sm text-muted-foreground ms-2">
          ({ar ? 'الإجمالي' : 'Total'}: {totalEmployees})
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
        {stations.map((station, i) => (
          <div
            key={station.id}
            className={cn(
              "relative overflow-hidden rounded-xl border border-border/50 p-4",
              "bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300",
              "group cursor-default"
            )}
          >
            <div className={cn(
              "absolute top-0 inset-x-0 h-1 bg-gradient-to-r",
              colors[i % colors.length]
            )} />
            <div className="flex flex-col items-center gap-2 text-center">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                "bg-gradient-to-br shadow-md",
                colors[i % colors.length],
                "group-hover:scale-110 transition-transform duration-300"
              )}>
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-foreground">{station.emp_count}</span>
              <span className="text-xs font-medium text-muted-foreground leading-tight line-clamp-1">
                {ar ? station.name_ar : station.name_en}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
