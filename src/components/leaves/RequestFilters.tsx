import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Building2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Department {
  id: string;
  name_ar: string;
  name_en: string;
}

interface Station {
  id: string;
  name_ar: string;
  name_en: string;
}

interface RequestFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedDepartment: string;
  onDepartmentChange: (value: string) => void;
  selectedStation: string;
  onStationChange: (value: string) => void;
  departments: Department[];
  stations: Station[];
}

export const RequestFilters = ({
  searchQuery,
  onSearchChange,
  selectedDepartment,
  onDepartmentChange,
  selectedStation,
  onStationChange,
  departments,
  stations,
}: RequestFiltersProps) => {
  const { language, isRTL } = useLanguage();

  return (
    <div className={cn("flex flex-col sm:flex-row gap-3 mb-4", isRTL && "direction-rtl")}>
      <div className="relative flex-1">
        <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
        <Input
          placeholder={language === 'ar' ? 'بحث بالاسم أو كود الموظف...' : 'Search by name or employee ID...'}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn("h-10", isRTL ? "pr-10" : "pl-10")}
        />
      </div>
      <Select value={selectedDepartment} onValueChange={onDepartmentChange}>
        <SelectTrigger className="w-full sm:w-[200px] h-10">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <SelectValue placeholder={language === 'ar' ? 'كل الأقسام' : 'All Departments'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{language === 'ar' ? 'كل الأقسام' : 'All Departments'}</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {language === 'ar' ? d.name_ar : d.name_en}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedStation} onValueChange={onStationChange}>
        <SelectTrigger className="w-full sm:w-[200px] h-10">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <SelectValue placeholder={language === 'ar' ? 'كل المحطات' : 'All Stations'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{language === 'ar' ? 'كل المحطات' : 'All Stations'}</SelectItem>
          {stations.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {language === 'ar' ? s.name_ar : s.name_en}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
