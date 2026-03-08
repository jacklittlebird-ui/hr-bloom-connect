import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePersistedState } from '@/hooks/usePersistedState';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Building2, Globe, Bell, Shield, Palette, Database, Save } from 'lucide-react';
import { applyThemeSettings } from '@/lib/themeUtils';

interface SiteConfig {
  companyName: string;
  companyNameEn: string;
  companyLogo: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxNumber: string;
  commercialReg: string;
  defaultLanguage: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  workingDays: string[];
  workStartTime: string;
  workEndTime: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  leaveApprovalRequired: boolean;
  loanApprovalRequired: boolean;
  autoAttendance: boolean;
  passwordMinLength: number;
  sessionTimeout: number;
  twoFactorAuth: boolean;
  ipRestriction: boolean;
  theme: string;
  primaryColor: string;
  autoBackup: boolean;
  backupFrequency: string;
  dataRetention: string;
}

const defaultConfig: SiteConfig = {
  companyName: 'شركة الموارد البشرية',
  companyNameEn: 'HR Company',
  companyLogo: '',
  address: 'القاهرة، مصر',
  phone: '+20 123 456 7890',
  email: 'info@hrcompany.com',
  website: 'www.hrcompany.com',
  taxNumber: '123-456-789',
  commercialReg: 'CR-2025-001',
  defaultLanguage: 'ar',
  timezone: 'Africa/Cairo',
  dateFormat: 'DD/MM/YYYY',
  currency: 'EGP',
  workingDays: ['sun', 'mon', 'tue', 'wed', 'thu'],
  workStartTime: '08:00',
  workEndTime: '16:00',
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  leaveApprovalRequired: true,
  loanApprovalRequired: true,
  autoAttendance: false,
  passwordMinLength: 8,
  sessionTimeout: 30,
  twoFactorAuth: false,
  ipRestriction: false,
  theme: 'system',
  primaryColor: '#3b82f6',
  autoBackup: true,
  backupFrequency: 'daily',
  dataRetention: '5years',
};

const daysOfWeek = [
  { key: 'sat', ar: 'السبت', en: 'Saturday' },
  { key: 'sun', ar: 'الأحد', en: 'Sunday' },
  { key: 'mon', ar: 'الاثنين', en: 'Monday' },
  { key: 'tue', ar: 'الثلاثاء', en: 'Tuesday' },
  { key: 'wed', ar: 'الأربعاء', en: 'Wednesday' },
  { key: 'thu', ar: 'الخميس', en: 'Thursday' },
  { key: 'fri', ar: 'الجمعة', en: 'Friday' },
];

const SiteSettings = () => {
  const { language, isRTL } = useLanguage();
  const [config, setConfig] = usePersistedState<SiteConfig>('hr_site_config', defaultConfig);
  const [hasChanges, setHasChanges] = useState(false);
  const isAr = language === 'ar';

  // Re-apply theme settings when component mounts with saved config
  useEffect(() => {
    applyThemeSettings(config);
  }, []);

  const update = (key: keyof SiteConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    setHasChanges(true);
    // Apply theme/color changes immediately
    if (key === 'theme' || key === 'primaryColor') {
      applyThemeSettings(newConfig);
    }
  };

  const toggleDay = (day: string) => {
    const days = config.workingDays.includes(day)
      ? config.workingDays.filter(d => d !== day)
      : [...config.workingDays, day];
    update('workingDays', days);
  };

  const handleSave = () => {
    // Ensure theme is applied on save
    applyThemeSettings(config);
    // Also force-save to localStorage in case usePersistedState hasn't flushed yet
    try {
      localStorage.setItem('hr_site_config', JSON.stringify(config));
    } catch {}
    setHasChanges(false);
    toast({ title: isAr ? 'تم الحفظ' : 'Saved', description: isAr ? 'تم حفظ إعدادات الموقع بنجاح' : 'Site settings saved successfully' });
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    applyThemeSettings(defaultConfig);
    try {
      localStorage.setItem('hr_site_config', JSON.stringify(defaultConfig));
    } catch {}
    setHasChanges(false);
    toast({ title: isAr ? 'تم الاستعادة' : 'Reset', description: isAr ? 'تم استعادة الإعدادات الافتراضية' : 'Default settings restored' });
  };

  return (
    <DashboardLayout>
      <div className={cn("space-y-6", isRTL && "text-right")}>
        <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isAr ? 'إعدادات الموقع' : 'Site Settings'}</h1>
            <p className="text-muted-foreground">{isAr ? 'تكوين إعدادات النظام العامة' : 'Configure general system settings'}</p>
          </div>
          <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
            <Button variant="outline" onClick={handleReset}>{isAr ? 'استعادة الافتراضي' : 'Reset Defaults'}</Button>
            <Button onClick={handleSave} disabled={!hasChanges} className="gap-2"><Save className="w-4 h-4" />{isAr ? 'حفظ التغييرات' : 'Save Changes'}</Button>
          </div>
        </div>

        <Tabs defaultValue="company" dir={isRTL ? 'rtl' : 'ltr'}>
          <TabsList className="grid grid-cols-6 w-full max-w-3xl">
            <TabsTrigger value="company" className="gap-1"><Building2 className="w-4 h-4" /><span className="hidden sm:inline">{isAr ? 'الشركة' : 'Company'}</span></TabsTrigger>
            <TabsTrigger value="general" className="gap-1"><Globe className="w-4 h-4" /><span className="hidden sm:inline">{isAr ? 'عام' : 'General'}</span></TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1"><Bell className="w-4 h-4" /><span className="hidden sm:inline">{isAr ? 'الإشعارات' : 'Notifications'}</span></TabsTrigger>
            <TabsTrigger value="security" className="gap-1"><Shield className="w-4 h-4" /><span className="hidden sm:inline">{isAr ? 'الأمان' : 'Security'}</span></TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1"><Palette className="w-4 h-4" /><span className="hidden sm:inline">{isAr ? 'المظهر' : 'Appearance'}</span></TabsTrigger>
            <TabsTrigger value="backup" className="gap-1"><Database className="w-4 h-4" /><span className="hidden sm:inline">{isAr ? 'النسخ' : 'Backup'}</span></TabsTrigger>
          </TabsList>

          {/* Company Info */}
          <TabsContent value="company">
            <Card>
              <CardHeader><CardTitle>{isAr ? 'بيانات الشركة' : 'Company Information'}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>{isAr ? 'اسم الشركة (عربي)' : 'Company Name (Arabic)'}</Label><Input value={config.companyName} onChange={e => update('companyName', e.target.value)} /></div>
                  <div><Label>{isAr ? 'اسم الشركة (إنجليزي)' : 'Company Name (English)'}</Label><Input value={config.companyNameEn} onChange={e => update('companyNameEn', e.target.value)} /></div>
                  <div><Label>{isAr ? 'الهاتف' : 'Phone'}</Label><Input value={config.phone} onChange={e => update('phone', e.target.value)} /></div>
                  <div><Label>{isAr ? 'البريد الإلكتروني' : 'Email'}</Label><Input value={config.email} onChange={e => update('email', e.target.value)} /></div>
                  <div><Label>{isAr ? 'الموقع الإلكتروني' : 'Website'}</Label><Input value={config.website} onChange={e => update('website', e.target.value)} /></div>
                  <div><Label>{isAr ? 'الرقم الضريبي' : 'Tax Number'}</Label><Input value={config.taxNumber} onChange={e => update('taxNumber', e.target.value)} /></div>
                  <div><Label>{isAr ? 'السجل التجاري' : 'Commercial Reg.'}</Label><Input value={config.commercialReg} onChange={e => update('commercialReg', e.target.value)} /></div>
                </div>
                <div><Label>{isAr ? 'العنوان' : 'Address'}</Label><Textarea value={config.address} onChange={e => update('address', e.target.value)} /></div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* General */}
          <TabsContent value="general">
            <Card>
              <CardHeader><CardTitle>{isAr ? 'الإعدادات العامة' : 'General Settings'}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>{isAr ? 'اللغة الافتراضية' : 'Default Language'}</Label>
                    <Select value={config.defaultLanguage} onValueChange={v => update('defaultLanguage', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">{isAr ? 'العربية' : 'Arabic'}</SelectItem>
                        <SelectItem value="en">{isAr ? 'الإنجليزية' : 'English'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>{isAr ? 'المنطقة الزمنية' : 'Timezone'}</Label>
                    <Select value={config.timezone} onValueChange={v => update('timezone', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Cairo">Cairo (UTC+2)</SelectItem>
                        <SelectItem value="Asia/Riyadh">Riyadh (UTC+3)</SelectItem>
                        <SelectItem value="Asia/Dubai">Dubai (UTC+4)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>{isAr ? 'تنسيق التاريخ' : 'Date Format'}</Label>
                    <Select value={config.dateFormat} onValueChange={v => update('dateFormat', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>{isAr ? 'العملة' : 'Currency'}</Label>
                    <Select value={config.currency} onValueChange={v => update('currency', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EGP">{isAr ? 'جنيه مصري' : 'Egyptian Pound'}</SelectItem>
                        <SelectItem value="SAR">{isAr ? 'ريال سعودي' : 'Saudi Riyal'}</SelectItem>
                        <SelectItem value="AED">{isAr ? 'درهم إماراتي' : 'UAE Dirham'}</SelectItem>
                        <SelectItem value="USD">{isAr ? 'دولار أمريكي' : 'US Dollar'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>{isAr ? 'بداية الدوام' : 'Work Start'}</Label><Input type="time" value={config.workStartTime} onChange={e => update('workStartTime', e.target.value)} /></div>
                  <div><Label>{isAr ? 'نهاية الدوام' : 'Work End'}</Label><Input type="time" value={config.workEndTime} onChange={e => update('workEndTime', e.target.value)} /></div>
                </div>
                <div>
                  <Label className="mb-2 block">{isAr ? 'أيام العمل' : 'Working Days'}</Label>
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeek.map(d => (
                      <Button key={d.key} variant={config.workingDays.includes(d.key) ? 'default' : 'outline'} size="sm" onClick={() => toggleDay(d.key)}>
                        {isAr ? d.ar : d.en}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                    <Label>{isAr ? 'اعتماد الإجازات مطلوب' : 'Leave Approval Required'}</Label>
                    <Switch checked={config.leaveApprovalRequired} onCheckedChange={v => update('leaveApprovalRequired', v)} />
                  </div>
                  <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                    <Label>{isAr ? 'اعتماد القروض مطلوب' : 'Loan Approval Required'}</Label>
                    <Switch checked={config.loanApprovalRequired} onCheckedChange={v => update('loanApprovalRequired', v)} />
                  </div>
                  <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                    <Label>{isAr ? 'حضور تلقائي' : 'Auto Attendance'}</Label>
                    <Switch checked={config.autoAttendance} onCheckedChange={v => update('autoAttendance', v)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader><CardTitle>{isAr ? 'إعدادات الإشعارات' : 'Notification Settings'}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'emailNotifications' as const, ar: 'إشعارات البريد الإلكتروني', en: 'Email Notifications' },
                  { key: 'smsNotifications' as const, ar: 'إشعارات الرسائل النصية', en: 'SMS Notifications' },
                  { key: 'pushNotifications' as const, ar: 'الإشعارات الفورية', en: 'Push Notifications' },
                ].map(item => (
                  <div key={item.key} className={cn("flex items-center justify-between p-4 border rounded-lg", isRTL && "flex-row-reverse")}>
                    <div>
                      <p className="font-medium">{isAr ? item.ar : item.en}</p>
                      <p className="text-sm text-muted-foreground">{isAr ? 'تفعيل أو تعطيل هذا النوع من الإشعارات' : 'Enable or disable this notification type'}</p>
                    </div>
                    <Switch checked={config[item.key]} onCheckedChange={v => update(item.key, v)} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security">
            <Card>
              <CardHeader><CardTitle>{isAr ? 'إعدادات الأمان' : 'Security Settings'}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>{isAr ? 'أدنى طول لكلمة المرور' : 'Min Password Length'}</Label><Input type="number" value={config.passwordMinLength} onChange={e => update('passwordMinLength', parseInt(e.target.value))} /></div>
                  <div><Label>{isAr ? 'مهلة الجلسة (دقائق)' : 'Session Timeout (min)'}</Label><Input type="number" value={config.sessionTimeout} onChange={e => update('sessionTimeout', parseInt(e.target.value))} /></div>
                </div>
                <div className={cn("flex items-center justify-between p-4 border rounded-lg", isRTL && "flex-row-reverse")}>
                  <div><p className="font-medium">{isAr ? 'المصادقة الثنائية' : 'Two-Factor Authentication'}</p></div>
                  <Switch checked={config.twoFactorAuth} onCheckedChange={v => update('twoFactorAuth', v)} />
                </div>
                <div className={cn("flex items-center justify-between p-4 border rounded-lg", isRTL && "flex-row-reverse")}>
                  <div><p className="font-medium">{isAr ? 'تقييد IP' : 'IP Restriction'}</p></div>
                  <Switch checked={config.ipRestriction} onCheckedChange={v => update('ipRestriction', v)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader><CardTitle>{isAr ? 'المظهر' : 'Appearance'}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>{isAr ? 'السمة' : 'Theme'}</Label>
                  <Select value={config.theme} onValueChange={v => update('theme', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">{isAr ? 'فاتح' : 'Light'}</SelectItem>
                      <SelectItem value="dark">{isAr ? 'داكن' : 'Dark'}</SelectItem>
                      <SelectItem value="system">{isAr ? 'تلقائي' : 'System'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>{isAr ? 'اللون الأساسي' : 'Primary Color'}</Label><Input type="color" value={config.primaryColor} onChange={e => update('primaryColor', e.target.value)} className="h-10 w-20" /></div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup */}
          <TabsContent value="backup">
            <Card>
              <CardHeader><CardTitle>{isAr ? 'النسخ الاحتياطي' : 'Backup & Data'}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className={cn("flex items-center justify-between p-4 border rounded-lg", isRTL && "flex-row-reverse")}>
                  <div><p className="font-medium">{isAr ? 'نسخ احتياطي تلقائي' : 'Auto Backup'}</p></div>
                  <Switch checked={config.autoBackup} onCheckedChange={v => update('autoBackup', v)} />
                </div>
                <div><Label>{isAr ? 'تكرار النسخ' : 'Backup Frequency'}</Label>
                  <Select value={config.backupFrequency} onValueChange={v => update('backupFrequency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{isAr ? 'يومي' : 'Daily'}</SelectItem>
                      <SelectItem value="weekly">{isAr ? 'أسبوعي' : 'Weekly'}</SelectItem>
                      <SelectItem value="monthly">{isAr ? 'شهري' : 'Monthly'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>{isAr ? 'الاحتفاظ بالبيانات' : 'Data Retention'}</Label>
                  <Select value={config.dataRetention} onValueChange={v => update('dataRetention', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1year">{isAr ? 'سنة' : '1 Year'}</SelectItem>
                      <SelectItem value="3years">{isAr ? '3 سنوات' : '3 Years'}</SelectItem>
                      <SelectItem value="5years">{isAr ? '5 سنوات' : '5 Years'}</SelectItem>
                      <SelectItem value="forever">{isAr ? 'بدون حد' : 'Forever'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
                  <Button variant="outline" onClick={() => toast({ title: isAr ? 'تم إنشاء نسخة احتياطية' : 'Backup Created' })}>{isAr ? 'نسخة يدوية الآن' : 'Manual Backup Now'}</Button>
                  <Button variant="outline" onClick={() => toast({ title: isAr ? 'جاري الاستعادة...' : 'Restoring...' })}>{isAr ? 'استعادة نسخة' : 'Restore Backup'}</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SiteSettings;
