import { NextRequest, NextResponse } from 'next/server';
import { checkServerAuth, ADMIN_API_KEY } from '@/lib/auth';
import { prisma } from '@/lib/db';

// رابط API مشروع الراديو
const RADIO_API_URL = process.env.RADIO_API_URL || 'https://esma3radio.vercel.app';

export async function POST(request: NextRequest) {
  // التحقق من المصادقة
  const cookieHeader = request.headers.get('cookie');
  if (!checkServerAuth(cookieHeader)) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, message, icon, url } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'العنوان والنص مطلوبان' }, { status: 400 });
    }

    // إرسال الإشعار عبر API الراديو
    const response = await fetch(`${RADIO_API_URL}/api/notifications/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-api-key': ADMIN_API_KEY,
      },
      body: JSON.stringify({
        title,
        message,
        icon: icon || undefined,
        url: url || undefined,
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // حفظ سجل الإشعار
      try {
        await prisma.notificationLog.create({
          data: {
            title,
            message,
            sentTo: result.sent || 0,
            type: 'broadcast',
          },
        });
      } catch (e) {
        console.error('Failed to log notification:', e);
      }

      return NextResponse.json({
        success: true,
        sent: result.sent || 0,
        total: result.total || 0,
        failed: result.failed || 0,
        details: result.details,
      });
    }

    return NextResponse.json({
      error: result.error || 'فشل في إرسال الإشعار',
    }, { status: 500 });

  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json({
      error: 'حدث خطأ أثناء الإرسال: ' + String(error),
    }, { status: 500 });
  }
}
