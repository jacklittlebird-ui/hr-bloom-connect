import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Settings, Banknote, Percent, Calendar, Bell, Shield, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LoanType {
  id: string;
  nameAr: string;
  nameEn: string;
  maxAmount: number;
  maxInstallments: number;
  interestRate: number;
  requiresApproval: boolean;
  minServiceMonths: number;
  maxPercentOfSalary: number;
  isActive: boolean;
}

const initialLoanTypes: LoanType[] = [
  {
    id: 'personal',
    nameAr: 'قرض شخصي',
    nameEn: 'Personal Loan',
    maxAmount: 100000,
    maxInstallments: 36,
    interestRate: 0,
    requiresApproval: true,
    minServiceMonths: 12,
    maxPercentOfSalary: 50,
    isActive: true,
  },
  {
    id: 'housing',
    nameAr: 'قرض إسكان',
    nameEn: 'Housing Loan',
    maxAmount: 500000,
    maxInstallments: 120,
    interestRate: 0,
    requiresApproval: true,
    minServiceMonths: 24,
    maxPercentOfSalary: 40,
    isActive: true,
  },
  {
    id: 'emergency',
    nameAr: 'قرض طوارئ',
    nameEn: 'Emergency Loan',
    maxAmount: 20000,
    maxInstallments: 12,
    interestRate: 0,
    requiresApproval: true,
    minServiceMonths: 6,
    maxPercentOfSalary: 30,
    isActive: true,
  },
  {
    id: 'education',
    nameAr: 'قرض تعليم',
    nameEn: 'Education Loan',
    maxAmount: 50000,
    maxInstallments: 24,
    interestRate: 0,
    requiresApproval: true,
    minServiceMonths: 12,
    maxPercentOfSalary: 40,
    isActive: true,
  },
  {
    id: 'medical',
    nameAr: 'قرض علاجي',
    nameEn: 'Medical Loan',
    maxAmount: 30000,
    maxInstallments: 18,
    interestRate: 0,
    requiresApproval: true,
    minServiceMonths: 6,
    maxPercentOfSalary: 35,
    isActive: true,
  },
];

interface GeneralSettings {
  maxConcurrentLoans: number;
  advanceMaxPercent: number;
  advanceDeductionMethod: 'immediate' | 'next_month';
  autoDeductFromSalary: boolean;
  sendNotifications: boolean;
  notifyBeforeDueDays: number;
  allowEarlyRepayment: boolean;
  requireGuarantor: boolean;
  guarantorMinService: number;
}

export const LoanSettings = () => {
  const { t, isRTL } = useLanguage();
  const [loanTypes, setLoanTypes] = useState<LoanType[]>(initialLoanTypes);
  const [selectedType, setSelectedType] = useState<string>(loanTypes[0].id);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    maxConcurrentLoans: 2,
    advanceMaxPercent: 50,
    advanceDeductionMethod: 'next_month',
    autoDeductFromSalary: true,
    sendNotifications: true,
    notifyBeforeDueDays: 5,
    allowEarlyRepayment: true,
    requireGuarantor: false,
    guarantorMinService: 24,
  });

  const selectedLoanType = loanTypes.find(lt => lt.id === selectedType);

  const handleLoanTypeUpdate = (field: keyof LoanType, value: any) => {
    setLoanTypes(loanTypes.map(lt => 
      lt.id === selectedType ? { ...lt, [field]: value } : lt
    ));
  };

  const handleSave = () => {
    toast({ title: t('common.success'), description: t('loans.settings.saved') });
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('loans.settings.general')}
          </CardTitle>
          <CardDescription>{t('loans.settings.generalDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                {t('loans.settings.maxConcurrentLoans')}
              </Label>
              <Input
                type="number"
                value={generalSettings.maxConcurrentLoans}
                onChange={(e) => setGeneralSettings({ ...generalSettings, maxConcurrentLoans: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                {t('loans.settings.advanceMaxPercent')}
              </Label>
              <Input
                type="number"
                value={generalSettings.advanceMaxPercent}
                onChange={(e) => setGeneralSettings({ ...generalSettings, advanceMaxPercent: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('loans.settings.advanceDeductionMethod')}</Label>
              <Select 
                value={generalSettings.advanceDeductionMethod} 
                onValueChange={(value: 'immediate' | 'next_month') => setGeneralSettings({ ...generalSettings, advanceDeductionMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">{t('loans.settings.immediate')}</SelectItem>
                  <SelectItem value="next_month">{t('loans.settings.nextMonth')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('loans.settings.autoDeduct')}</Label>
                <p className="text-sm text-muted-foreground">{t('loans.settings.autoDeductDesc')}</p>
              </div>
              <Switch
                checked={generalSettings.autoDeductFromSalary}
                onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, autoDeductFromSalary: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('loans.settings.allowEarlyRepayment')}</Label>
                <p className="text-sm text-muted-foreground">{t('loans.settings.earlyRepaymentDesc')}</p>
              </div>
              <Switch
                checked={generalSettings.allowEarlyRepayment}
                onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, allowEarlyRepayment: checked })}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              {t('loans.settings.notifications')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('loans.settings.sendNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">{t('loans.settings.notificationsDesc')}</p>
                </div>
                <Switch
                  checked={generalSettings.sendNotifications}
                  onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, sendNotifications: checked })}
                />
              </div>
              {generalSettings.sendNotifications && (
                <div className="space-y-2">
                  <Label>{t('loans.settings.notifyBeforeDays')}</Label>
                  <Input
                    type="number"
                    value={generalSettings.notifyBeforeDueDays}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, notifyBeforeDueDays: parseInt(e.target.value) })}
                  />
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t('loans.settings.guarantor')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('loans.settings.requireGuarantor')}</Label>
                  <p className="text-sm text-muted-foreground">{t('loans.settings.guarantorDesc')}</p>
                </div>
                <Switch
                  checked={generalSettings.requireGuarantor}
                  onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, requireGuarantor: checked })}
                />
              </div>
              {generalSettings.requireGuarantor && (
                <div className="space-y-2">
                  <Label>{t('loans.settings.guarantorMinService')}</Label>
                  <Input
                    type="number"
                    value={generalSettings.guarantorMinService}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, guarantorMinService: parseInt(e.target.value) })}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loan Types Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('loans.settings.loanTypes')}
          </CardTitle>
          <CardDescription>{t('loans.settings.loanTypesDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t('loans.settings.selectLoanType')}</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {loanTypes.map((lt) => (
                  <SelectItem key={lt.id} value={lt.id}>
                    {isRTL ? lt.nameAr : lt.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedLoanType && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>{t('loans.settings.nameAr')}</Label>
                  <Input
                    value={selectedLoanType.nameAr}
                    onChange={(e) => handleLoanTypeUpdate('nameAr', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('loans.settings.nameEn')}</Label>
                  <Input
                    value={selectedLoanType.nameEn}
                    onChange={(e) => handleLoanTypeUpdate('nameEn', e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{t('loans.settings.isActive')}</Label>
                  <Switch
                    checked={selectedLoanType.isActive}
                    onCheckedChange={(checked) => handleLoanTypeUpdate('isActive', checked)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>{t('loans.settings.maxAmount')}</Label>
                  <Input
                    type="number"
                    value={selectedLoanType.maxAmount}
                    onChange={(e) => handleLoanTypeUpdate('maxAmount', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('loans.settings.maxInstallments')}</Label>
                  <Input
                    type="number"
                    value={selectedLoanType.maxInstallments}
                    onChange={(e) => handleLoanTypeUpdate('maxInstallments', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('loans.settings.interestRate')}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={selectedLoanType.interestRate}
                    onChange={(e) => handleLoanTypeUpdate('interestRate', parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>{t('loans.settings.minServiceMonths')}</Label>
                  <Input
                    type="number"
                    value={selectedLoanType.minServiceMonths}
                    onChange={(e) => handleLoanTypeUpdate('minServiceMonths', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('loans.settings.maxPercentOfSalary')}</Label>
                  <Input
                    type="number"
                    value={selectedLoanType.maxPercentOfSalary}
                    onChange={(e) => handleLoanTypeUpdate('maxPercentOfSalary', parseInt(e.target.value))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{t('loans.settings.requiresApproval')}</Label>
                  <Switch
                    checked={selectedLoanType.requiresApproval}
                    onCheckedChange={(checked) => handleLoanTypeUpdate('requiresApproval', checked)}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {t('loans.settings.saveAll')}
        </Button>
      </div>
    </div>
  );
};
