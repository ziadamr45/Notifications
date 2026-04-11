import { NextRequest, NextResponse } from 'next/server';
import { checkServerAuth, ADMIN_API_KEY } from '@/lib/auth';

// رابط API مشروع الراديو
const RADIO_API_URL = process.env.RADIO_API_URL || 'https://esma3radio.vercel.app';

// نوع بيانات المشترك
interface SubscriberData {
  id?: string;
  userId?: string;
  name?: string;
  subscriptionsCount?: number;
  lastActive?: string;
  createdAt?: string;
  platforms?: string[];
  isNew?: boolean;
}

export async function GET(request: NextRequest) {
  // التحقق من المصادقة
  const cookieHeader = request.headers.get('cookie');
  if (!checkServerAuth(cookieHeader)) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  try {
    // جلب المستخدمين من API الراديو
    const response = await fetch(`${RADIO_API_URL}/api/notifications/subscribers`, {
      headers: {
        'x-admin-api-key': ADMIN_API_KEY,
      },
    });

    if (response.ok) {
      const data = await response.json();
      
      // تنسيق البيانات
      const users = (data.subscribers || data.users || []).map((sub: SubscriberData) => ({
        id: sub.userId || sub.id || 'unknown',
        name: sub.name || 'مستخدم بدون اسم',
        subscriptionsCount: sub.subscriptionsCount || 1,
        lastActive: sub.lastActive || sub.createdAt,
        platforms: sub.platforms || [],
        isNew: sub.isNew || false,
      }));

      return NextResponse.json({
        success: true,
        users,
      });
    }

    return NextResponse.json({
      success: true,
      users: [],
    });
  } catch {
    return NextResponse.json({
      success: true,
      users: [],
    });
  }
}
