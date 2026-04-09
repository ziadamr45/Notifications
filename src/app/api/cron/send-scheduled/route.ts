import { NextRequest, NextResponse } from 'next/server';
import { prisma, ADMIN_API_KEY } from '@/lib/db';

// رابط API مشروع الراديو
const RADIO_API_URL = process.env.RADIO_API_URL || 'https://esma3radio.vercel.app';

// التوقيت: Africa/Cairo
const TIMEZONE = 'Africa/Cairo';

export async function GET(request: NextRequest) {
  try {
    // التحقق: إما من Vercel Cron header أو من External Cron Secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'cron-secret-2024';
    
    // قبول الطلبات من:
    // 1. Vercel Cron (x-vercel-cron header)
    // 2. External cron services (x-cron-secret header)
    // 3. Authorization Bearer token
    // 4. Query param ?secret=<secret> (fallback)
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    const cronSecretHeader = request.headers.get('x-cron-secret');
    const isValidAuth = authHeader === `Bearer ${cronSecret}`;
    const isValidCronHeader = cronSecretHeader === cronSecret;
    const querySecret = new URL(request.url).searchParams.get('secret');
    const isValidQuerySecret = querySecret === cronSecret;

    if (!isVercelCron && !isValidAuth && !isValidCronHeader && !isValidQuerySecret) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

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

      // التحقق: مطابقة الدقيقة بالظبط ( cron-job.org بيشتغل كل دقيقة)
      if (scheduledHour !== currentHour || scheduledMinute !== currentMinute) continue;

      console.log(`[Cron] Sending: "${notification.title}" (scheduled: ${notification.time})`);

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
            icon: notification.icon || undefined,
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
