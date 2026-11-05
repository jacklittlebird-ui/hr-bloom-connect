import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Landmark, Wallet } from 'lucide-react';

interface BankAccountTabProps {
  employee: Employee;
  onUpdate?: (updates: Partial<Employee>) => void;
  readOnly?: boolean;
}

type SalaryBank = 'credit_agricole' | 'nbe' | 'cash';

export const BankAccountTab = ({ employee, onUpdate, readOnly }: BankAccountTabProps) => {
  const { isRTL, language } = useLanguage();
  const ar = language === 'ar';

  const [s, setS] = useState({
    bankAccountNumber: employee.bankAccountNumber || '',
    bankIdNumber: employee.bankIdNumber || '',
    bankAccountType: employee.bankAccountType || '',
    nbeAccountNumber: employee.nbeAccountNumber || '',
    creditAccountActive: employee.creditAccountActive ?? true,
    nbeAccountActive: employee.nbeAccountActive ?? false,
    salaryBank: (employee.salaryBank || 'credit_agricole') as SalaryBank,
  });

  const set = (updates: Partial<typeof s>) => {
    setS(p => ({ ...p, ...updates }));
    onUpdate?.(updates as Partial<Employee>);
  };

  const nbeInvalid = s.nbeAccountNumber.length > 0 && !/^\d{19}$/.test(s.nbeAccountNumber);

  const banks: { value: SalaryBank; label: string; enabled: boolean }[] = [
    { value: 'credit_agricole', label: ar ? 'كريدي أجريكول' : 'Crédit Agricole', enabled: s.creditAccountActive },
    { value: 'nbe', label: ar ? 'البنك الأهلي' : 'NBE', enabled: s.nbeAccountActive },
    { value: 'cash', label: ar ? 'نقدي' : 'Cash', enabled: !s.creditAccountActive && !s.nbeAccountActive },
  ];

  const toggleAccount = (bank: 'credit' | 'nbe', on: boolean) => {
    // Only one bank can be active: activating one disables the other.
    if (on) {
      set(bank === 'credit'
        ? { creditAccountActive: true, nbeAccountActive: false, salaryBank: 'credit_agricole' }
        : { nbeAccountActive: true, creditAccountActive: false, salaryBank: 'nbe' });
    } else {
      set(bank === 'credit'
        ? { creditAccountActive: false, salaryBank: 'cash' }
        : { nbeAccountActive: false, salaryBank: 'cash' });
    }
  };

  const lbl = cn("text-xs", isRTL && "text-right block");
  const inp = cn("h-9 text-sm", isRTL && "text-right");

  return (
    <div className={cn("p-4 md:p-6 space-y-6", readOnly && "pointer-events-none")}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-primary" />
            {ar ? 'البنك الذي يحول عليه الراتب' : 'Salary transfer bank'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {banks.map(b => (
            <button
              key={b.value}
              type="button"
              disabled={!b.enabled}
              onClick={() => set({ salaryBank: b.value })}
              className={cn(
                "px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-40",
                s.salaryBank === b.value ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
              )}
            >
              {b.label}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-lg">
            <span className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" />{ar ? 'كريدي أجريكول' : 'Crédit Agricole'}</span>
            <span className="flex items-center gap-2 text-sm font-normal">
              {s.creditAccountActive ? (ar ? 'مفعل' : 'Active') : (ar ? 'معطل' : 'Disabled')}
              <Switch checked={s.creditAccountActive} onCheckedChange={v => toggleAccount('credit', v)} />
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className={cn(!s.creditAccountActive && "opacity-50")}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className={lbl}>{ar ? 'رقم الحساب البنكي' : 'Account Number'}</Label>
              <Input value={s.bankAccountNumber} onChange={e => set({ bankAccountNumber: e.target.value })} className={inp} />
            </div>
            <div className="space-y-1.5">
              <Label className={lbl}>{ar ? 'رقم الـ ID البنكي' : 'Bank ID'}</Label>
              <Input value={s.bankIdNumber} onChange={e => set({ bankIdNumber: e.target.value })} className={inp} />
            </div>
            <div className="space-y-1.5">
              <Label className={lbl}>{ar ? 'نوع الحساب' : 'Account Type'}</Label>
              <Input value={s.bankAccountType} onChange={e => set({ bankAccountType: e.target.value })} className={inp} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-lg">
            <span className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" />{ar ? 'البنك الأهلي المصري' : 'National Bank of Egypt'}</span>
            <span className="flex items-center gap-2 text-sm font-normal">
              {s.nbeAccountActive ? (ar ? 'مفعل' : 'Active') : (ar ? 'معطل' : 'Disabled')}
              <Switch checked={s.nbeAccountActive} onCheckedChange={v => toggleAccount('nbe', v)} />
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className={cn(!s.nbeAccountActive && "opacity-50")}>
          <div className="space-y-1.5 max-w-sm">
            <Label className={lbl}>{ar ? 'رقم الحساب البنكي (19 رقم)' : 'Account Number (19 digits)'}</Label>
            <Input
              value={s.nbeAccountNumber}
              inputMode="numeric"
              maxLength={19}
              dir="ltr"
              onChange={e => set({ nbeAccountNumber: e.target.value.replace(/\D/g, '').slice(0, 19) })}
              className={cn("h-9 text-sm font-mono", nbeInvalid && "border-destructive")}
            />
            <p className={cn("text-xs", nbeInvalid ? "text-destructive" : "text-muted-foreground")}>
              {s.nbeAccountNumber.length}/19 {nbeInvalid && (ar ? '— يجب أن يكون 19 رقم' : '— must be 19 digits')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
