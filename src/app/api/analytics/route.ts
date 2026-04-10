import { NextRequest, NextResponse } from 'next/server';
import { checkServerAuth, ADMIN_API_KEY } from '@/lib/auth';

const RADIO_API_URL = process.env.RADIO_API_URL || 'https://asmae-radio.vercel.app';

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie');
  if (!checkServerAuth(cookieHeader)) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  try {
    const response = await fetch(`${RADIO_API_URL}/api/admin/analytics`, {
      headers: { 'x-admin-api-key': ADMIN_API_KEY },
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ success: true, analytics: data.analytics });
    }

    return NextResponse.json({ success: false, error: 'فشل في جلب التحليلات' }, { status: 502 });
  } catch {
    return NextResponse.json({ success: false, error: 'خطأ في الاتصال بخادم الراديو' }, { status: 500 });
  }
}
