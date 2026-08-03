import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export const BOSTAN_INSURANCE = 'تأمينات البساتين';

interface EmployeeOption {
  id: string;
  employee_code: string;
  name_ar: string;
  social_insurance_no: string | null;
}

interface Props {
  isAr: boolean;
  value: string;
  insuranceNumber: string;
  onChange: (driverName: string, insuranceNumber: string) => void;
}

const PAGE = 1000;

export const NO_DRIVER = 'بدون سائق';

const modeOf = (v: string): 'none' | 'bostan' | 'employee' =>
  !v || v === NO_DRIVER ? 'none' : v === BOSTAN_INSURANCE ? 'bostan' : 'employee';

export const InsuredDriverPicker = ({ isAr, value, insuranceNumber, onChange }: Props) => {
  const [mode, setMode] = useState<'none' | 'bostan' | 'employee'>(modeOf(value));
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMode((prev) => (prev === 'employee' && !value ? prev : modeOf(value)));
  }, [value]);


  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const all: EmployeeOption[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('employees')
          .select('id, employee_code, name_ar, social_insurance_no')
          .order('employee_code')
          .range(from, from + PAGE - 1);
        if (error || !data?.length) break;
        all.push(...(data as unknown as EmployeeOption[]));
        if (data.length < PAGE) break;
      }
      if (!cancelled) setEmployees(all);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-1 col-span-2">
      <Label className="text-xs">{isAr ? 'اسم السائق المؤمن عليه' : 'Insured Driver'}</Label>
      <div className="flex gap-2">
        <Select
          value={mode}
          onValueChange={(m: 'none' | 'bostan' | 'employee') => {
            setMode(m);
            if (m === 'bostan') onChange(BOSTAN_INSURANCE, insuranceNumber);
            else if (m === 'none') onChange(NO_DRIVER, insuranceNumber);
            else onChange('', insuranceNumber);
          }}
        >
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{NO_DRIVER}</SelectItem>
            <SelectItem value="bostan">{BOSTAN_INSURANCE}</SelectItem>
            <SelectItem value="employee">{isAr ? 'اختيار موظف' : 'Select employee'}</SelectItem>
          </SelectContent>
        </Select>


        {mode === 'employee' && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" role="combobox" className="h-9 flex-1 justify-between font-normal">
                <span className="truncate">{value || (isAr ? 'ابحث بالاسم أو الكود...' : 'Search by name or code...')}</span>
                <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0" align="start">
              <Command>
                <CommandInput placeholder={isAr ? 'بحث عن موظف...' : 'Search employee...'} />
                <CommandList>
                  <CommandEmpty>{isAr ? 'لا توجد نتائج' : 'No results'}</CommandEmpty>
                  <CommandGroup>
                    {employees.map((e) => (
                      <CommandItem
                        key={e.id}
                        value={`${e.name_ar} ${e.employee_code} ${e.social_insurance_no || ''}`}
                        onSelect={() => {
                          onChange(e.name_ar, e.social_insurance_no || insuranceNumber || '');
                          setOpen(false);
                        }}
                      >
                        <Check className={cn('me-2 h-4 w-4', value === e.name_ar ? 'opacity-100' : 'opacity-0')} />
                        <span className="truncate">{e.employee_code} — {e.name_ar}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};
