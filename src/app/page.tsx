'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { validateCredentials, setAuthSession, clearAuthSession, isAuthenticated } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, User, Eye, EyeOff, Radio, Shield, AlertTriangle } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  // مسح أي جلسة قديمة عند فتح صفحة الدخول
  useEffect(() => {
    clearAuthSession();
  }, []);

  // عداد القفل
  useEffect(() => {
    if (isLocked && lockTimer > 0) {
      const timer = setTimeout(() => {
        setLockTimer(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (isLocked && lockTimer <= 0) {
      setIsLocked(false);
      setFailedAttempts(0);
    }
  }, [isLocked, lockTimer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      toast.error(`الحساب مقفل. حاول بعد ${lockTimer} ثانية`);
      return;
    }

    setIsLoading(true);

    // تأخير أمني
    await new Promise(resolve => setTimeout(resolve, 800));

    if (validateCredentials(username, password)) {
      setAuthSession();
      toast.success('تم تسجيل الدخول بنجاح!');
      router.push('/dashboard');
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= 5) {
        setIsLocked(true);
        setLockTimer(60); // قفل دقيقة
        toast.error('تم قفل الحساب بسبب عدة محاولات فاشلة. حاول بعد 60 ثانية');
      } else {
        const remaining = 5 - newAttempts;
        toast.error(`اسم المستخدم أو كلمة المرور غير صحيحة (متبقي ${remaining} محاولة)`);
      }

      // مسح كلمة المرور
      setPassword('');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2D8B8B]/10 to-[#237575]/5 p-4">
      <Toaster position="top-center" richColors />
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2D8B8B] to-[#237575] shadow-xl mb-4">
            <Radio className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">لوحة تحكم اسمع راديو</h1>
          <p className="text-muted-foreground mt-2">تطبيق اسمع راديو</p>
        </div>

        {/* Security Warning Badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-green-600" />
          <span className="text-xs text-green-600 font-medium">اتصال مشفر ومحمي</span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-card rounded-2xl shadow-xl p-8 border border-border">
          <div className="space-y-6">
            {/* Lock Warning */}
            {isLocked && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-500 text-sm">تم قفل الحساب مؤقتاً</p>
                  <p className="text-xs text-red-400">حاول مرة أخرى بعد {lockTimer} ثانية</p>
                </div>
              </div>
            )}

            {/* Session Info */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5 flex-shrink-0" />
              <span>الجلسة تنتهي تلقائياً عند إغلاق المتصفح أو إعادة تحميل الصفحة</span>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                اسم المستخدم
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                className="h-12 rounded-xl"
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Lock className="h-4 w-4" />
                كلمة المرور
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="h-12 rounded-xl ps-4 pe-12"
                  required
                  autoComplete="current-password"
                  disabled={isLocked}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-l from-[#2D8B8B] to-[#237575] hover:from-[#237575] hover:to-[#1d6060] text-white font-medium"
              disabled={isLoading || isLocked}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  جاري التحقق...
                </div>
              ) : isLocked ? (
                `مقفل (${lockTimer})`
              ) : (
                'تسجيل الدخول'
              )}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          © {new Date().getFullYear()} اسمع راديو - جميع الحقوق محفوظة | <a href="https://ziadamrme.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[#2D8B8B] hover:underline">Ziad Amr</a>
        </p>
      </div>
    </div>
  );
}
