import { NextRequest, NextResponse } from 'next/server';
import { prisma, ADMIN_API_KEY } from '@/lib/db';

// رابط API مشروع الراديو
const RADIO_API_URL = process.env.RADIO_API_URL || 'https://esma3radio.vercel.app';

// التوقيت: Africa/Cairo (UTC+2 أو UTC+3 حسب التوقيت الصيفي)
const TIMEZONE = 'Africa/Cairo';

export async function GET(request: NextRequest) {
  // التحقق من أن الطلب من Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'cron-secret-2024'}`) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  try {
    const now = new Date();
    const egyptTimeStr = now.toLocaleString('en-US', { timeZone: TIMEZONE });
    const egyptDate = new Date(egyptTimeStr);

    const currentHour = egyptDate.getHours();
    const currentMinute = egyptDate.getMinutes();
    const currentDay = egyptDate.getDay();

    console.log(`[Cron] Running at ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')} Egypt (day: ${currentDay})`);

    // جلب كل الإشعارات المجدولة المفعّلة
    const notifications = await prisma.scheduledNotification.findMany({
      where: { enabled: true },
    });

    let sentCount = 0;
    let errorCount = 0;

    for (const notification of notifications) {
      let days: number[];
      try {
        days = JSON.parse(notification.days);
      } catch {
        continue;
      }

      // التحقق من اليوم
      if (!days.includes(currentDay)) continue;

      const [scheduledHour, scheduledMinute] = notification.time.split(':').map(Number);

      // التحقق: الإشعار لازم يكون وقتها في آخر 60 دقيقة
      const scheduledMinutesFromMidnight = scheduledHour * 60 + scheduledMinute;
      const currentMinutesFromMidnight = currentHour * 60 + currentMinute;

      // لو الوقت فات من ساعة لحد آخر ساعة (يعني المفروض يكون اتبعت)
      const minutesDiff = currentMinutesFromMidnight - scheduledMinutesFromMidnight;
      if (minutesDiff < 0 || minutesDiff > 60) continue;

      console.log(`[Cron] Sending: "${notification.title}" (scheduled: ${notification.time}, current: ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')})`);

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
            console.error('[Cron] Failed to log:', logError);
          }
          console.log(`[Cron] ✅ Sent "${notification.title}" to ${result.sent || 0} users`);
          sentCount++;
        } else {
          console.error(`[Cron] ❌ Failed "${notification.title}":`, result.error);
          errorCount++;
        }
      } catch (sendError) {
        console.error(`[Cron] ❌ Error "${notification.title}":`, sendError);
        errorCount++;
      }
    }

    console.log(`[Cron] Done: sent=${sentCount}, errors=${errorCount}, checked=${notifications.length}`);

    return NextResponse.json({
      success: true,
      sent: sentCount,
      errors: errorCount,
      checked: notifications.length,
      time: `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`,
      timezone: TIMEZONE,
      day: currentDay,
    });
  } catch (error) {
    console.error('[Cron] Fatal error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
