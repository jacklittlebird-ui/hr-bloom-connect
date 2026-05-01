import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface StationOption {
  id: string;
  name_ar: string;
  name_en: string;
  code?: string | null;
}

interface Props {
  stations: StationOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  isAr: boolean;
  placeholder?: string;
  allowAll?: boolean;
  allLabel?: string;
  className?: string;
}

export const StationCombobox = ({
  stations, value, onChange, isAr, placeholder, allowAll = false, allLabel, className,
}: Props) => {
  const [open, setOpen] = useState(false);
  const selected = stations.find((s) => s.id === value);
  const display = selected
    ? (isAr ? selected.name_ar : selected.name_en)
    : (allowAll && !value ? (allLabel || (isAr ? 'كل المحطات' : 'All stations')) : (placeholder || (isAr ? 'اختر محطة' : 'Select station')));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('h-9 justify-between font-normal', className)}
        >
          <span className="truncate">{display}</span>
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder={isAr ? 'بحث عن محطة...' : 'Search station...'} />
          <CommandList>
            <CommandEmpty>{isAr ? 'لا توجد نتائج' : 'No results'}</CommandEmpty>
            <CommandGroup>
              {allowAll && (
                <CommandItem
                  value="__all__"
                  onSelect={() => { onChange(null); setOpen(false); }}
                >
                  <Check className={cn('me-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                  {allLabel || (isAr ? 'كل المحطات' : 'All stations')}
                </CommandItem>
              )}
              {stations.map((s) => {
                const label = isAr ? s.name_ar : s.name_en;
                return (
                  <CommandItem
                    key={s.id}
                    value={`${s.name_ar} ${s.name_en} ${s.code || ''}`}
                    onSelect={() => { onChange(s.id); setOpen(false); }}
                  >
                    <Check className={cn('me-2 h-4 w-4', value === s.id ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate">{label}</span>
                    {s.code && <span className="ms-auto text-xs text-muted-foreground font-mono">{s.code}</span>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
