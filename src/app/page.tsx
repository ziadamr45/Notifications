'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { validateCredentials, setAuthSession, isAuthenticated } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, User, Eye, EyeOff, Radio } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // التحقق من تسجيل الدخول عند تحميل الصفحة
  useEffect(() => {
    // استخدام setTimeout لتجنب cascading renders
    const timer = setTimeout(() => {
      if (isAuthenticated()) {
        router.push('/dashboard');
      } else {
        setIsChecking(false);
      }
    }, 0);
    
    return () => clearTimeout(timer);
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // محاكاة تأخير بسيط
    await new Promise(resolve => setTimeout(resolve, 500));

    if (validateCredentials(username, password)) {
      setAuthSession();
      toast.success('تم تسجيل الدخول بنجاح!');
      router.push('/dashboard');
    } else {
      toast.error('اسم المستخدم أو كلمة المرور غير صحيحة');
    }

    setIsLoading(false);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2D8B8B]/10 to-[#237575]/5">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#2D8B8B] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2D8B8B]/10 to-[#237575]/5 p-4">
      <Toaster position="top-center" richColors />
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2D8B8B] to-[#237575] shadow-xl mb-4">
            <Radio className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">لوحة تحكم الإشعارات</h1>
          <p className="text-muted-foreground mt-2">تطبيق اسمع راديو</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-card rounded-2xl shadow-xl p-8 border border-border">
          <div className="space-y-6">
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
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-l from-[#2D8B8B] to-[#237575] hover:from-[#237575] hover:to-[#1d6060] text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  جاري تسجيل الدخول...
                </div>
              ) : (
                'تسجيل الدخول'
              )}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          © {new Date().getFullYear()} اسمع راديو - جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
