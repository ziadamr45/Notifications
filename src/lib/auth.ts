import Cookies from 'js-cookie';

// بيانات تسجيل الدخول
const ADMIN_USERNAME = 'ziadamrme45';
const ADMIN_PASSWORD = 'Cc33Gg44##';
const AUTH_COOKIE_NAME = 'notifications_admin_auth';
const AUTH_COOKIE_EXPIRY = 7; // أيام

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

// حفظ جلسة تسجيل الدخول
export function setAuthSession(): void {
  if (typeof window !== 'undefined') {
    Cookies.set(AUTH_COOKIE_NAME, 'authenticated', {
      expires: AUTH_COOKIE_EXPIRY,
      secure: true,
      sameSite: 'strict',
    });
  }
}

// حذف جلسة تسجيل الدخول
export function clearAuthSession(): void {
  if (typeof window !== 'undefined') {
    Cookies.remove(AUTH_COOKIE_NAME);
  }
}

// التحقق من وجود جلسة تسجيل دخول (Client-side)
export function isAuthenticated(): boolean {
  if (typeof window !== 'undefined') {
    return Cookies.get(AUTH_COOKIE_NAME) === 'authenticated';
  }
  return false;
}

// التحقق من تسجيل الدخول من الخادم (Server-side)
export function checkServerAuth(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  return cookies.some(c => c === `${AUTH_COOKIE_NAME}=authenticated`);
}
