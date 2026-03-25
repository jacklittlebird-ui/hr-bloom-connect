import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Landmark, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BankAccountTabProps {
  employee: Employee;
  onUpdate?: (updates: Partial<Employee>) => void;
  readOnly?: boolean;
}

const defaultBanks = [
  { value: 'credit_agricole', labelAr: 'كريدي أجريكول', labelEn: 'Crédit Agricole' },
  { value: 'nbe', labelAr: 'البنك الأهلي المصري', labelEn: 'National Bank of Egypt' },
  { value: 'cash', labelAr: 'نقدي', labelEn: 'Cash' },
  { value: 'other', labelAr: 'أخرى', labelEn: 'Other' },
];

export const BankAccountTab = ({ employee, onUpdate, readOnly }: BankAccountTabProps) => {
  const { isRTL, language } = useLanguage();
  const ar = language === 'ar';

  const [bankInfo, setBankInfo] = useState({
    accountNumber: employee.bankAccountNumber || '',
    bankId: employee.bankIdNumber || '',
    accountType: employee.bankAccountType || '',
    bankName: employee.bankName || '',
  });
  const [banks, setBanks] = useState(defaultBanks);
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBank, setNewBank] = useState({ labelAr: '', labelEn: '' });

  const updateBankField = (field: string, value: string) => {
    setBankInfo(p => ({ ...p, [field]: value }));
    const fieldMap: Record<string, keyof Employee> = {
      accountNumber: 'bankAccountNumber',
      bankId: 'bankIdNumber',
      accountType: 'bankAccountType',
      bankName: 'bankName',
    };
    onUpdate?.({ [fieldMap[field]]: value });
  };

  const handleAddBank = () => {
    if (!newBank.labelAr || !newBank.labelEn) return;
    const value = newBank.labelEn.toLowerCase().replace(/\s+/g, '_');
    setBanks(prev => [...prev, { value, ...newBank }]);
    setShowAddBank(false);
    setNewBank({ labelAr: '', labelEn: '' });
    toast({ title: ar ? 'تمت الإضافة' : 'Added' });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className={cn("flex items-center gap-2 text-lg", isRTL && "flex-row-reverse")}>
            <Landmark className="h-5 w-5 text-primary" />
            {ar ? 'بيانات الحساب البنكي' : 'Bank Account Info'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className={cn("text-xs", isRTL && "text-right block")}>{ar ? 'رقم الحساب البنكي' : 'Bank Account Number'}</Label>
              <Input value={bankInfo.accountNumber} onChange={e => updateBankField('accountNumber', e.target.value)} className={cn("h-9 text-sm", isRTL && "text-right")} />
            </div>
            <div className="space-y-1.5">
              <Label className={cn("text-xs", isRTL && "text-right block")}>{ar ? 'رقم الـ ID البنكي' : 'Bank ID Number'}</Label>
              <Input value={bankInfo.bankId} onChange={e => updateBankField('bankId', e.target.value)} className={cn("h-9 text-sm", isRTL && "text-right")} />
            </div>
            <div className="space-y-1.5">
              <Label className={cn("text-xs", isRTL && "text-right block")}>{ar ? 'نوع الحساب البنكي' : 'Account Type'}</Label>
              <Input value={bankInfo.accountType} onChange={e => updateBankField('accountType', e.target.value)} className={cn("h-9 text-sm", isRTL && "text-right")} />
            </div>
            <div className="space-y-1.5">
              <Label className={cn("text-xs", isRTL && "text-right block")}>{ar ? 'اسم البنك' : 'Bank Name'}</Label>
              <div className="flex gap-2">
                <Select value={bankInfo.bankName} onValueChange={v => updateBankField('bankName', v)}>
                  <SelectTrigger className="h-9 text-sm flex-1"><SelectValue placeholder={ar ? '-- اختر البنك --' : '-- Select --'} /></SelectTrigger>
                  <SelectContent>
                    {banks.map(b => <SelectItem key={b.value} value={b.value}>{ar ? b.labelAr : b.labelEn}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="h-9 px-2" onClick={() => setShowAddBank(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Bank Dialog */}
      <Dialog open={showAddBank} onOpenChange={setShowAddBank}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{ar ? 'إضافة بنك جديد' : 'Add New Bank'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{ar ? 'اسم البنك (عربي)' : 'Bank Name (Arabic)'}</Label>
              <Input value={newBank.labelAr} onChange={e => setNewBank(p => ({ ...p, labelAr: e.target.value }))} className={cn(isRTL && "text-right")} />
            </div>
            <div className="space-y-1.5">
              <Label>{ar ? 'اسم البنك (إنجليزي)' : 'Bank Name (English)'}</Label>
              <Input value={newBank.labelEn} onChange={e => setNewBank(p => ({ ...p, labelEn: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddBank}>{ar ? 'إضافة' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
