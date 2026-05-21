import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Building2, MapPin, X, CalendarRange, ListFilter, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Department { id: string; name_ar: string; name_en: string; }
interface Station { id: string; name_ar: string; name_en: string; }

interface RequestFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedDepartment: string;
  onDepartmentChange: (value: string) => void;
  selectedStation: string;
  onStationChange: (value: string) => void;
  departments: Department[];
  stations: Station[];

  // Status filter — multi-select array. Empty array = no filter (all).
  selectedStatuses?: string[];
  onSelectedStatusesChange?: (values: string[]) => void;

  fromDate?: string;
  onFromDateChange?: (value: string) => void;
  toDate?: string;
  onToDateChange?: (value: string) => void;
  showAdvanced?: boolean;
}

const STATUS_OPTIONS: { value: string; ar: string; en: string; cls: string }[] = [
  { value: 'pending', ar: 'معلق', en: 'Pending', cls: 'bg-warning/10 text-warning border-warning' },
  { value: 'approved', ar: 'معتمد', en: 'Approved', cls: 'bg-success/10 text-success border-success' },
  { value: 'rejected', ar: 'مرفوض', en: 'Rejected', cls: 'bg-destructive/10 text-destructive border-destructive' },
];

export const RequestFilters = ({
  searchQuery, onSearchChange,
  selectedDepartment, onDepartmentChange,
  selectedStation, onStationChange,
  departments, stations,
  selectedStatuses, onSelectedStatusesChange,
  fromDate, onFromDateChange,
  toDate, onToDateChange,
  showAdvanced = true,
}: RequestFiltersProps) => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const statuses = selectedStatuses || [];

  const toggleStatus = (v: string) => {
    if (!onSelectedStatusesChange) return;
    onSelectedStatusesChange(statuses.includes(v) ? statuses.filter(s => s !== v) : [...statuses, v]);
  };

  const hasActive =
    !!searchQuery ||
    selectedDepartment !== 'all' ||
    selectedStation !== 'all' ||
    statuses.length > 0 ||
    !!fromDate || !!toDate;

  const clearAll = () => {
    onSearchChange('');
    onDepartmentChange('all');
    onStationChange('all');
    onSelectedStatusesChange?.([]);
    onFromDateChange?.('');
    onToDateChange?.('');
  };

  const statusButtonLabel = () => {
    if (statuses.length === 0) return ar ? 'كل الحالات' : 'All Statuses';
    if (statuses.length === 1) {
      const o = STATUS_OPTIONS.find(s => s.value === statuses[0]);
      return ar ? o?.ar : o?.en;
    }
    return ar ? `${statuses.length} حالات محددة` : `${statuses.length} selected`;
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-3 mb-4">
      <div className={cn("flex flex-col sm:flex-row gap-3 flex-wrap")}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
          <Input
            placeholder={ar ? 'بحث بالاسم أو كود الموظف...' : 'Search by name or employee ID...'}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn("h-10", isRTL ? "pr-10" : "pl-10")}
          />
        </div>

        <Select value={selectedDepartment} onValueChange={onDepartmentChange}>
          <SelectTrigger className="w-full sm:w-[180px] h-10">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <SelectValue placeholder={ar ? 'كل الأقسام' : 'All Departments'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ar ? 'كل الأقسام' : 'All Departments'}</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{ar ? d.name_ar : d.name_en}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStation} onValueChange={onStationChange}>
          <SelectTrigger className="w-full sm:w-[180px] h-10">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <SelectValue placeholder={ar ? 'كل المحطات' : 'All Stations'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ar ? 'كل المحطات' : 'All Stations'}</SelectItem>
            {stations.map((s) => (
              <SelectItem key={s.id} value={s.id}>{ar ? s.name_ar : s.name_en}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showAdvanced && onSelectedStatusesChange && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-10 w-full sm:w-[200px] justify-between gap-2 font-normal",
                  statuses.length > 0 && "border-primary bg-primary/5"
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <ListFilter className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate text-sm">{statusButtonLabel()}</span>
                </span>
                {statuses.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 min-w-[20px] justify-center">
                    {statuses.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align={isRTL ? 'end' : 'start'}>
              <div className="p-2 border-b flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{ar ? 'الحالة' : 'Status'}</span>
                {statuses.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onSelectedStatusesChange([])}>
                    {ar ? 'مسح' : 'Clear'}
                  </Button>
                )}
              </div>
              <div className="p-1">
                {STATUS_OPTIONS.map(opt => {
                  const checked = statuses.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className={cn(
                        "flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer hover:bg-accent text-sm",
                        isRTL && "flex-row-reverse text-right"
                      )}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleStatus(opt.value)} />
                      <Badge variant="outline" className={cn("text-xs", opt.cls)}>
                        {ar ? opt.ar : opt.en}
                      </Badge>
                      {checked && <Check className="w-3.5 h-3.5 text-primary ms-auto" />}
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {showAdvanced && (onFromDateChange || onToDateChange) && (
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarRange className="h-4 w-4" />
            <span>{ar ? 'نطاق التاريخ:' : 'Date range:'}</span>
          </div>
          <Input
            type="date"
            value={fromDate || ''}
            onChange={(e) => onFromDateChange?.(e.target.value)}
            className="h-10 sm:w-[170px]"
            aria-label={ar ? 'من تاريخ' : 'From date'}
          />
          <span className="text-muted-foreground hidden sm:inline">→</span>
          <Input
            type="date"
            value={toDate || ''}
            onChange={(e) => onToDateChange?.(e.target.value)}
            className="h-10 sm:w-[170px]"
            aria-label={ar ? 'إلى تاريخ' : 'To date'}
          />
          {hasActive && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1.5 text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
              {ar ? 'مسح الفلاتر' : 'Clear filters'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
