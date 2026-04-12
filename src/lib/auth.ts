import Cookies from 'js-cookie';

// بيانات تسجيل الدخول
const ADMIN_USERNAME = 'ziadamrme45';
const ADMIN_PASSWORD = 'Cc33Gg44##';
const AUTH_COOKIE_NAME = 'notifications_admin_auth';
const AUTH_SESSION_KEY = 'notif_admin_session';

// API Key للمصادقة مع مشروع الراديو
export const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'asmae-radio-admin-2024';

export interface AdminUser {
  username: string;
  isAuthenticated: boolean;
}

// التحقق من صحة بيانات تسجيل الدخول
export function validateCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

// حفظ جلسة تسجيل الدخول - sessionStorage فقط (تتمسح مع إغلاق التاب)
export function setAuthSession(): void {
  if (typeof window !== 'undefined') {
    // حفظ في sessionStorage - بتمسح لما التاب يقفل أو تعمل reload
    const sessionData = {
      authenticated: true,
      timestamp: Date.now(),
      fingerprint: generateFingerprint(),
    };
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));

    // كوكيز كـ fallback للـ API requests (بدون expiry طويل)
    Cookies.set(AUTH_COOKIE_NAME, 'authenticated', {
      secure: true,
      sameSite: 'strict',
    });
  }
}

// حذف جلسة تسجيل الدخول
export function clearAuthSession(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    Cookies.remove(AUTH_COOKIE_NAME);
  }
}

// التحقق من وجود جلسة تسجيل دخول (Client-side)
// بيتحقق من sessionStorage + fingerprint عشان متتمشسر
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;

  const sessionData = sessionStorage.getItem(AUTH_SESSION_KEY);
  if (!sessionData) return false;

  try {
    const session = JSON.parse(sessionData);
    // التحقق من fingerprint عشان متتمشسر في تاب تاني
    if (session.fingerprint !== generateFingerprint()) return false;
    // التحقق من إن الجلسة مش قديمة أكتر من ساعة
    if (Date.now() - session.timestamp > 60 * 60 * 1000) {
      clearAuthSession();
      return false;
    }
    return session.authenticated === true;
  } catch {
    return false;
  }
}

// التحقق من تسجيل الدخول من الخادم (Server-side)
export function checkServerAuth(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  return cookies.some(c => c === `${AUTH_COOKIE_NAME}=authenticated`);
}

// توليد fingerprint للمتصفح (Session Binding)
function generateFingerprint(): string {
  try {
    const nav = navigator as unknown as Record<string, unknown>;
    const screen = window.screen as unknown as Record<string, unknown>;
    const raw = [
      nav.userAgent,
      nav.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
    ].join('|');
    // Simple hash
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash.toString(36);
  } catch {
    return 'fallback';
  }
}
