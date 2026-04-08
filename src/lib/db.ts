import { PrismaClient } from '@prisma/client';

// قاعدة البيانات المحلية للوحة التحكم
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// API Key للمصادقة مع مشروع الراديو
export const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'asmae-radio-admin-2024';

// أنواع البيانات من قاعدة الراديو
export interface RadioSubscriber {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userId: string;
  createdAt: Date;
  platform?: string;
}

export interface RadioUser {
  id: string;
  name: string;
  createdAt: Date;
  lastActive?: Date;
}
