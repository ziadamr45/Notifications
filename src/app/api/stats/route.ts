import { NextRequest, NextResponse } from 'next/server';
import { checkServerAuth, ADMIN_API_KEY } from '@/lib/auth';

// رابط API مشروع الراديو
const RADIO_API_URL = process.env.RADIO_API_URL || 'https://esma3radio.vercel.app';

export async function GET(request: NextRequest) {
  // التحقق من المصادقة
  const cookieHeader = request.headers.get('cookie');
  if (!checkServerAuth(cookieHeader)) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  try {
    // جلب الإحصائيات من قاعدة بيانات الراديو
    const response = await fetch(`${RADIO_API_URL}/api/admin/stats`, {
      headers: {
        'x-admin-api-key': ADMIN_API_KEY,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        stats: data.stats || data,
      });
    }

    // إذا فشل الاتصال، نرجع قيم افتراضية
    return NextResponse.json({
      success: true,
      stats: {
        namedUsers: { total: 0, today: 0, thisWeek: 0, lastWeek: 0 },
        visitors: { total: 0, today: 0, thisWeek: 0, lastWeek: 0 },
        subscribers: { total: 0, today: 0, thisWeek: 0, lastWeek: 0 },
        onlineUsers: 0,
        activeLastHour: 0,
        notificationsSentToday: 0,
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      stats: {
        namedUsers: { total: 0, today: 0, thisWeek: 0, lastWeek: 0 },
        visitors: { total: 0, today: 0, thisWeek: 0, lastWeek: 0 },
        subscribers: { total: 0, today: 0, thisWeek: 0, lastWeek: 0 },
        onlineUsers: 0,
        activeLastHour: 0,
        notificationsSentToday: 0,
      },
    });
  }
}
