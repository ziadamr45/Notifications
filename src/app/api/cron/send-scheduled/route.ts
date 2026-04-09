import { NextRequest, NextResponse } from 'next/server';
import { prisma, ADMIN_API_KEY } from '@/lib/db';

// رابط API مشروع الراديو
const RADIO_API_URL = process.env.RADIO_API_URL || 'https://esma3radio.vercel.app';

// التوقيت: Africa/Cairo (UTC+2 أو UTC+3 حسب التوقيت الصيفي)
const TIMEZONE = 'Africa/Cairo';

export async function GET(request: NextRequest) {
  // التحقق من أن الطلب من Vercel Cron أو من الأدمين
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'cron-secret-2024'}`) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  try {
    // الحصول على الوقت الحالي في توقيت مصر
    const now = new Date();
    
    // تحويل الوقت إلى توقيت مصر
    const egyptTimeStr = now.toLocaleString('en-US', { timeZone: TIMEZONE });
    const egyptDate = new Date(egyptTimeStr);
    
    const currentTime = `${String(egyptDate.getHours()).padStart(2, '0')}:${String(egyptDate.getMinutes()).padStart(2, '0')}`;
    const currentDay = egyptDate.getDay(); // 0=الأحد, 1=الإثنين, ...

    console.log(`[Cron] Checking scheduled notifications at ${currentTime} Egypt (day: ${currentDay})`);

    // جلب الإشعارات المجدولة المفعّلة
    const notifications = await prisma.scheduledNotification.findMany({
      where: { enabled: true },
    });

    let sentCount = 0;
    let errorCount = 0;
    const sentIds: string[] = [];

    for (const notification of notifications) {
      // تخطي الإشعارات اللي اتبعتت بالفعل في الدقيقة دي
      if (sentIds.includes(notification.id)) continue;

      let days: number[];
      try {
        days = JSON.parse(notification.days);
      } catch {
        console.error(`[Cron] Invalid days JSON for notification ${notification.id}`);
        continue;
      }

      // التحقق من أن الوقت مطابق (بدقة دقيقة) - ينفذ كل الإشعارات في أول 3 دقائق من كل ساعة
      // لأن Vercel Hobby بيشتغل كل ساعة بس
      const currentMinute = egyptDate.getMinutes();
      const scheduledMinute = parseInt(notification.time.split(':')[1], 10);
      const currentHour = egyptDate.getHours();
      const scheduledHour = parseInt(notification.time.split(':')[0], 10);

      // المباراة: الساعة لازم تكون نفسها، والدقيقة في نطاق 0-2 من كل ساعة
      // والإشعار المجدول بيكون بأي دقيقة فهنشغله في أول 3 دقائق
      if (currentHour !== scheduledHour) continue;
      if (currentMinute > 2 && scheduledMinute > 2) continue;
      if (scheduledMinute > 2 && currentMinute <= 2) continue;

      // التحقق من أن اليوم الحالي من الأيام المحددة
      if (!days.includes(currentDay)) continue;

      console.log(`[Cron] Sending scheduled notification: "${notification.title}" at ${notification.time}`);

      // إرسال الإشعار عبر API الراديو
      try {
        const response = await fetch(`${RADIO_API_URL}/api/notifications/broadcast`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-api-key': ADMIN_API_KEY,
          },
          body: JSON.stringify({
            title: notification.title,
            message: notification.message,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // حفظ سجل الإشعار
          try {
            await prisma.notificationLog.create({
              data: {
                title: notification.title,
                message: notification.message,
                sentTo: result.sent || 0,
                type: 'scheduled',
              },
            });
          } catch (logError) {
            console.error('[Cron] Failed to log notification:', logError);
          }

          console.log(`[Cron] Successfully sent "${notification.title}" to ${result.sent || 0} users`);
          sentCount++;
          sentIds.push(notification.id);
        } else {
          console.error(`[Cron] Failed to send "${notification.title}":`, result.error);
          errorCount++;
        }
      } catch (sendError) {
        console.error(`[Cron] Error sending "${notification.title}":`, sendError);
        errorCount++;
      }
    }

    console.log(`[Cron] Finished: sent=${sentCount}, errors=${errorCount}, total checked=${notifications.length}`);

    return NextResponse.json({
      success: true,
      sent: sentCount,
      errors: errorCount,
      checked: notifications.length,
      time: currentTime,
      timezone: TIMEZONE,
      day: currentDay,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}
