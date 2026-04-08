import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Globe, Download, Smartphone, CheckCircle, Share, LogIn, User, Lock, Plane, Shield, Clock, BarChart3 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { checkRateLimit, recordLoginAttempt } from '@/lib/security';
import { normalizeLoginIdentifier } from '@/lib/auth';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage, isRTL } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'install'>('login');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
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
    const normalizedIdentifier = normalizeLoginIdentifier(email);
    const rateCheck = checkRateLimit(normalizedIdentifier);
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
    const result = await login({ email: normalizedIdentifier, password });
    setLoading(false);
    recordLoginAttempt(normalizedIdentifier, result.success);
    if (result.success) {
      toast({ title: t('تم تسجيل الدخول بنجاح', 'Login successful') });
      navigate(result.redirectTo || '/', { replace: true });
    } else {
      toast({ title: t('بيانات الدخول غير صحيحة', 'Invalid credentials'), description: result.error, variant: 'destructive' });
    }
  };

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const features = [
    { icon: Shield, ar: 'نظام آمن ومحمي بالكامل', en: 'Fully secure & protected system' },
    { icon: Clock, ar: 'تتبع الحضور والانصراف', en: 'Attendance tracking' },
    { icon: BarChart3, ar: 'تقارير وتحليلات شاملة', en: 'Comprehensive reports & analytics' },
    { icon: Plane, ar: 'إدارة متكاملة للموارد البشرية', en: 'Integrated HR management' },
    { icon: User, ar: 'إدارة التوظيف واستقطاب الكفاءات', en: 'Recruitment & talent acquisition' },
    { icon: Globe, ar: 'إدارة التدريب وتطوير الموظفين', en: 'Training & employee development' },
    { icon: Lock, ar: 'تعيين وتتبع الأصول واليونيفورم للموظفين', en: 'Asset & uniform tracking' },
    { icon: LogIn, ar: 'إدارة سيارات الشركة وحركتها وصيانتها', en: 'Vehicle fleet management' },
    { icon: Smartphone, ar: 'إدارة الإجازات والأذونات بسهولة', en: 'Leave & permission management' },
    { icon: CheckCircle, ar: 'إرسال الإشعارات والتنبيهات للموظفين بشكل فوري', en: 'Instant employee notifications' },
  ];

  return (
    <main className={cn("min-h-screen flex", isRTL ? "font-arabic" : "font-sans")} dir="rtl">
      {/* Language toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm shadow-sm border border-border/50 hover:bg-background"
        onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
        aria-label={t('تغيير اللغة', 'Change language')}
      >
        <Globe className="h-4 w-4" />
      </Button>

      {/* Left decorative panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-[hsl(217,91%,40%)] via-[hsl(217,91%,50%)] to-[hsl(210,80%,55%)]">
        {/* Decorative shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }} />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center px-12 xl:px-16 w-full h-full text-center">
          <h2 className="text-3xl xl:text-4xl font-bold text-white mb-3 leading-tight">
            {t('نظام إدارة الموارد البشرية', 'HR Management System')}
          </h2>
          <p className="text-white/70 text-lg mb-10 leading-relaxed max-w-md">
            {t('منصة متكاملة لإدارة جميع عمليات الموارد البشرية', 'Integrated platform for all HR operations')}
          </p>

          <div className="space-y-3 w-full max-w-md">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors flex-shrink-0">
                  <f.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-white/90 text-sm font-medium text-right">{t(f.ar, f.en)}</span>
              </div>
            ))}
          </div>

          <p className="text-white/40 text-xs mt-10">Developed by OneStory Solutions</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 sm:p-8">
        <div className="w-full max-w-[420px]">
          {/* Logos */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <picture>
              <source srcSet="/images/company-logo-vertical.webp" type="image/webp" />
              <img src="/images/company-logo-vertical.png" alt="Link Aero" width="100" height="100" fetchPriority="high" className="h-24 w-24 rounded-2xl object-contain" />
            </picture>
            <img src="/images/one-hr-logo.png" alt="One HR" width="100" height="100" className="h-24 w-24 object-contain" />
          </div>
          <h1 className="lg:hidden text-xl font-bold text-foreground text-center mb-4">{t('نظام إدارة الموارد البشرية', 'HR Management System')}</h1>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6">
            <button
              onClick={() => setActiveTab('login')}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === 'login'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LogIn className="h-4 w-4 inline-block me-2 -mt-0.5" />
              {t('تسجيل الدخول', 'Sign In')}
            </button>
            <button
              onClick={() => setActiveTab('install')}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === 'install'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Smartphone className="h-4 w-4 inline-block me-2 -mt-0.5" />
              {t('تحميل التطبيق', 'Install App')}
            </button>
          </div>

          {/* Login tab */}
          {activeTab === 'login' && (
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">{t('مرحباً بعودتك', 'Welcome back')}</h2>
                <p className="text-muted-foreground text-sm mt-1">{t('سجّل دخولك للمتابعة', 'Sign in to continue')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2 text-right">
                  <Label className="text-sm font-medium">{t('البريد الإلكتروني أو كود الموظف', 'Email or Employee Code')}</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder={t('أدخل البريد أو الكود', 'Enter email or code')}
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="h-12 pe-11 text-right rounded-xl border-border/80 bg-background focus:border-primary transition-colors"
                      dir="rtl"
                    />
                    <User className="absolute top-1/2 -translate-y-1/2 end-3.5 h-4.5 w-4.5 text-muted-foreground/60 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2 text-right">
                  <Label className="text-sm font-medium">{t('كلمة المرور', 'Password')}</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="h-12 pe-11 ps-12 text-right rounded-xl border-border/80 bg-background focus:border-primary transition-colors"
                      dir="rtl"
                    />
                    <Lock className="absolute top-1/2 -translate-y-1/2 end-3.5 h-4.5 w-4.5 text-muted-foreground/60 pointer-events-none" />
                    <button
                      type="button"
                      className="absolute top-1/2 -translate-y-1/2 start-3 p-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? t('إخفاء كلمة المرور', 'Hide password') : t('إظهار كلمة المرور', 'Show password')}
                    >
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      {t('جاري الدخول...', 'Signing in...')}
                    </span>
                  ) : (
                    <>
                      <LogIn className="h-4.5 w-4.5 me-2" />
                      {t('تسجيل الدخول', 'Sign In')}
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border/50">
                <p className="text-xs text-muted-foreground leading-relaxed text-center">
                  {t('يمكنك تسجيل الدخول بالبريد الإلكتروني أو كود الموظف، ويتم تحديد الدور تلقائياً', 'Sign in with email or employee code — your role is determined automatically')}
                </p>
              </div>
            </div>
          )}

          {/* Install tab */}
          {activeTab === 'install' && (
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">{t('تحميل التطبيق', 'Install App')}</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {t('ثبّت التطبيق على هاتفك للوصول السريع', 'Install the app for quick access')}
                </p>
              </div>

              {isInstalled ? (
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--stat-green-bg))] flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-[hsl(var(--stat-green))]" />
                  </div>
                  <p className="font-semibold text-lg">{t('التطبيق مثبت بالفعل!', 'App is already installed!')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('يمكنك الوصول للتطبيق من الشاشة الرئيسية', 'Access the app from your home screen')}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {deferredPrompt && (
                    <Button onClick={handleInstall} className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20" size="lg">
                      <Download className="h-5 w-5 me-2" />
                      {t('تثبيت التطبيق الآن', 'Install App Now')}
                    </Button>
                  )}

                  {isIOS && !deferredPrompt && (
                    <div className="space-y-4 p-5 rounded-xl bg-muted/50 border border-border/50">
                      <h3 className="font-semibold flex items-center gap-2 text-sm">
                        <Share className="h-4 w-4" />
                        {t('خطوات التثبيت على iPhone', 'Install on iPhone')}
                      </h3>
                      <ol className={cn("space-y-3 text-sm", isRTL && "text-right")}>
                        {[
                          { ar: 'اضغط على زر المشاركة (⬆) في أسفل Safari', en: 'Tap Share (⬆) at the bottom of Safari' },
                          { ar: 'اختر "إضافة إلى الشاشة الرئيسية"', en: 'Choose "Add to Home Screen"' },
                          { ar: 'اضغط "إضافة" لتثبيت التطبيق', en: 'Tap "Add" to install' },
                        ].map((step, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{i + 1}</span>
                            <span>{t(step.ar, step.en)}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {!isIOS && !deferredPrompt && (
                    <div className="space-y-4 p-5 rounded-xl bg-muted/50 border border-border/50">
                      <h3 className="font-semibold flex items-center gap-2 text-sm">
                        <Download className="h-4 w-4" />
                        {t('خطوات التثبيت', 'Installation Steps')}
                      </h3>
                      <ol className={cn("space-y-3 text-sm", isRTL && "text-right")}>
                        {[
                          { ar: 'افتح قائمة المتصفح (⋮)', en: 'Open browser menu (⋮)' },
                          { ar: 'اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"', en: 'Choose "Install app" or "Add to Home Screen"' },
                        ].map((step, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{i + 1}</span>
                            <span>{t(step.ar, step.en)}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 pt-1">
                    {[
                      { ar: 'وصول سريع من الشاشة الرئيسية', en: 'Quick access from home screen' },
                      { ar: 'يعمل بدون إنترنت', en: 'Works offline' },
                      { ar: 'تسجيل حضور سهل عبر QR', en: 'Easy QR attendance' },
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground p-2.5 rounded-lg bg-muted/30">
                        <CheckCircle className="h-4 w-4 text-[hsl(var(--stat-green))] flex-shrink-0" />
                        <span>{t(feature.ar, feature.en)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer - mobile only */}
          <p className="lg:hidden text-center text-xs text-muted-foreground mt-8">
            Developed by OneStory Solutions
          </p>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
