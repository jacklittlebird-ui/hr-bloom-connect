import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Eye, EyeOff, Globe, Download, Smartphone, CheckCircle, Share, ShieldAlert } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { checkRateLimit, recordLoginAttempt } from '@/lib/security';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage, isRTL } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => setIsInstalled(true);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
        toast({ title: t('تم تثبيت التطبيق بنجاح!', 'App installed successfully!') });
      }
      setDeferredPrompt(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: t('يرجى ملء جميع الحقول', 'Please fill all fields'), variant: 'destructive' });
      return;
    }
    
    // Rate limiting check
    const rateCheck = checkRateLimit(email.trim());
    if (!rateCheck.allowed) {
      const mins = Math.ceil((rateCheck.remainingMs || 0) / 60000);
      toast({ 
        title: t('تم تجاوز عدد المحاولات المسموحة', 'Too many login attempts'), 
        description: t(`يرجى المحاولة بعد ${mins} دقيقة`, `Please try again in ${mins} minutes`),
        variant: 'destructive' 
      });
      return;
    }
    
    setLoading(true);
    const result = await login({ email: email.trim(), password });
    setLoading(false);
    
    recordLoginAttempt(email.trim(), result.success);
    
    if (result.success) {
      toast({ title: t('تم تسجيل الدخول بنجاح', 'Login successful') });
    } else {
      toast({ title: t('بيانات الدخول غير صحيحة', 'Invalid credentials'), description: result.error, variant: 'destructive' });
    }
  };

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(var(--primary)/0.08)] via-background to-[hsl(var(--stat-blue)/0.08)] p-4",
      isRTL ? "font-arabic" : "font-sans"
    )} dir="rtl">
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50"
        onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
        aria-label={t('تغيير اللغة', 'Change language')}
      >
        <Globe className="h-5 w-5" />
      </Button>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <picture>
            <source srcSet="/images/company-logo-vertical.webp" type="image/webp" />
            <img src="/images/company-logo-vertical.png" alt="Link Aero" width="144" height="144" fetchPriority="high" className="h-36 w-36 rounded-2xl object-contain mb-4 mx-auto block" />
          </picture>
          <h1 className="text-2xl font-bold text-foreground">{t('نظام إدارة الموارد البشرية', 'HR Management System')}</h1>
          <p className="text-muted-foreground mt-1">{t('سجّل دخولك للمتابعة', 'Sign in to continue')}</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{t('تسجيل الدخول', 'Sign In')}</TabsTrigger>
            <TabsTrigger value="install">{t('تحميل التطبيق', 'Install App')}</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
             <Card className="border-0 shadow-xl text-right">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-right">{t('تسجيل الدخول', 'Sign In')}</CardTitle>
                <CardDescription className="text-right">{t('أدخل بريدك الإلكتروني وكلمة المرور', 'Enter your email and password')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2 text-right">
                    <Label className="text-right">{t('البريد الإلكتروني', 'Email')}</Label>
                    <Input
                      type="email"
                      placeholder={t('البريد الإلكتروني', 'Email')}
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="h-11 text-right"
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2 text-right">
                    <Label className="text-right">{t('كلمة المرور', 'Password')}</Label>
                    <div className="flex flex-row-reverse gap-2 items-center">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="h-11 flex-1 text-right"
                        dir="rtl"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? t('إخفاء كلمة المرور', 'Hide password') : t('إظهار كلمة المرور', 'Show password')}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? t('جاري الدخول...', 'Signing in...') : t('تسجيل الدخول', 'Sign In')}
                  </Button>
                </form>

                <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border text-right">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">{t('ملاحظة:', 'Note:')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('يتم تحديد الدور (مدير/موظف/مدير محطة) تلقائياً بناءً على حسابك', 'Your role (admin/employee/station manager) is determined automatically from your account')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="install">
            <Card className="border-0 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  {t('تحميل التطبيق', 'Install App')}
                </CardTitle>
                <CardDescription>
                  {t('ثبّت التطبيق على هاتفك للوصول السريع والعمل بدون إنترنت', 'Install the app on your phone for quick access and offline support')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isInstalled ? (
                  <div className="text-center py-6 space-y-3">
                    <CheckCircle className="h-12 w-12 mx-auto text-success" />
                    <p className="font-semibold text-lg">{t('التطبيق مثبت بالفعل!', 'App is already installed!')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('يمكنك الوصول للتطبيق من الشاشة الرئيسية', 'You can access the app from your home screen')}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Android / Chrome - direct install */}
                    {deferredPrompt && (
                      <Button onClick={handleInstall} className="w-full h-12" size="lg">
                        <Download className="h-5 w-5 me-2" />
                        {t('تثبيت التطبيق الآن', 'Install App Now')}
                      </Button>
                    )}

                    {/* iOS instructions */}
                    {isIOS && !deferredPrompt && (
                      <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Share className="h-4 w-4" />
                          {t('خطوات التثبيت على iPhone', 'Install on iPhone')}
                        </h3>
                        <ol className={cn("space-y-3 text-sm", isRTL && "text-right")}>
                          <li className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                            <span>{t('اضغط على زر المشاركة (⬆) في أسفل المتصفح Safari', 'Tap the Share button (⬆) at the bottom of Safari')}</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                            <span>{t('اختر "إضافة إلى الشاشة الرئيسية"', 'Choose "Add to Home Screen"')}</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                            <span>{t('اضغط "إضافة" لتثبيت التطبيق', 'Tap "Add" to install the app')}</span>
                          </li>
                        </ol>
                      </div>
                    )}

                    {/* Generic instructions for other browsers */}
                    {!isIOS && !deferredPrompt && (
                      <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          {t('خطوات التثبيت', 'Installation Steps')}
                        </h3>
                        <ol className={cn("space-y-3 text-sm", isRTL && "text-right")}>
                          <li className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                            <span>{t('افتح قائمة المتصفح (⋮)', 'Open browser menu (⋮)')}</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                            <span>{t('اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"', 'Choose "Install app" or "Add to Home Screen"')}</span>
                          </li>
                        </ol>
                      </div>
                    )}

                    {/* Features */}
                    <div className="grid grid-cols-1 gap-2 pt-2">
                      {[
                        { ar: 'وصول سريع من الشاشة الرئيسية', en: 'Quick access from home screen' },
                        { ar: 'يعمل بدون إنترنت', en: 'Works offline' },
                        { ar: 'تسجيل حضور سهل عبر QR', en: 'Easy QR attendance' },
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                          <span>{t(feature.ar, feature.en)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Developed by OneStory Solutions
        </p>
      </div>
    </div>
  );
};

export default LoginPage;