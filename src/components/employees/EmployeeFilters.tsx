import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Users, UserCheck, UserX, UserMinus, X, Building2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

type FilterStatus = 'all' | 'active' | 'inactive' | 'suspended';

interface FilterOption {
  value: string;
  labelAr: string;
  labelEn: string;
}

interface EmployeeFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
  counts: { all: number; active: number; inactive: number; suspended: number };
  stations: FilterOption[];
  departments: FilterOption[];
  selectedStations: string[];
  onSelectedStationsChange: (values: string[]) => void;
  selectedDepartments: string[];
  onSelectedDepartmentsChange: (values: string[]) => void;
}

export const EmployeeFilters = ({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  counts,
  stations,
  departments,
  selectedStations,
  onSelectedStationsChange,
  selectedDepartments,
  onSelectedDepartmentsChange,
}: EmployeeFiltersProps) => {
  const { t, isRTL, language } = useLanguage();
  const ar = language === 'ar';

  const filters: { key: FilterStatus; label: string; icon: typeof Users; count: number }[] = [
    { key: 'all', label: t('employees.filter.all'), icon: Users, count: counts.all },
    { key: 'active', label: t('employees.filter.active'), icon: UserCheck, count: counts.active },
    { key: 'inactive', label: t('employees.filter.inactive'), icon: UserX, count: counts.inactive },
    { key: 'suspended', label: t('employees.filter.suspended'), icon: UserMinus, count: counts.suspended },
  ];

  const toggleValue = (list: string[], value: string) =>
    list.includes(value) ? list.filter(v => v !== value) : [...list, value];

  const MultiSelectFilter = ({
    icon: Icon,
    label,
    options,
    selected,
    onChange,
  }: {
    icon: typeof MapPin;
    label: string;
    options: FilterOption[];
    selected: string[];
    onChange: (v: string[]) => void;
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 border-2 h-10",
            selected.length > 0 && "border-primary bg-primary/5"
          )}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
          {selected.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 min-w-[20px] justify-center">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-[90vw] p-0" align={isRTL ? 'end' : 'start'}>
        <div className="p-2 border-b flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {selected.length > 0 && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onChange([])}>
              {ar ? 'مسح الكل' : 'Clear'}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-72">
          <div className="p-1">
            {options.map(opt => (
              <label
                key={opt.value}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent text-sm",
                  isRTL && "flex-row-reverse text-right"
                )}
              >
                <Checkbox
                  checked={selected.includes(opt.value)}
                  onCheckedChange={() => onChange(toggleValue(selected, opt.value))}
                />
                <span>{ar ? opt.labelAr : opt.labelEn}</span>
              </label>
            ))}
            {options.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                {ar ? 'لا توجد خيارات' : 'No options'}
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="border-2 border-primary rounded-xl p-5 space-y-4 bg-card">
      {/* Search Input */}
      <div className="relative">
        <Search
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground",
            isRTL ? "right-4" : "left-4"
          )}
        />
        <Input
          placeholder={t('employees.searchAdvanced')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            "h-12 text-base border-2 rounded-lg",
            isRTL ? "pr-12 text-right" : "pl-12"
          )}
        />
      </div>

      {/* Station & Department Filters */}
      <div className={cn("flex flex-wrap gap-2", isRTL && "flex-row-reverse")}>
        <MultiSelectFilter
          icon={MapPin}
          label={ar ? 'المحطة' : 'Station'}
          options={stations}
          selected={selectedStations}
          onChange={onSelectedStationsChange}
        />
        <MultiSelectFilter
          icon={Building2}
          label={ar ? 'القسم' : 'Department'}
          options={departments}
          selected={selectedDepartments}
          onChange={onSelectedDepartmentsChange}
        />
        {/* Active filter chips */}
        {(selectedStations.length > 0 || selectedDepartments.length > 0) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 gap-1 text-destructive hover:text-destructive"
            onClick={() => { onSelectedStationsChange([]); onSelectedDepartmentsChange([]); }}
          >
            <X className="w-3.5 h-3.5" />
            {ar ? 'مسح الفلاتر' : 'Clear filters'}
          </Button>
        )}
      </div>

      {/* Filter Buttons */}
      <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", isRTL && "direction-rtl")}>
        {filters.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.key;
          return (
            <button
              key={filter.key}
              onClick={() => onFilterChange(filter.key)}
              className={cn(
                "flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all font-medium",
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-primary/50",
                isRTL && "flex-row-reverse"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{filter.label}</span>
              <Badge
                variant={isActive ? "secondary" : "outline"}
                className={cn(
                  "text-xs min-w-[24px] justify-center",
                  isActive && "bg-primary-foreground/20 text-primary-foreground border-0"
                )}
              >
                {filter.count}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
};
