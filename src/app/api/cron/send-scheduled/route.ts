import { NextRequest, NextResponse } from 'next/server';
import { prisma, ADMIN_API_KEY } from '@/lib/db';

// رابط API مشروع الراديو
const RADIO_API_URL = process.env.RADIO_API_URL || 'https://esma3radio.vercel.app';

// التوقيت: Africa/Cairo
const TIMEZONE = 'Africa/Cairo';

// إعدادات Retry
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

// دالة مساعدة: تنفيذ عملية مع Retry
async function withRetry<T>(
  operation: () => Promise<T>,
  context: string,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`[Cron] Retry ${attempt}/${retries} for ${context}:`, error);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }
  throw lastError;
}

// حساب الفرق بالدقايق بين وقتين (نفس اليوم)
function minutesDiff(hour: number, minute: number): number {
  return hour * 60 + minute;
}

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
    const currentTimeInMinutes = minutesDiff(currentHour, currentMinute);

    console.log(`[Cron] Running at ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')} Egypt (day: ${currentDay})`);

    // جلب كل الإشعارات المجدولة المفعّلة - مع Retry لقاعدة البيانات
    const notifications = await withRetry(
      () => prisma.scheduledNotification.findMany({ where: { enabled: true } }),
      'fetch scheduled notifications'
    );

    let sentCount = 0;
    let errorCount = 0;
    const skipped = [];

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
      const scheduledTimeInMinutes = minutesDiff(scheduledHour, scheduledMinute);
      const timeDiff = Math.abs(currentTimeInMinutes - scheduledTimeInMinutes);

      // الأولوية: الدقة - التحقق من مطابقة الدقيقة بالظبط
      // الحالة الاستثنائية: لو فات 1 دقيقة بس (بسبب تأخير الكرون) - كحالة إنقاذ فقط
      const isExactMatch = scheduledHour === currentHour && scheduledMinute === currentMinute;
      const isGracePeriod = timeDiff === 1; // دقيقة واحدة كحد أقصى

      if (!isExactMatch && !isGracePeriod) continue;

      // تسجيل إذا تم الإرسال في فترة السماح
      const sendMode = isExactMatch ? 'exact' : 'grace';
      if (!isExactMatch) {
        console.log(`[Cron] ⚠️ Grace period activated for "${notification.title}" (scheduled: ${notification.time}, current: ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0)})`);
      }

      console.log(`[Cron] Sending [${sendMode}]: "${notification.title}" (scheduled: ${notification.time})`);

      try {
        // إرسال الإشعار مع Retry لضمان الوصول
        const response = await withRetry(
          () => fetch(`${RADIO_API_URL}/api/notifications/broadcast`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-api-key': ADMIN_API_KEY,
            },
            body: JSON.stringify({
              title: notification.title,
              message: notification.message,
              icon: notification.icon || undefined,
              url: notification.url || undefined,
            }),
          }),
          `send "${notification.title}"`
        );

        const result = await response.json();

        if (response.ok && result.success) {
          // تسجيل الإشعار المرسل مع Retry
          try {
            await withRetry(
              () => prisma.notificationLog.create({
                data: {
                  title: notification.title,
                  message: notification.message,
                  sentTo: result.sent || 0,
                  type: 'scheduled',
                },
              }),
              `log "${notification.title}"`
            );
          } catch (logError) {
            console.error('[Cron] Failed to log:', logError);
          }
          console.log(`[Cron] ✅ Sent "${notification.title}" to ${result.sent || 0} users [${sendMode}]`);
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
