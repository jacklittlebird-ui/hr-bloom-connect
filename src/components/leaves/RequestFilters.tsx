import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Building2, MapPin, X, CalendarRange, ListFilter } from 'lucide-react';
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

  // New optional advanced filters
  selectedStatus?: string;
  onStatusChange?: (value: string) => void;
  fromDate?: string;
  onFromDateChange?: (value: string) => void;
  toDate?: string;
  onToDateChange?: (value: string) => void;
  showAdvanced?: boolean;
}

export const RequestFilters = ({
  searchQuery, onSearchChange,
  selectedDepartment, onDepartmentChange,
  selectedStation, onStationChange,
  departments, stations,
  selectedStatus, onStatusChange,
  fromDate, onFromDateChange,
  toDate, onToDateChange,
  showAdvanced = true,
}: RequestFiltersProps) => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';

  const hasActive =
    !!searchQuery ||
    selectedDepartment !== 'all' ||
    selectedStation !== 'all' ||
    (selectedStatus && selectedStatus !== 'all') ||
    !!fromDate || !!toDate;

  const clearAll = () => {
    onSearchChange('');
    onDepartmentChange('all');
    onStationChange('all');
    onStatusChange?.('all');
    onFromDateChange?.('');
    onToDateChange?.('');
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

        {showAdvanced && onStatusChange && (
          <Select value={selectedStatus || 'all'} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full sm:w-[160px] h-10">
              <ListFilter className="h-4 w-4 text-muted-foreground shrink-0" />
              <SelectValue placeholder={ar ? 'كل الحالات' : 'All Statuses'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? 'كل الحالات' : 'All Statuses'}</SelectItem>
              <SelectItem value="pending">{ar ? 'معلق' : 'Pending'}</SelectItem>
              <SelectItem value="approved">{ar ? 'معتمد' : 'Approved'}</SelectItem>
              <SelectItem value="rejected">{ar ? 'مرفوض' : 'Rejected'}</SelectItem>
            </SelectContent>
          </Select>
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
