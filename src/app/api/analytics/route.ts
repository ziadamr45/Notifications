import { NextRequest, NextResponse } from 'next/server';
import { checkServerAuth, ADMIN_API_KEY } from '@/lib/auth';

const RADIO_API_URL = process.env.RADIO_API_URL || 'https://esma3radio.vercel.app';

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie');
  if (!checkServerAuth(cookieHeader)) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  try {
    const response = await fetch(`${RADIO_API_URL}/api/admin/analytics`, {
      headers: { 'x-admin-api-key': ADMIN_API_KEY },
      signal: AbortSignal.timeout(30000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.analytics) {
        return NextResponse.json({ success: true, analytics: data.analytics });
      }
      return NextResponse.json({ success: false, error: data.error || 'فشل في جلب التحليلات من الخادم' });
    }

    return NextResponse.json({ success: false, error: 'خادم الراديو لم يستجب (HTTP ' + response.status + ')' });
  } catch (err) {
    const message = err instanceof Error && err.name === 'TimeoutError'
      ? 'انتهت مهلة الاتصال بخادم الراديو'
      : 'خطأ في الاتصال بخادم الراديو';
    return NextResponse.json({ success: false, error: message });
  }
}
