import { NextRequest, NextResponse } from 'next/server';
import { checkServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - جلب الإشعارات المجدولة
export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie');
  if (!checkServerAuth(cookieHeader)) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  try {
    const notifications = await prisma.scheduledNotification.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // تحويل الأيام من JSON string إلى array
    const formattedNotifications = notifications.map(n => ({
      ...n,
      days: JSON.parse(n.days),
    }));

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
    });
  } catch (error) {
    console.error('Fetch scheduled notifications error:', error);
    return NextResponse.json({
      success: true,
      notifications: [],
    });
  }
}

// POST - إضافة إشعار مجدول جديد
export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie');
  if (!checkServerAuth(cookieHeader)) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, message, time, days, enabled } = body;

    if (!title || !message || !days || days.length === 0) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });
    }

    const notification = await prisma.scheduledNotification.create({
      data: {
        title,
        message,
        time,
        days: JSON.stringify(days),
        enabled: enabled ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      notification: {
        ...notification,
        days: JSON.parse(notification.days),
      },
    });
  } catch (error) {
    console.error('Create scheduled notification error:', error);
    return NextResponse.json({
      error: 'فشل في إنشاء الإشعار',
    }, { status: 500 });
  }
}

// PUT - تحديث إشعار مجدول
export async function PUT(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie');
  if (!checkServerAuth(cookieHeader)) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, enabled, title, message, time, days } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف الإشعار مطلوب' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    if (enabled !== undefined) updateData.enabled = enabled;
    if (title) updateData.title = title;
    if (message) updateData.message = message;
    if (time) updateData.time = time;
    if (days) updateData.days = JSON.stringify(days);

    const notification = await prisma.scheduledNotification.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      notification: {
        ...notification,
        days: JSON.parse(notification.days),
      },
    });
  } catch (error) {
    console.error('Update scheduled notification error:', error);
    return NextResponse.json({
      error: 'فشل في تحديث الإشعار',
    }, { status: 500 });
  }
}

// DELETE - حذف إشعار مجدول
export async function DELETE(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie');
  if (!checkServerAuth(cookieHeader)) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف الإشعار مطلوب' }, { status: 400 });
    }

    await prisma.scheduledNotification.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Delete scheduled notification error:', error);
    return NextResponse.json({
      error: 'فشل في حذف الإشعار',
    }, { status: 500 });
  }
}
