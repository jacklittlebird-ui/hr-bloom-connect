import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { stationLocations } from '@/data/stationLocations';

interface BasicInfoTabProps {
  employee: Employee;
  onUpdate?: (updates: Partial<Employee>) => void;
  readOnly?: boolean;
}

export const BasicInfoTab = ({ employee, onUpdate, readOnly }: BasicInfoTabProps) => {
  const { t, isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(employee.avatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const buildFormData = (emp: Employee) => ({
    employeeId: emp.employeeId || '',
    stationLocation: emp.stationLocation || '',
    nameAr: emp.nameAr || '',
    nameEn: emp.nameEn || '',
    firstName: emp.firstName || '',
    fatherName: emp.fatherName || '',
    familyName: emp.familyName || '',
    birthDate: emp.birthDate || '',
    birthPlace: emp.birthPlace || '',
    birthGovernorate: emp.birthGovernorate || '',
    gender: emp.gender || '',
    religion: emp.religion || '',
    nationality: emp.nationality || '',
    maritalStatus: emp.maritalStatus || '',
    childrenCount: emp.childrenCount || 0,
    educationAr: emp.educationAr || '',
    graduationYear: emp.graduationYear || '',
  });

  const [formData, setFormData] = useState(buildFormData(employee));

  // Sync form when full employee data loads (e.g. ensureFullEmployee)
  useEffect(() => {
    setFormData(buildFormData(employee));
  }, [
    employee.employeeId, employee.stationLocation, employee.nameAr, employee.nameEn,
    employee.firstName, employee.fatherName, employee.familyName,
    employee.birthDate, employee.birthPlace, employee.birthGovernorate,
    employee.gender, employee.religion, employee.nationality,
    employee.maritalStatus, employee.childrenCount, employee.educationAr, employee.graduationYear,
  ]);

  const compressImage = (file: File, maxSizeKB: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        // Scale down if very large
        const MAX_DIM = 800;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        let result = canvas.toDataURL('image/jpeg', quality);
        // Iteratively reduce quality until under maxSizeKB
        while (result.length * 0.75 > maxSizeKB * 1024 && quality > 0.05) {
          quality -= 0.05;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        // If still too large, scale down further
        if (result.length * 0.75 > maxSizeKB * 1024) {
          const scale = Math.sqrt((maxSizeKB * 1024) / (result.length * 0.75));
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          result = canvas.toDataURL('image/jpeg', 0.6);
        }
        resolve(result);
      };
      img.onerror = reject;
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(isRTL ? 'يرجى اختيار ملف صورة صالح' : 'Please select a valid image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(isRTL ? 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت' : 'Image size must be less than 5MB');
      return;
    }
    try {
      const compressed = await compressImage(file, 30);
      setAvatarUrl(compressed);
      onUpdate?.({ avatar: compressed });
      toast.success(isRTL ? 'تم تحميل الصورة وضغطها بنجاح' : 'Photo uploaded and compressed successfully');
    } catch {
      toast.error(isRTL ? 'حدث خطأ أثناء معالجة الصورة' : 'Error processing image');
    }
  };

  const updateField = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Push every change up immediately
    onUpdate?.({ [field]: field === 'childrenCount' ? Number(value) : value });
  };

  return (
    <div className="p-6 space-y-8">
      {/* Avatar Section */}
      <div className="bg-primary py-8 rounded-lg flex flex-col items-center justify-center">
        <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <Avatar className="w-24 h-24 border-4 border-primary-foreground/20">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-2xl">
              {employee.nameAr.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary-foreground rounded-full flex items-center justify-center shadow-lg">
            <Camera className="w-4 h-4 text-primary" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>
        <p className="mt-4 text-primary-foreground text-sm">{t('employees.clickToUpload')}</p>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.employeeId')}</Label>
          <Input value={formData.employeeId} onChange={e => updateField('employeeId', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.stationLocation')} *</Label>
          <Select value={formData.stationLocation} onValueChange={v => updateField('stationLocation', v)}>
            <SelectTrigger className={cn(isRTL && "text-right")}>
              <SelectValue placeholder={t('employees.select')} />
            </SelectTrigger>
            <SelectContent>
              {stationLocations.map(s => (
                <SelectItem key={s.value} value={s.value}>{ar ? s.labelAr : s.labelEn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.enterStation')}</Label>
          <Input placeholder={t('employees.fields.enterStation')} className={cn(isRTL && "text-right")} />
        </div>
      </div>

      {/* Full Name Arabic */}
      <div className="space-y-2">
        <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.fullNameAr')}</Label>
        <Input value={formData.nameAr} onChange={e => updateField('nameAr', e.target.value)} className={cn(isRTL && "text-right")} />
      </div>

      {/* Full Name English */}
      <div className="space-y-2">
        <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.fullNameEn')}</Label>
        <Input value={formData.nameEn} onChange={e => updateField('nameEn', e.target.value)} className={cn(isRTL && "text-right")} />
      </div>

      {/* Personal Details Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.firstName')}</Label>
          <Input value={formData.firstName} onChange={e => updateField('firstName', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.fatherName')}</Label>
          <Input value={formData.fatherName} onChange={e => updateField('fatherName', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.familyName')}</Label>
          <Input value={formData.familyName} onChange={e => updateField('familyName', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.birthDate')}</Label>
          <Input type="date" value={formData.birthDate} onChange={e => updateField('birthDate', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.birthPlace')}</Label>
          <Input value={formData.birthPlace} onChange={e => updateField('birthPlace', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.birthGovernorate')}</Label>
          <Input value={formData.birthGovernorate} onChange={e => updateField('birthGovernorate', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.gender')}</Label>
          <Select value={formData.gender} onValueChange={v => updateField('gender', v)}>
            <SelectTrigger className={cn(isRTL && "text-right")}>
              <SelectValue placeholder={t('employees.select')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">{t('employees.gender.male')}</SelectItem>
              <SelectItem value="female">{t('employees.gender.female')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.religion')}</Label>
          <Select value={formData.religion} onValueChange={v => updateField('religion', v)}>
            <SelectTrigger className={cn(isRTL && "text-right")}>
              <SelectValue placeholder={t('employees.select')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="muslim">{t('employees.religion.muslim')}</SelectItem>
              <SelectItem value="christian">{t('employees.religion.christian')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.nationality')}</Label>
          <Input value={formData.nationality} onChange={e => updateField('nationality', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.maritalStatus')}</Label>
          <Select value={formData.maritalStatus} onValueChange={v => updateField('maritalStatus', v)}>
            <SelectTrigger className={cn(isRTL && "text-right")}>
              <SelectValue placeholder={t('employees.select')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">{t('employees.maritalStatus.single')}</SelectItem>
              <SelectItem value="married">{t('employees.maritalStatus.married')}</SelectItem>
              <SelectItem value="divorced">{t('employees.maritalStatus.divorced')}</SelectItem>
              <SelectItem value="widowed">{t('employees.maritalStatus.widowed')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Education Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.childrenCount')}</Label>
          <Input type="number" value={formData.childrenCount} onChange={e => updateField('childrenCount', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.educationAr')}</Label>
          <Input value={formData.educationAr} onChange={e => updateField('educationAr', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label className={cn(isRTL && "text-right block")}>{t('employees.fields.graduationYear')}</Label>
          <Input value={formData.graduationYear} onChange={e => updateField('graduationYear', e.target.value)} className={cn(isRTL && "text-right")} />
        </div>
      </div>
    </div>
  );
};
