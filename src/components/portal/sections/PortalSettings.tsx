import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Lock, Bell, Check, Palette } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { applyThemeSettings } from '@/lib/themeUtils';

interface NotificationSettings {
  email: boolean;
  requests: boolean;
  attendance: boolean;
  salary: boolean;
  evaluations: boolean;
}

const COLOR_PRESETS = [
  { name: 'أزرق', nameEn: 'Blue', value: '#1570EF' },
  { name: 'أحمر', nameEn: 'Red', value: '#DC2626' },
  { name: 'أخضر', nameEn: 'Green', value: '#16A34A' },
  { name: 'بنفسجي', nameEn: 'Purple', value: '#7C3AED' },
  { name: 'برتقالي', nameEn: 'Orange', value: '#EA580C' },
  { name: 'وردي', nameEn: 'Pink', value: '#DB2777' },
  { name: 'تركوازي', nameEn: 'Teal', value: '#0D9488' },
  { name: 'رمادي', nameEn: 'Slate', value: '#475569' },
];

export const PortalSettings = () => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#1570EF');
  const [customColor, setCustomColor] = useState('');

  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    email: true, requests: true, attendance: true, salary: true, evaluations: true,
  });

  // Load saved portal color on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('portal_primary_color');
      if (saved) {
        setSelectedColor(saved);
        setCustomColor(saved);
      }
    } catch {}
  }, []);

  const applyColor = (color: string) => {
    setSelectedColor(color);
    setCustomColor(color);
    localStorage.setItem('portal_primary_color', color);
    applyThemeSettings({ primaryColor: color });
    toast({
      title: ar ? 'تم التحديث' : 'Updated',
      description: ar ? 'تم تغيير اللون بنجاح' : 'Color changed successfully',
    });
  };

  const resetColor = () => {
    const defaultColor = '#1570EF';
    setSelectedColor(defaultColor);
    setCustomColor(defaultColor);
    localStorage.removeItem('portal_primary_color');
    applyThemeSettings({ primaryColor: defaultColor });
    toast({
      title: ar ? 'تم إعادة الضبط' : 'Reset',
      description: ar ? 'تم إعادة اللون الافتراضي' : 'Default color restored',
    });
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: ar ? 'خطأ' : 'Error', description: ar ? 'يرجى ملء جميع الحقول' : 'Please fill all fields', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: ar ? 'خطأ' : 'Error', description: ar ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: ar ? 'خطأ' : 'Error', description: ar ? 'كلمة المرور غير متطابقة' : 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      toast({ title: ar ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: ar ? 'تم التحديث' : 'Updated', description: ar ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully' });
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const toggleNotif = (key: keyof NotificationSettings) => {
    setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const notifOptions = [
    { key: 'email' as const, ar: 'إشعارات البريد الإلكتروني', en: 'Email Notifications' },
    { key: 'requests' as const, ar: 'إشعارات الطلبات', en: 'Request Notifications' },
    { key: 'attendance' as const, ar: 'تذكيرات الحضور', en: 'Attendance Reminders' },
    { key: 'salary' as const, ar: 'إشعارات الرواتب', en: 'Salary Notifications' },
    { key: 'evaluations' as const, ar: 'إشعارات التقييمات', en: 'Evaluation Notifications' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{ar ? 'الإعدادات' : 'Settings'}</h1>

      {/* Color Theme Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            {ar ? 'لون الواجهة' : 'Interface Color'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => applyColor(preset.value)}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div
                  className="w-10 h-10 rounded-full border-2 transition-all duration-200 flex items-center justify-center"
                  style={{
                    backgroundColor: preset.value,
                    borderColor: selectedColor === preset.value ? preset.value : 'transparent',
                    boxShadow: selectedColor === preset.value ? `0 0 0 3px hsl(var(--background)), 0 0 0 5px ${preset.value}` : 'none',
                  }}
                >
                  {selectedColor === preset.value && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">{ar ? preset.name : preset.nameEn}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Label className="shrink-0">{ar ? 'لون مخصص' : 'Custom Color'}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColor || '#1570EF'}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer"
              />
              <Button size="sm" variant="outline" onClick={() => applyColor(customColor)}>
                {ar ? 'تطبيق' : 'Apply'}
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={resetColor} className="text-muted-foreground">
              {ar ? 'إعادة ضبط' : 'Reset'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" />{ar ? 'تغيير كلمة المرور' : 'Change Password'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{ar ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{ar ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
          <Button onClick={handlePasswordChange} className="gap-2" disabled={loading}>
            <Check className="w-4 h-4" />
            {loading ? (ar ? 'جاري التحديث...' : 'Updating...') : (ar ? 'حفظ' : 'Save')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" />{ar ? 'إعدادات الإشعارات' : 'Notification Settings'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {notifOptions.map(s => (
            <div key={s.key} className="flex items-center justify-between">
              <Label>{ar ? s.ar : s.en}</Label>
              <Switch checked={notifSettings[s.key]} onCheckedChange={() => toggleNotif(s.key)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};