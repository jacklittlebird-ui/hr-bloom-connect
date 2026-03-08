import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UniformItem {
  id: number;
  employeeId: string;
  typeAr: string;
  typeEn: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deliveryDate: string;
  notes?: string;
}

export const UNIFORM_TYPES = [
  { ar: 'قميص أبيض', en: 'White Shirt' },
  { ar: 'قميص لبني', en: 'Light Blue Shirt' },
  { ar: 'بنطلون كحلي', en: 'Navy Pants' },
  { ar: 'جاكيت بدلة كحلي', en: 'Navy Suit Jacket' },
  { ar: 'بلوفر', en: 'Pullover' },
  { ar: 'كرافت', en: 'Tie' },
  { ar: 'إيشارب', en: 'Scarf' },
  { ar: 'بلوزة حريمي', en: 'Women Blouse' },
];

export function getDepreciationPercent(deliveryDate: string): number {
  const delivery = new Date(deliveryDate);
  const now = new Date();
  const months = (now.getFullYear() - delivery.getFullYear()) * 12 + (now.getMonth() - delivery.getMonth());
  if (months >= 12) return 0;
  if (months >= 9) return 25;
  if (months >= 6) return 50;
  if (months >= 3) return 75;
  return 100;
}

export function getCurrentValue(totalPrice: number, deliveryDate: string): number {
  return totalPrice * (getDepreciationPercent(deliveryDate) / 100);
}

export function isExpired(deliveryDate: string): boolean {
  return getDepreciationPercent(deliveryDate) === 0;
}

interface UniformDataContextType {
  uniforms: UniformItem[];
  refreshUniforms: () => Promise<void>;
  addUniform: (item: Omit<UniformItem, 'id'>) => void;
  deleteUniform: (id: number) => void;
  updateUniform: (id: number, updates: Partial<UniformItem>) => void;
  getEmployeeUniforms: (employeeId: string) => UniformItem[];
}

const UniformDataContext = createContext<UniformDataContextType | undefined>(undefined);

const mapRow = (r: any): UniformItem => ({
  id: r.id, // UUID but cast
  employeeId: r.employee_id,
  typeAr: r.type_ar,
  typeEn: r.type_en,
  quantity: r.quantity,
  unitPrice: r.unit_price ?? 0,
  totalPrice: r.total_price ?? 0,
  deliveryDate: r.delivery_date,
  notes: r.notes || undefined,
});

export const UniformDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uniforms, setUniforms] = useState<UniformItem[]>([]);

  const fetchUniforms = useCallback(async () => {
    const { data } = await supabase.from('uniforms').select('*').order('delivery_date', { ascending: false });
    if (data) setUniforms(data.map(mapRow));
  }, []);

  useEffect(() => {
    fetchUniforms();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') fetchUniforms();
    });
    return () => subscription.unsubscribe();
  }, [fetchUniforms]);

  const addUniform = useCallback(async (item: Omit<UniformItem, 'id'>) => {
    await supabase.from('uniforms').insert({
      employee_id: item.employeeId,
      type_ar: item.typeAr,
      type_en: item.typeEn,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      delivery_date: item.deliveryDate,
      notes: item.notes || null,
    });
    await fetchUniforms();
  }, [fetchUniforms]);

  const deleteUniform = useCallback(async (id: number) => {
    await supabase.from('uniforms').delete().eq('id', id as any);
    await fetchUniforms();
  }, [fetchUniforms]);

  const updateUniform = useCallback(async (id: number, updates: Partial<UniformItem>) => {
    const payload: any = {};
    if (updates.typeAr !== undefined) payload.type_ar = updates.typeAr;
    if (updates.typeEn !== undefined) payload.type_en = updates.typeEn;
    if (updates.quantity !== undefined) payload.quantity = updates.quantity;
    if (updates.unitPrice !== undefined) payload.unit_price = updates.unitPrice;
    if (updates.deliveryDate !== undefined) payload.delivery_date = updates.deliveryDate;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    await supabase.from('uniforms').update(payload).eq('id', id as any);
    await fetchUniforms();
  }, [fetchUniforms]);

  const getEmployeeUniforms = useCallback((employeeId: string) => {
    return uniforms.filter(u => u.employeeId === employeeId && !isExpired(u.deliveryDate));
  }, [uniforms]);

  return (
    <UniformDataContext.Provider value={{ uniforms, refreshUniforms: fetchUniforms, addUniform, deleteUniform, updateUniform, getEmployeeUniforms }}>
      {children}
    </UniformDataContext.Provider>
  );
};

export const useUniformData = () => {
  const ctx = useContext(UniformDataContext);
  if (!ctx) throw new Error('useUniformData must be used within UniformDataProvider');
  return ctx;
};
