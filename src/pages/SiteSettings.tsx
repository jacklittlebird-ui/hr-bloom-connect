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
import { Building2, Globe, Bell, Shield, Palette, Database, Save, Check, Sun, Moon, Monitor, Sparkles, Type, LayoutGrid, RotateCcw } from 'lucide-react';
import { applyThemeSettings, THEME_PRESETS, ACCENT_PALETTE, FONT_OPTIONS } from '@/lib/themeUtils';
import { loadAndApplyUserThemePrefs, saveUserThemePrefs } from '@/lib/userThemePrefs';

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
  themePreset?: string;
  radius?: string;
  density?: string;
  font?: string;
  headerStyle?: 'smooth' | 'sharp';
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
  primaryColor: '#2563eb',
  themePreset: 'corporate-blue',
  radius: 'md',
  density: 'comfortable',
  font: 'baloo',
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

  // Re-apply theme settings on mount, then merge any saved per-user prefs from DB
  useEffect(() => {
    applyThemeSettings(config);
    (async () => {
      const remote = await loadAndApplyUserThemePrefs();
      if (remote) {
        setConfig(prev => ({
          ...prev,
          ...(remote.theme ? { theme: remote.theme } : {}),
          ...(remote.themePreset ? { themePreset: remote.themePreset } : {}),
          ...(remote.primaryColor ? { primaryColor: remote.primaryColor } : {}),
          ...(remote.radius ? { radius: remote.radius } : {}),
          ...(remote.density ? { density: remote.density } : {}),
          ...(remote.font ? { font: remote.font } : {}),
        }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key: keyof SiteConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    setHasChanges(true);
    if (['theme', 'primaryColor', 'themePreset', 'radius', 'density', 'font'].includes(key as string)) {
      applyThemeSettings(newConfig as any);
    }
  };

  const updateMany = (patch: Partial<SiteConfig>) => {
    const newConfig = { ...config, ...patch };
    setConfig(newConfig);
    setHasChanges(true);
    applyThemeSettings(newConfig as any);
  };

  const toggleDay = (day: string) => {
    const days = config.workingDays.includes(day)
      ? config.workingDays.filter(d => d !== day)
      : [...config.workingDays, day];
    update('workingDays', days);
  };

  const handleSave = async () => {
    applyThemeSettings(config);
    try {
      localStorage.setItem('hr_site_config', JSON.stringify(config));
    } catch {}
    // Persist appearance prefs per user in the database
    const ok = await saveUserThemePrefs({
      theme: config.theme,
      themePreset: config.themePreset,
      primaryColor: config.primaryColor,
      radius: config.radius,
      density: config.density,
      font: config.font,
    });
    setHasChanges(false);
    toast({
      title: isAr ? 'تم الحفظ' : 'Saved',
      description: ok
        ? (isAr ? 'تم حفظ الإعدادات وتفضيلات المظهر للمستخدم' : 'Settings and appearance preferences saved for your account')
        : (isAr ? 'تم الحفظ محلياً (تعذّر المزامنة مع الحساب)' : 'Saved locally (could not sync with account)'),
    });
  };

  const handleReset = async () => {
    setConfig(defaultConfig);
    applyThemeSettings(defaultConfig);
    try {
      localStorage.setItem('hr_site_config', JSON.stringify(defaultConfig));
    } catch {}
    await saveUserThemePrefs({
      theme: defaultConfig.theme,
      themePreset: defaultConfig.themePreset,
      primaryColor: defaultConfig.primaryColor,
      radius: defaultConfig.radius,
      density: defaultConfig.density,
      font: defaultConfig.font,
    });
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
          <TabsContent value="appearance" className="space-y-6">
            {/* Mode + Live preview */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className={cn("flex items-center justify-between gap-3 flex-wrap", isRTL && "flex-row-reverse")}>
                  <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                    <Sparkles className="w-5 h-5 text-primary" />
                    <CardTitle>{isAr ? 'المظهر والسمات' : 'Theme & Appearance'}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => updateMany({
                      themePreset: 'corporate-blue', theme: 'system', primaryColor: '#2563eb',
                      radius: 'md', density: 'comfortable', font: 'baloo',
                    })}
                  >
                    <RotateCcw className="w-4 h-4" />
                    {isAr ? 'إعادة ضبط المظهر' : 'Reset Theme'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mode toggle */}
                <div>
                  <Label className="mb-2 block">{isAr ? 'وضع العرض' : 'Display Mode'}</Label>
                  <div className="grid grid-cols-3 gap-2 max-w-md">
                    {[
                      { v: 'light', icon: Sun, ar: 'فاتح', en: 'Light' },
                      { v: 'dark', icon: Moon, ar: 'داكن', en: 'Dark' },
                      { v: 'system', icon: Monitor, ar: 'تلقائي', en: 'System' },
                    ].map(m => {
                      const Icon = m.icon;
                      const active = config.theme === m.v;
                      return (
                        <button
                          key={m.v}
                          onClick={() => update('theme', m.v)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 p-3 transition-all hover:border-primary/50",
                            active ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card"
                          )}
                        >
                          <Icon className={cn("w-5 h-5", active ? "text-primary" : "text-muted-foreground")} />
                          <span className="text-xs font-medium">{isAr ? m.ar : m.en}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Theme presets */}
                <div>
                  <div className={cn("flex items-baseline justify-between mb-3", isRTL && "flex-row-reverse")}>
                    <Label className="text-base">{isAr ? 'سمات جاهزة' : 'Theme Presets'}</Label>
                    <span className="text-xs text-muted-foreground">{isAr ? 'اختر سمة كاملة بنقرة واحدة' : 'Apply a complete theme in one click'}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {THEME_PRESETS.map(p => {
                      const active = config.themePreset === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => updateMany({ themePreset: p.id, primaryColor: p.primary, theme: p.mode })}
                          className={cn(
                            "group relative rounded-xl border-2 overflow-hidden text-start transition-all hover:shadow-md hover:scale-[1.02]",
                            active ? "border-primary ring-2 ring-primary/30" : "border-border"
                          )}
                        >
                          {/* Mini preview */}
                          <div className="h-20 flex" style={{ backgroundColor: p.background }}>
                            <div className="w-1/4 h-full" style={{ backgroundColor: p.sidebarBackground }} />
                            <div className="flex-1 p-2 flex flex-col gap-1.5">
                              <div className="h-2 rounded-full" style={{ backgroundColor: p.primary, width: '60%' }} />
                              <div className="h-1.5 rounded-full opacity-40" style={{ backgroundColor: p.foreground, width: '80%' }} />
                              <div className="h-1.5 rounded-full opacity-25" style={{ backgroundColor: p.foreground, width: '50%' }} />
                              <div className="mt-auto flex gap-1">
                                <div className="h-3 w-6 rounded" style={{ backgroundColor: p.primary }} />
                                <div className="h-3 w-3 rounded" style={{ backgroundColor: p.muted, border: `1px solid ${p.border}` }} />
                              </div>
                            </div>
                          </div>
                          <div className="px-2.5 py-2 bg-card border-t">
                            <div className={cn("flex items-center justify-between gap-1", isRTL && "flex-row-reverse")}>
                              <span className="text-xs font-semibold truncate">{isAr ? p.name.ar : p.name.en}</span>
                              {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                            </div>
                            <span className="text-[10px] text-muted-foreground line-clamp-1">
                              {p.mode === 'dark' ? (isAr ? 'داكن' : 'Dark') : (isAr ? 'فاتح' : 'Light')}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Accent color palette */}
                <div>
                  <Label className="mb-3 block text-base">{isAr ? 'لون التمييز' : 'Accent Color'}</Label>
                  <div className="flex flex-wrap gap-2">
                    {ACCENT_PALETTE.map(c => {
                      const active = config.primaryColor.toLowerCase() === c.hex.toLowerCase();
                      return (
                        <button
                          key={c.hex}
                          title={c.name}
                          onClick={() => update('primaryColor', c.hex)}
                          className={cn(
                            "w-9 h-9 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center",
                            active ? "border-foreground shadow-md scale-110" : "border-transparent"
                          )}
                          style={{ backgroundColor: c.hex }}
                        >
                          {active && <Check className="w-4 h-4 text-white drop-shadow" />}
                        </button>
                      );
                    })}
                    <label className="w-9 h-9 rounded-full border-2 border-dashed border-border cursor-pointer flex items-center justify-center bg-muted hover:border-primary transition-colors" title={isAr ? 'لون مخصص' : 'Custom'}>
                      <Palette className="w-4 h-4 text-muted-foreground" />
                      <input type="color" value={config.primaryColor} onChange={e => update('primaryColor', e.target.value)} className="sr-only" />
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{isAr ? `اللون الحالي: ${config.primaryColor}` : `Current: ${config.primaryColor}`}</p>
                </div>

                {/* Radius + Density + Font row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 border-t">
                  {/* Radius */}
                  <div>
                    <Label className="mb-3 block flex items-center gap-2"><LayoutGrid className="w-4 h-4" />{isAr ? 'حدة الزوايا' : 'Corner Radius'}</Label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { v: 'none', label: '0' },
                        { v: 'sm', label: 'S' },
                        { v: 'md', label: 'M' },
                        { v: 'lg', label: 'L' },
                        { v: 'xl', label: 'XL' },
                      ].map(r => {
                        const active = (config.radius || 'md') === r.v;
                        const radiusPx = { none: 0, sm: 4, md: 8, lg: 12, xl: 16 }[r.v as 'none'|'sm'|'md'|'lg'|'xl'];
                        return (
                          <button
                            key={r.v}
                            onClick={() => update('radius', r.v)}
                            className={cn(
                              "h-12 border-2 flex flex-col items-center justify-center text-[10px] font-semibold transition-all hover:border-primary/50",
                              active ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground"
                            )}
                            style={{ borderRadius: radiusPx }}
                          >
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Density */}
                  <div>
                    <Label className="mb-3 block">{isAr ? 'كثافة الواجهة' : 'Interface Density'}</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { v: 'compact', ar: 'مضغوط', en: 'Compact' },
                        { v: 'comfortable', ar: 'مريح', en: 'Cozy' },
                        { v: 'spacious', ar: 'فسيح', en: 'Roomy' },
                      ].map(d => {
                        const active = (config.density || 'comfortable') === d.v;
                        return (
                          <button
                            key={d.v}
                            onClick={() => update('density', d.v)}
                            className={cn(
                              "rounded-lg border-2 px-2 py-3 text-xs font-medium transition-all hover:border-primary/50",
                              active ? "border-primary bg-primary/5 text-primary" : "border-border bg-card"
                            )}
                          >
                            {isAr ? d.ar : d.en}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Font */}
                  <div>
                    <Label className="mb-3 block flex items-center gap-2"><Type className="w-4 h-4" />{isAr ? 'الخط' : 'Font Family'}</Label>
                    <Select value={config.font || 'baloo'} onValueChange={v => update('font', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map(f => (
                          <SelectItem key={f.id} value={f.id}>
                            <span style={{ fontFamily: f.family }}>{isAr ? f.label.ar : f.label.en}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Live preview */}
                <div className="pt-2 border-t">
                  <Label className="mb-3 block text-base">{isAr ? 'معاينة مباشرة' : 'Live Preview'}</Label>
                  <div className="rounded-xl border bg-background p-5 space-y-4">
                    <div className={cn("flex items-center justify-between gap-3 flex-wrap", isRTL && "flex-row-reverse")}>
                      <div>
                        <h3 className="text-lg font-bold">{isAr ? 'لوحة المعاينة' : 'Preview Card'}</h3>
                        <p className="text-sm text-muted-foreground">{isAr ? 'هكذا ستبدو واجهتك' : 'This is how your interface will look'}</p>
                      </div>
                      <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
                        <Button size="sm">{isAr ? 'إجراء أساسي' : 'Primary'}</Button>
                        <Button size="sm" variant="outline">{isAr ? 'ثانوي' : 'Secondary'}</Button>
                        <Button size="sm" variant="ghost">{isAr ? 'شفاف' : 'Ghost'}</Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: isAr ? 'الموظفين' : 'Employees', value: '248', tone: 'primary' },
                        { label: isAr ? 'الحضور' : 'Present', value: '215', tone: 'success' },
                        { label: isAr ? 'الإجازات' : 'On Leave', value: '12', tone: 'warning' },
                        { label: isAr ? 'متأخر' : 'Late', value: '7', tone: 'destructive' },
                      ].map((s, i) => (
                        <div key={i} className="rounded-lg border bg-card p-3">
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                          <p className={cn(
                            "text-2xl font-bold mt-1",
                            s.tone === 'primary' && 'text-primary',
                            s.tone === 'success' && 'text-success',
                            s.tone === 'warning' && 'text-warning',
                            s.tone === 'destructive' && 'text-destructive',
                          )}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className={cn("flex items-center gap-2 text-sm", isRTL && "flex-row-reverse")}>
                      <Input placeholder={isAr ? 'حقل إدخال...' : 'Input field...'} className="max-w-xs" />
                      <Switch defaultChecked />
                      <span className="text-muted-foreground">{isAr ? 'تبديل' : 'Toggle'}</span>
                    </div>
                  </div>
                </div>
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
