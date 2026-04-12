'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, clearAuthSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Clock,
  Users,
  LogOut,
  Radio,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  User,
  Activity,
  Image as ImageIcon,
  Calendar,
  ChevronDown,
  ChevronUp,
  Eye,
  Bell,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Monitor,
  Smartphone,
  Globe,
  Search,
  Bot,
  Headphones,
  Zap,
  Target,
  MousePointerClick,
  Mail,
  MailOpen,
  Timer,
  CalendarDays,
  LayoutDashboard,
  PieChart,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

// أنواع البيانات
interface ScheduledNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  days: number[];
  enabled: boolean;
  icon?: string;
  url?: string;
}

interface UserData {
  id: string;
  name: string;
  subscriptionsCount: number;
  lastActive?: string;
  platforms?: string[];
  isNew?: boolean;
}

interface StatBreakdown {
  total: number;
  today: number;
  thisWeek: number;
  lastWeek: number;
}

interface Stats {
  namedUsers: StatBreakdown;
  visitors: StatBreakdown;
  subscribers: StatBreakdown;
  onlineUsers: number;
  activeLastHour: number;
  notificationsSentToday: number;
}

interface AnalyticsData {
  notifications: {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalConverted: number;
    openRate: string;
    clickRate: string;
    conversionRate: string;
    sentToday: number;
    openedToday: number;
    sentLast7Days: number;
    openedLast7Days: number;
    topNotifications: {
      title: string;
      type: string;
      sentAt: string;
      opened: boolean;
      clicked: boolean;
      converted: boolean;
    }[];
    dailyMetrics: {
      date: string;
      type: string;
      sent: number;
      opened: number;
      clicked: number;
      openRate: string;
      clickRate: string;
    }[];
    unreadByUser: { userId: string; userName: string; unreadCount: number }[];
    scheduled: {
      list: ScheduledNotification[];
      stats: { pending: number; sent: number; failed: number; cancelled: number };
    };
  };
  listening: {
    totalListeningHours: number;
    totalListeningMinutes: number;
    totalSessions: number;
    avgSessionMinutes: number;
    topCategories: [string, number][];
    topStations: { name: string; count: number }[];
    peakHours: { hour: number; count: number }[];
    peakDays: { day: string; count: number }[];
    recentSessions: {
      user: string;
      station: string;
      duration: number;
      mood: string;
      liked: boolean;
      skipped: boolean;
      startedAt: string;
      endedAt: string;
    }[];
    usersWithListeningData: number;
  };
  users: {
    total: number;
    withActivity: number;
    topActive: {
      userId: string;
      name: string;
      sessions: number;
      listeningHours: number;
      avgMinutes: number;
      memberSince: string;
    }[];
    topFavorites: {
      userId: string;
      name: string;
      favorites: number;
      history: number;
      aiChats: number;
      memberSince: string;
    }[];
    topSearches: { query: string; count: number }[];
    aiUsage: {
      totalChats: number;
      uniqueUsers: number;
      recentChats: {
        user: string;
        message: string;
        response: string;
        action: string;
        createdAt: string;
      }[];
    };
  };
  devices: {
    total: number;
    activeSubscriptions: number;
    inactiveSubscriptions: number;
    platforms: Record<string, number>;
    browsers: Record<string, number>;
    operatingSystems: Record<string, number>;
    list: {
      deviceId: string;
      user: string;
      platform: string;
      displayName: string;
      lastSeen: string;
      firstSeen: string;
    }[];
  };
}

// أيام الأسبوع
const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// تعريف التبويبات
const TABS = [
  { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
  { id: 'notifications', label: 'تحليلات الإشعارات', icon: Bell },
  { id: 'listening', label: 'تحليلات الاستماع', icon: Headphones },
  { id: 'users', label: 'المستخدمين', icon: Users },
  { id: 'devices', label: 'الأجهزة', icon: Monitor },
] as const;

type TabId = (typeof TABS)[number]['id'];

// تنسيق الأرقام
function formatNumber(n: number): string {
  return n.toLocaleString('ar-EG');
}

// مكون التحميل (سكيليتون)
function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-muted rounded w-24" />
            <div className="h-7 bg-muted rounded w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
          <div className="h-4 bg-muted rounded flex-1" />
          <div className="h-4 bg-muted rounded w-20" />
          <div className="h-4 bg-muted rounded w-16" />
        </div>
      ))}
    </div>
  );
}

// مكون رسالة الخطأ مع زر إعادة المحاولة
function AnalyticsErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive opacity-80" />
        <p className="text-muted-foreground mb-1 text-sm">لا تتوفر بيانات حالياً</p>
        <p className="text-destructive text-xs mb-4 max-w-md mx-auto">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2 mx-auto">
          <RefreshCw className="h-4 w-4" />
          إعادة المحاولة
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // حالة التبويب النشط
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // حالة الإحصائيات
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // حالة المستخدمين
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showUserList, setShowUserList] = useState(false);

  // حالة البطاقة المفتوحة في الإحصائيات
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // حالة الإشعارات المجدولة
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);

  // حالة الإشعار الجديد
  const [newBroadcast, setNewBroadcast] = useState({ title: '', message: '', icon: '', url: '' });
  const [useCustomIcon, setUseCustomIcon] = useState(false);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const [newScheduled, setNewScheduled] = useState<ScheduledNotification>({
    id: '',
    title: '',
    message: '',
    time: '12:00',
    days: [],
    enabled: true,
    icon: '',
    url: '',
  });

  // حالة الصورة للإشعار المجدول
  const [scheduledUseCustomIcon, setScheduledUseCustomIcon] = useState(false);
  const [scheduledImagePreview, setScheduledImagePreview] = useState<string | null>(null);

  // حالة الأناليتكس - تحميل كسول
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [loadedTabs, setLoadedTabs] = useState<Set<TabId>>(new Set());

  // تشغيل الإشعارات المجدولة (fallback) لما الأدمن يفتح الداشبورد
  const triggerScheduledCron = async () => {
    try {
      await fetch('/api/cron/send-scheduled?secret=cron-secret-2024', { method: 'GET' });
    } catch {
      // silent - مش مهم يظهر خطأ
    }
  };

  // التحقق من تسجيل الدخول
  useEffect(() => {
    setIsClient(true);
    if (!isAuthenticated()) {
      router.push('/');
    } else {
      fetchStats();
      fetchScheduledNotifications();
      triggerScheduledCron(); // تشغيل الـ cron كـ fallback
    }
  }, [router]);

  // جلب الإحصائيات
  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // جلب المستخدمين
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // جلب الإشعارات المجدولة
  const fetchScheduledNotifications = async () => {
    try {
      const response = await fetch('/api/scheduled');
      const data = await response.json();
      if (data.success) {
        setScheduledNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch scheduled notifications:', error);
    }
  };

  // جلب بيانات الأناليتكس (تحميل كسول)
  const fetchAnalytics = useCallback(async () => {
    if (loadedTabs.has(activeTab)) return;
    setIsLoadingAnalytics(true);
    setAnalyticsError(null);
    try {
      const response = await fetch('/api/analytics');
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.analytics);
        setLoadedTabs(prev => new Set(prev).add(activeTab));
      } else {
        setAnalyticsError(data.error || 'فشل في جلب التحليلات');
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setAnalyticsError('حدث خطأ أثناء جلب التحليلات');
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [activeTab, loadedTabs]);

  // تحميل الأناليتكس عند تغيير التبويب
  useEffect(() => {
    if (activeTab !== 'overview' && !loadedTabs.has(activeTab)) {
      fetchAnalytics();
    }
  }, [activeTab, fetchAnalytics, loadedTabs]);

  // تحديث تلقائي للإحصائيات
  useEffect(() => {
    if (isClient && isAuthenticated()) {
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isClient]);

  // معالجة رفع الصورة - رفع على ImgBB للحصول على URL
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2MB');
      return;
    }

    // عرض معاينة محلية
    const localPreview = URL.createObjectURL(file);
    setSelectedImagePreview(localPreview);

    const loadingToastId = toast.loading('جاري رفع الصورة...');

    try {
      // ضغط الصورة أولاً
      const compressedBase64 = await compressImageForUpload(file);

      if (!compressedBase64) {
        toast.error('فشل في معالجة الصورة', { id: loadingToastId });
        setSelectedImagePreview(null);
        return;
      }

      // رفع على ImgBB
      const uploadedUrl = await uploadToImgBB(compressedBase64);

      if (uploadedUrl) {
        setNewBroadcast(prev => ({ ...prev, icon: uploadedUrl }));
        toast.success('تم رفع الصورة بنجاح', { id: loadingToastId });
      } else {
        toast.error('فشل في رفع الصورة', { id: loadingToastId });
        setSelectedImagePreview(null);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('فشل في رفع الصورة', { id: loadingToastId });
      setSelectedImagePreview(null);
    }
  };

  // ضغط الصورة للرفع (حجم أكبر للجودة)
  const compressImageForUpload = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // حجم مناسب للإشعارات 512x512
        const maxSize = 512;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // جودة عالية للرفع
        const base64 = canvas.toDataURL('image/jpeg', 0.8);

        // نرجع الـ base64 بدون الـ prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data || null);
      };

      img.onerror = () => {
        console.error('Failed to load image');
        resolve(null);
      };

      const reader = new FileReader();
      reader.onload = (event) => {
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        console.error('Failed to read file');
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  };

  // رفع الصورة على ImgBB عبر API
  const uploadToImgBB = async (base64Data: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Data }),
      });

      const result = await response.json();

      if (result.success && result.url) {
        return result.url;
      }

      console.error('Upload failed:', result.error);
      return null;
    } catch (error) {
      console.error('ImgBB upload error:', error);
      return null;
    }
  };

  // حذف الصورة
  const handleRemoveImage = () => {
    setNewBroadcast(prev => ({ ...prev, icon: '' }));
    setSelectedImagePreview(null);
  };

  // رفع صورة للإشعار المجدول
  const handleScheduledImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2MB');
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setScheduledImagePreview(localPreview);
    const loadingToastId = toast.loading('جاري رفع الصورة...');

    try {
      const compressedBase64 = await compressImageForUpload(file);
      if (!compressedBase64) {
        toast.error('فشل في معالجة الصورة', { id: loadingToastId });
        setScheduledImagePreview(null);
        return;
      }

      const uploadedUrl = await uploadToImgBB(compressedBase64);
      if (uploadedUrl) {
        setNewScheduled(prev => ({ ...prev, icon: uploadedUrl }));
        toast.success('تم رفع الصورة بنجاح', { id: loadingToastId });
      } else {
        toast.error('فشل في رفع الصورة', { id: loadingToastId });
        setScheduledImagePreview(null);
      }
    } catch (error) {
      console.error('Scheduled image upload error:', error);
      toast.error('فشل في رفع الصورة', { id: loadingToastId });
      setScheduledImagePreview(null);
    }
  };

  // حذف صورة الإشعار المجدول
  const handleRemoveScheduledImage = () => {
    setNewScheduled(prev => ({ ...prev, icon: '' }));
    setScheduledImagePreview(null);
    setScheduledUseCustomIcon(false);
  };

  const handleLogout = () => {
    clearAuthSession();
    toast.success('تم تسجيل الخروج');
    router.push('/');
  };

  // إرسال إشعار لجميع المستخدمين
  const handleSendBroadcast = async () => {
    if (!newBroadcast.title.trim() || !newBroadcast.message.trim()) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBroadcast),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (result.failed > 0) {
          const staleInfo = result.details?.staleCleaned > 0
            ? ` (تم تنظيف ${result.details.staleCleaned} اشتراك منتهي)`
            : '';
          toast.warning(`تم إرسال ${result.sent} من أصل ${result.total} - فشل في ${result.failed} اشتراك${staleInfo}`, {
            duration: 6000,
            description: result.details?.failureReasons?.length > 0
              ? result.details.failureReasons.slice(0, 3).join('\n')
              : undefined,
          });
        } else {
          toast.success(`تم إرسال الإشعار لـ ${result.sent} مستخدم من أصل ${result.total}!`);
        }

        setNewBroadcast({ title: '', message: '', icon: '', url: '' });
        setUseCustomIcon(false);
        setSelectedImagePreview(null);
        fetchStats();
      } else {
        throw new Error(result.error || 'فشل في الإرسال');
      }
    } catch (error) {
      console.error('Send error:', error);
      toast.error('فشل في إرسال الإشعار: ' + String(error));
    } finally {
      setIsSending(false);
    }
  };

  // إرسال إشعار لمستخدمين محددين
  const handleSendToSelected = async () => {
    if (selectedUsers.length === 0) {
      toast.error('يرجى اختيار مستخدم واحد على الأقل');
      return;
    }
    if (!newBroadcast.title.trim() || !newBroadcast.message.trim()) {
      toast.error('يرجى ملء عنوان ونص الإشعار');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUsers,
          title: newBroadcast.title,
          message: newBroadcast.message,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`تم إرسال الإشعار لـ ${result.sent} جهاز!`);
        setSelectedUsers([]);
        setShowUserList(false);
      } else {
        throw new Error(result.error || 'فشل في الإرسال');
      }
    } catch (error) {
      toast.error('فشل في إرسال الإشعار: ' + String(error));
    } finally {
      setIsSending(false);
    }
  };

  // إضافة إشعار مجدول
  const [isAddingScheduled, setIsAddingScheduled] = useState(false);

  const handleAddScheduled = async () => {
    if (!newScheduled.title.trim() || !newScheduled.message.trim() || newScheduled.days.length === 0) {
      toast.error('يرجى ملء جميع الحقول واختيار يوم واحد على الأقل');
      return;
    }

    setIsAddingScheduled(true);
    try {
      const response = await fetch('/api/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newScheduled),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('تم إضافة الإشعار المجدول بنجاح ✅');
        setScheduledNotifications(prev => [...prev, result.notification]);
        setNewScheduled({
          id: '',
          title: '',
          message: '',
          time: '12:00',
          days: [],
          enabled: true,
          icon: '',
          url: '',
        });
        setScheduledUseCustomIcon(false);
        setScheduledImagePreview(null);
      } else {
        toast.error(result.error || 'فشل في إضافة الإشعار');
      }
    } catch (error) {
      console.error('Add scheduled notification error:', error);
      toast.error('حدث خطأ أثناء الإضافة. تأكد أن قاعدة البيانات متصلة.');
    } finally {
      setIsAddingScheduled(false);
    }
  };

  // إرسال إشعار مجدول محفوظ
  const handleSendScheduled = async (notification: ScheduledNotification) => {
    try {
      const response = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notification.title,
          message: notification.message,
          url: notification.url || undefined,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`تم إرسال الإشعار لـ ${result.sent} مستخدم!`);
      } else {
        throw new Error(result.error || 'فشل في الإرسال');
      }
    } catch {
      toast.error('فشل في إرسال الإشعار');
    }
  };

  // حذف إشعار مجدول
  const handleDeleteScheduled = async (id: string) => {
    try {
      const response = await fetch(`/api/scheduled?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setScheduledNotifications(prev => prev.filter(n => n.id !== id));
        toast.success('تم حذف الإشعار');
      }
    } catch {
      toast.error('فشل في حذف الإشعار');
    }
  };

  // تحديث حالة التفعيل
  const toggleNotification = async (id: string) => {
    const notification = scheduledNotifications.find(n => n.id === id);
    if (!notification) return;

    try {
      const response = await fetch('/api/scheduled', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: !notification.enabled }),
      });

      const result = await response.json();

      if (result.success) {
        setScheduledNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n)
        );
      }
    } catch {
      toast.error('فشل في تحديث الإشعار');
    }
  };

  // تبديل يوم
  const toggleDay = (day: number) => {
    setNewScheduled(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day],
    }));
  };

  // تبديل اختيار مستخدم
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // اختيار/إلغاء اختيار الكل
  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  // ========== مكونات التبويبات ==========

  // تبويب نظرة عامة
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* إحصائيات - 3 بطاقات رئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* بطاقة المستخدمين */}
        <Card className="cursor-pointer transition-all hover:shadow-md" onClick={() => setExpandedCard(expandedCard === 'users' ? null : 'users')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#2D8B8B]/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-[#2D8B8B]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
                  <p className="text-2xl font-bold">
                    {isLoadingStats ? '...' : formatNumber(stats?.namedUsers?.total || 0)}
                  </p>
                </div>
              </div>
              <div className="text-muted-foreground">
                {expandedCard === 'users' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>
            {expandedCard === 'users' && stats?.namedUsers && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <p className="text-xs text-muted-foreground mb-2">المستخدمين اللي كتبوا اسمهم وعملوا حساب على الموقع</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">اليوم</p>
                    <p className="text-lg font-bold text-green-600">{stats.namedUsers.today}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">هذا الأسبوع</p>
                    <p className="text-lg font-bold text-blue-600">{stats.namedUsers.thisWeek}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">الأسبوع الماضي</p>
                    <p className="text-lg font-bold text-gray-600">{stats.namedUsers.lastWeek}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* بطاقة المتصفحين */}
        <Card className="cursor-pointer transition-all hover:shadow-md" onClick={() => setExpandedCard(expandedCard === 'visitors' ? null : 'visitors')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Eye className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المتصفحين</p>
                  <p className="text-2xl font-bold">
                    {isLoadingStats ? '...' : formatNumber(stats?.visitors?.total || 0)}
                  </p>
                </div>
              </div>
              <div className="text-muted-foreground">
                {expandedCard === 'visitors' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>
            {expandedCard === 'visitors' && stats?.visitors && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <p className="text-xs text-muted-foreground mb-2">الزوار اللي دخلوا الموقع بس ما عملوش حساب (ما حطوش اسم)</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">اليوم</p>
                    <p className="text-lg font-bold text-green-600">{stats.visitors.today}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">هذا الأسبوع</p>
                    <p className="text-lg font-bold text-blue-600">{stats.visitors.thisWeek}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">الأسبوع الماضي</p>
                    <p className="text-lg font-bold text-gray-600">{stats.visitors.lastWeek}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* بطاقة المشتركين بالإشعارات */}
        <Card className="cursor-pointer transition-all hover:shadow-md" onClick={() => setExpandedCard(expandedCard === 'subscribers' ? null : 'subscribers')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المشتركين بالإشعارات</p>
                  <p className="text-2xl font-bold">
                    {isLoadingStats ? '...' : formatNumber(stats?.subscribers?.total || 0)}
                  </p>
                </div>
              </div>
              <div className="text-muted-foreground">
                {expandedCard === 'subscribers' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>
            {expandedCard === 'subscribers' && stats?.subscribers && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <p className="text-xs text-muted-foreground mb-2">الناس اللي فعلوا الإشعارات في الموقع</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">اليوم</p>
                    <p className="text-lg font-bold text-green-600">{stats.subscribers.today}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">هذا الأسبوع</p>
                    <p className="text-lg font-bold text-blue-600">{stats.subscribers.thisWeek}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">الأسبوع الماضي</p>
                    <p className="text-lg font-bold text-gray-600">{stats.subscribers.lastWeek}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* زر تحديث */}
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          آخر تحديث: {new Date().toLocaleTimeString('ar-EG')}
        </p>
        <Button variant="outline" size="sm" onClick={fetchStats} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
          تحديث الآن
        </Button>
      </div>

      {/* إرسال إشعار */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-[#2D8B8B]" />
            إرسال إشعار
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="عنوان الإشعار"
            value={newBroadcast.title}
            onChange={(e) => setNewBroadcast(prev => ({ ...prev, title: e.target.value }))}
            className="h-12"
          />
          <textarea
            placeholder="نص الإشعار"
            value={newBroadcast.message}
            onChange={(e) => setNewBroadcast(prev => ({ ...prev, message: e.target.value }))}
            className="w-full h-24 p-4 rounded-xl border border-border resize-none focus:outline-none focus:ring-2 focus:ring-[#2D8B8B]"
          />

          {/* رابط التحويل */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              رابط التحويل (اختياري)
            </label>

            {/* اختيار صفحة من الموقع */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">اختر صفحة من الموقع:</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'الصفحة الرئيسية', url: 'https://esma3radio.vercel.app/' },
                  { name: 'مساعد الذكاء الاصطناعي', url: 'https://esma3radio.vercel.app/ai-radio-assistant' },
                  { name: 'حول التطبيق', url: 'https://esma3radio.vercel.app/about' },
                  { name: 'اتصل بنا', url: 'https://esma3radio.vercel.app/contact' },
                  { name: 'سياسة الخصوصية', url: 'https://esma3radio.vercel.app/privacy' },
                  { name: 'شروط الاستخدام', url: 'https://esma3radio.vercel.app/terms' },
                ].map((page) => (
                  <Button
                    key={page.url}
                    type="button"
                    size="sm"
                    variant={newBroadcast.url === page.url ? "default" : "outline"}
                    onClick={() => setNewBroadcast(prev => ({ ...prev, url: page.url }))}
                    className="text-xs"
                  >
                    {page.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* أو كتابة رابط مخصص */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">أو اكتب رابط مخصص (لمحطة معينة أو رابط خارجي):</label>
              <Input
                placeholder="مثال: https://esma3radio.vercel.app/station/abc123 أو https://example.com"
                value={newBroadcast.url}
                onChange={(e) => setNewBroadcast(prev => ({ ...prev, url: e.target.value }))}
                className="h-12"
                dir="ltr"
              />
            </div>

            {newBroadcast.url && (
              <p className="text-xs text-green-600 break-all">
                ✓ سيتم تحويل المستخدم إلى: {newBroadcast.url}
              </p>
            )}
          </div>

          {/* خيار صورة الإشعار */}
          <div className="border rounded-xl p-4 bg-muted/30">
            <div className="flex items-center gap-3 mb-3">
              <ImageIcon className="h-5 w-5 text-[#2D8B8B]" />
              <span className="font-medium">صورة الإشعار</span>
            </div>

            <div className="flex gap-2 mb-3">
              <Button
                type="button"
                size="sm"
                variant={!useCustomIcon ? "default" : "outline"}
                onClick={() => {
                  setUseCustomIcon(false);
                  handleRemoveImage();
                }}
              >
                <Radio className="h-4 w-4 me-1" />
                اللوجو الافتراضي
              </Button>
              <Button
                type="button"
                size="sm"
                variant={useCustomIcon ? "default" : "outline"}
                onClick={() => setUseCustomIcon(true)}
              >
                <ImageIcon className="h-4 w-4 me-1" />
                صورة مخصصة
              </Button>
            </div>

            {useCustomIcon && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex items-center gap-2 px-4 py-2 bg-[#2D8B8B] text-white rounded-lg cursor-pointer hover:bg-[#237575] transition-colors"
                  >
                    <ImageIcon className="h-4 w-4" />
                    اختر صورة من الجهاز
                  </label>
                  {selectedImagePreview && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleRemoveImage}
                      className="text-red-500 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 me-1" />
                      حذف
                    </Button>
                  )}
                </div>

                {selectedImagePreview ? (
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedImagePreview}
                      alt="معاينة"
                      className="w-20 h-20 rounded-lg object-cover border"
                    />
                    <div>
                      <p className="text-sm font-medium text-green-600">✓ تم اختيار الصورة</p>
                      <p className="text-xs text-muted-foreground">ستظهر مع الإشعار</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-6 border-2 border-dashed border-muted rounded-lg">
                    <div className="text-center">
                      <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">اضغط لرفع صورة</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG (أقصى 2MB)</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!useCustomIcon && (
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg bg-[#2D8B8B] flex items-center justify-center">
                  <Radio className="h-8 w-8 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium">لوجو اسمع راديو</p>
                  <p className="text-xs text-muted-foreground">سيتم استخدام اللوجو الافتراضي</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSendBroadcast} disabled={isSending} className="gap-2">
              {isSending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  إرسال للجميع
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowUserList(!showUserList);
                if (!showUserList) fetchUsers();
              }}
              className="gap-2"
            >
              <User className="h-4 w-4" />
              إرسال لمستخدم محدد
            </Button>
          </div>

          {/* قائمة المستخدمين */}
          {showUserList && (
            <div className="border rounded-xl p-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">اختر المستخدمين ({selectedUsers.length} محدد)</h3>
                <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                  {selectedUsers.length === users.length ? 'إلغاء الكل' : 'اختيار الكل'}
                </Button>
              </div>

              {isLoadingUsers ? (
                <div className="text-center py-4">جاري التحميل...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">لا يوجد مستخدمين</div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => toggleUserSelection(user.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedUsers.includes(user.id)
                          ? 'bg-[#2D8B8B]/10 border border-[#2D8B8B]'
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedUsers.includes(user.id) && 'bg-[#2D8B8B] border-[#2D8B8B]'
                      }`}>
                        {selectedUsers.includes(user.id) && (
                          <CheckCircle className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.name}</p>
                          {user.isNew && (
                            <Badge className="text-xs bg-green-500">جديد</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {user.lastActive
                            ? `آخر نشاط: ${new Date(user.lastActive).toLocaleDateString('ar-EG')}`
                            : 'لا يوجد نشاط'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.platforms && user.platforms.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {user.platforms.join(', ')}
                          </span>
                        )}
                        <Badge variant="secondary">{user.subscriptionsCount} جهاز</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedUsers.length > 0 && (
                <Button
                  onClick={handleSendToSelected}
                  className="w-full mt-4 gap-2"
                  disabled={isSending}
                >
                  <Send className="h-4 w-4" />
                  إرسال لـ {selectedUsers.length} مستخدم
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* الإشعارات المجدولة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-[#2D8B8B]" />
            الإشعارات المجدولة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* قائمة الإشعارات */}
          <div className="space-y-3 mb-6">
            {scheduledNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>لا توجد إشعارات مجدولة</p>
              </div>
            ) : (
              scheduledNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-xl p-4 transition-all ${
                    notification.enabled
                      ? 'border-[#2D8B8B]/30 bg-[#2D8B8B]/5'
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{notification.title}</h3>
                        {notification.enabled ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{notification.time}</span>
                        <span>•</span>
                        <span>
                          {notification.days.length === 7
                            ? 'كل يوم'
                            : notification.days.map(d => DAYS_AR[d]).join('، ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleSendScheduled(notification)}
                        className="text-[#2D8B8B] hover:bg-[#2D8B8B]/10"
                        title="إرسال الآن"
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleNotification(notification.id)}
                        className={notification.enabled ? 'text-green-500' : 'text-muted-foreground'}
                        title={notification.enabled ? 'مفعّل' : 'معطّل'}
                      >
                        {notification.enabled ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteScheduled(notification.id)}
                        className="text-red-500"
                        title="حذف"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* إضافة إشعار جديد */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              إضافة إشعار مجدول جديد
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="عنوان الإشعار"
                  value={newScheduled.title}
                  onChange={(e) => setNewScheduled(prev => ({ ...prev, title: e.target.value }))}
                  className="h-10"
                />
                <Input
                  placeholder="نص الإشعار"
                  value={newScheduled.message}
                  onChange={(e) => setNewScheduled(prev => ({ ...prev, message: e.target.value }))}
                  className="h-10"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="time"
                  value={newScheduled.time}
                  onChange={(e) => setNewScheduled(prev => ({ ...prev, time: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-border"
                />
                <div className="flex gap-1 flex-wrap">
                  {DAYS_AR.map((day, index) => (
                    <button
                      key={index}
                      onClick={() => toggleDay(index)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        newScheduled.days.includes(index)
                          ? 'bg-[#2D8B8B] text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* رابط التحويل للإشعار المجدول */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                  رابط التحويل (اختياري)
                </label>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">اختر صفحة من الموقع:</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'الصفحة الرئيسية', url: 'https://esma3radio.vercel.app/' },
                      { name: 'مساعد الذكاء الاصطناعي', url: 'https://esma3radio.vercel.app/ai-radio-assistant' },
                      { name: 'حول التطبيق', url: 'https://esma3radio.vercel.app/about' },
                      { name: 'اتصل بنا', url: 'https://esma3radio.vercel.app/contact' },
                      { name: 'سياسة الخصوصية', url: 'https://esma3radio.vercel.app/privacy' },
                      { name: 'شروط الاستخدام', url: 'https://esma3radio.vercel.app/terms' },
                    ].map((page) => (
                      <Button
                        key={page.url}
                        type="button"
                        size="sm"
                        variant={newScheduled.url === page.url ? "default" : "outline"}
                        onClick={() => setNewScheduled(prev => ({ ...prev, url: page.url }))}
                        className="text-xs"
                      >
                        {page.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">أو اكتب رابط مخصص:</label>
                  <Input
                    placeholder="مثال: https://esma3radio.vercel.app/station/abc123"
                    value={newScheduled.url}
                    onChange={(e) => setNewScheduled(prev => ({ ...prev, url: e.target.value }))}
                    className="h-10"
                    dir="ltr"
                  />
                </div>

                {newScheduled.url && (
                  <p className="text-xs text-green-600 break-all">
                    ✓ سيتم تحويل المستخدم إلى: {newScheduled.url}
                  </p>
                )}
              </div>

              {/* صورة الإشعار المجدول */}
              <div className="border rounded-xl p-4 bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <ImageIcon className="h-5 w-5 text-[#2D8B8B]" />
                  <span className="font-medium">صورة الإشعار (اختياري)</span>
                </div>

                <div className="flex gap-2 mb-3">
                  <Button
                    type="button"
                    size="sm"
                    variant={!scheduledUseCustomIcon ? "default" : "outline"}
                    onClick={() => {
                      setScheduledUseCustomIcon(false);
                      handleRemoveScheduledImage();
                    }}
                  >
                    <Radio className="h-4 w-4 me-1" />
                    اللوجو الافتراضي
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={scheduledUseCustomIcon ? "default" : "outline"}
                    onClick={() => setScheduledUseCustomIcon(true)}
                  >
                    <ImageIcon className="h-4 w-4 me-1" />
                    صورة مخصصة
                  </Button>
                </div>

                {scheduledUseCustomIcon && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScheduledImageUpload}
                        className="hidden"
                        id="scheduled-image-upload"
                      />
                      <label
                        htmlFor="scheduled-image-upload"
                        className="flex items-center gap-2 px-4 py-2 bg-[#2D8B8B] text-white rounded-lg cursor-pointer hover:bg-[#237575] transition-colors"
                      >
                        <ImageIcon className="h-4 w-4" />
                        اختر صورة من الجهاز
                      </label>
                      {scheduledImagePreview && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleRemoveScheduledImage}
                          className="text-red-500 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 me-1" />
                          حذف
                        </Button>
                      )}
                    </div>

                    {scheduledImagePreview ? (
                      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={scheduledImagePreview}
                          alt="معاينة"
                          className="w-20 h-20 rounded-lg object-cover border"
                        />
                        <div>
                          <p className="text-sm font-medium text-green-600">✓ تم اختيار الصورة</p>
                          <p className="text-xs text-muted-foreground">ستظهر مع الإشعار المجدول</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-4 border-2 border-dashed border-muted rounded-lg">
                        <div className="text-center">
                          <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                          <p className="text-sm text-muted-foreground">PNG, JPG (أقصى 2MB)</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!scheduledUseCustomIcon && (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-[#2D8B8B] flex items-center justify-center">
                      <Radio className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">لوجو اسمع راديو</p>
                      <p className="text-xs text-muted-foreground">اللوجو الافتراضي</p>
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={handleAddScheduled} disabled={isAddingScheduled} className="gap-2">
                {isAddingScheduled ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    جاري الإضافة...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    إضافة إشعار
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // تبويب تحليلات الإشعارات
  const renderNotificationAnalyticsTab = () => {
    if (isLoadingAnalytics) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonCard />
          <SkeletonTable rows={8} />
        </div>
      );
    }

    if (!analytics) {
      return (
        <AnalyticsErrorCard
          message={analyticsError || 'جاري التحميل...'}
          onRetry={() => {
            setLoadedTabs(prev => {
              const next = new Set(prev);
              next.delete('notifications');
              return next;
            });
            fetchAnalytics();
          }}
        />
      );
    }

    const n = analytics.notifications;

    return (
      <div className="space-y-6">
        {/* قمع الأداء */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Target className="h-5 w-5 text-[#2D8B8B]" />
            قمع الأداء
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-[#2D8B8B]/10 flex items-center justify-center mx-auto mb-2">
                  <Mail className="h-5 w-5 text-[#2D8B8B]" />
                </div>
                <p className="text-2xl font-bold text-[#2D8B8B]">{formatNumber(n.totalSent)}</p>
                <p className="text-xs text-muted-foreground mt-1">إجمالي المرسل</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                  <MailOpen className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-600">{n.openRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">معدل الفتح</p>
                <p className="text-xs text-muted-foreground">{formatNumber(n.totalOpened)} مفتوح</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                  <MousePointerClick className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-blue-600">{n.clickRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">معدل النقر</p>
                <p className="text-xs text-muted-foreground">{formatNumber(n.totalClicked)} نقر</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mx-auto mb-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                </div>
                <p className="text-2xl font-bold text-orange-600">{n.conversionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">معدل التحويل</p>
                <p className="text-xs text-muted-foreground">{formatNumber(n.totalConverted)} محوّل</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* إحصائيات اليوم والأسبوع */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-green-500" />
                <p className="text-xs text-muted-foreground">مرسل اليوم</p>
              </div>
              <p className="text-xl font-bold">{formatNumber(n.sentToday)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <MailOpen className="h-4 w-4 text-blue-500" />
                <p className="text-xs text-muted-foreground">مفتوح اليوم</p>
              </div>
              <p className="text-xl font-bold">{formatNumber(n.openedToday)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays className="h-4 w-4 text-purple-500" />
                <p className="text-xs text-muted-foreground">مرسل آخر 7 أيام</p>
              </div>
              <p className="text-xl font-bold">{formatNumber(n.sentLast7Days)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="h-4 w-4 text-teal-500" />
                <p className="text-xs text-muted-foreground">مفتوح آخر 7 أيام</p>
              </div>
              <p className="text-xl font-bold">{formatNumber(n.openedLast7Days)}</p>
            </CardContent>
          </Card>
        </div>

        {/* المقاييس اليومية */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-[#2D8B8B]" />
              المقاييس اليومية (آخر 30 يوم)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {n.dailyMetrics && n.dailyMetrics.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">التاريخ</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">النوع</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">المرسل</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">المفتوح</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">المنقور</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">معدل الفتح</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">معدل النقر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {n.dailyMetrics.slice(0, 30).map((metric, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 px-3">{metric.date}</td>
                        <td className="py-2 px-3">
                          <Badge variant="secondary" className="text-xs">{metric.type || 'إشعار'}</Badge>
                        </td>
                        <td className="py-2 px-3 font-medium">{formatNumber(metric.sent)}</td>
                        <td className="py-2 px-3 font-medium text-green-600">{formatNumber(metric.opened)}</td>
                        <td className="py-2 px-3 font-medium text-blue-600">{formatNumber(metric.clicked)}</td>
                        <td className="py-2 px-3">
                          <span className={`font-medium ${parseFloat(metric.openRate) > 50 ? 'text-green-600' : 'text-orange-500'}`}>
                            {metric.openRate}%
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`font-medium ${parseFloat(metric.clickRate) > 20 ? 'text-green-600' : 'text-orange-500'}`}>
                            {metric.clickRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا تتوفر بيانات يومية</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* أحدث الإشعارات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-[#2D8B8B]" />
              أحدث الإشعارات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {n.topNotifications && n.topNotifications.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {n.topNotifications.map((notif, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{notif.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{notif.type}</Badge>
                        <span>{notif.sentAt ? new Date(notif.sentAt).toLocaleDateString('ar-EG') : ''}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`flex items-center gap-0.5 text-xs px-2 py-1 rounded-full ${
                        notif.opened ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {notif.opened ? '✓ مفتوح' : '✗ لم يفتح'}
                      </span>
                      <span className={`flex items-center gap-0.5 text-xs px-2 py-1 rounded-full ${
                        notif.clicked ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {notif.clicked ? '✓ منقور' : '✗ لم ينقر'}
                      </span>
                      <span className={`flex items-center gap-0.5 text-xs px-2 py-1 rounded-full ${
                        notif.converted ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {notif.converted ? '✓ محوّل' : '✗ لم يحوّل'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا تتوفر إشعارات</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* غير مقروء حسب المستخدم */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              المستخدمين بأكثر الإشعارات غير المقروءة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {n.unreadByUser && n.unreadByUser.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">المستخدم</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">عدد غير المقروء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {n.unreadByUser.map((u, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium">{u.userName}</td>
                        <td className="py-2 px-3">
                          <Badge className={`text-xs ${
                            u.unreadCount > 5 ? 'bg-red-500' : u.unreadCount > 2 ? 'bg-orange-500' : 'bg-yellow-500'
                          }`}>
                            {u.unreadCount}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا توجد بيانات</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* إحصائيات المجدول */}
        {n.scheduled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-[#2D8B8B]" />
                إحصائيات الإشعارات المجدولة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-yellow-600">{n.scheduled.stats?.pending || 0}</p>
                  <p className="text-xs text-muted-foreground">قيد الانتظار</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-green-600">{n.scheduled.stats?.sent || 0}</p>
                  <p className="text-xs text-muted-foreground">تم الإرسال</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-red-600">{n.scheduled.stats?.failed || 0}</p>
                  <p className="text-xs text-muted-foreground">فشل</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-gray-600">{n.scheduled.stats?.cancelled || 0}</p>
                  <p className="text-xs text-muted-foreground">ملغي</p>
                </div>
              </div>

              {n.scheduled.list && n.scheduled.list.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <p className="text-sm font-medium text-muted-foreground">قائمة الإشعارات المجدولة:</p>
                  {n.scheduled.list.map((s: ScheduledNotification, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium text-sm">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.time} - {s.days.length === 7 ? 'كل يوم' : s.days.map(d => DAYS_AR[d]).join('، ')}</p>
                      </div>
                      <Badge variant={s.enabled ? 'default' : 'secondary'}>
                        {s.enabled ? 'مفعّل' : 'معطّل'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // تبويب تحليلات الاستماع
  const renderListeningAnalyticsTab = () => {
    if (isLoadingAnalytics) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonTable rows={8} />
        </div>
      );
    }

    if (!analytics) {
      return (
        <AnalyticsErrorCard
          message={analyticsError || 'جاري التحميل...'}
          onRetry={() => {
            setLoadedTabs(prev => {
              const next = new Set(prev);
              next.delete('listening');
              return next;
            });
            fetchAnalytics();
          }}
        />
      );
    }

    const l = analytics.listening;
    const maxCategoryCount = l.topCategories && l.topCategories.length > 0
      ? Math.max(...l.topCategories.map(([, c]) => c))
      : 1;
    const maxStationCount = l.topStations && l.topStations.length > 0
      ? Math.max(...l.topStations.map(s => s.count))
      : 1;
    const maxPeakHour = l.peakHours && l.peakHours.length > 0
      ? Math.max(...l.peakHours.map(h => h.count))
      : 1;

    return (
      <div className="space-y-6">
        {/* بطاقات الملخص */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-[#2D8B8B]/10 flex items-center justify-center mx-auto mb-2">
                <Timer className="h-5 w-5 text-[#2D8B8B]" />
              </div>
              <p className="text-2xl font-bold text-[#2D8B8B]">{l.totalListeningHours}</p>
              <p className="text-xs text-muted-foreground mt-1">ساعة استماع إجمالية</p>
              <p className="text-xs text-muted-foreground">({formatNumber(l.totalListeningMinutes)} دقيقة)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                <Headphones className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">{formatNumber(l.totalSessions)}</p>
              <p className="text-xs text-muted-foreground mt-1">إجمالي الجلسات</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{l.avgSessionMinutes}</p>
              <p className="text-xs text-muted-foreground mt-1">متوسط مدة الجلسة (دقيقة)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-purple-600">{formatNumber(l.usersWithListeningData)}</p>
              <p className="text-xs text-muted-foreground mt-1">مستخدم لديهم بيانات</p>
            </CardContent>
          </Card>
        </div>

        {/* أعلى التصنيفات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-[#2D8B8B]" />
              أعلى التصنيفات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {l.topCategories && l.topCategories.length > 0 ? (
              <div className="space-y-3">
                {l.topCategories.map(([name, count], i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{name}</span>
                      <span className="text-muted-foreground">{formatNumber(count)}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-l from-[#2D8B8B] to-[#237575] rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>

        {/* أعلى المحطات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Radio className="h-5 w-5 text-[#2D8B8B]" />
              أعلى المحطات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {l.topStations && l.topStations.length > 0 ? (
              <div className="space-y-3">
                {l.topStations.map((station, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{station.name}</span>
                      <span className="text-muted-foreground">{formatNumber(station.count)}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-l from-green-500 to-green-600 rounded-full transition-all duration-500"
                        style={{ width: `${(station.count / maxStationCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>

        {/* ساعات الذروة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-[#2D8B8B]" />
              ساعات الذروة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {l.peakHours && l.peakHours.length > 0 ? (
              <div className="space-y-2">
                {/* تحديد ساعات الذروة (أعلى 25%) */}
                {(() => {
                  const sortedHours = [...l.peakHours].sort((a, b) => b.count - a.count);
                  const peakThreshold = sortedHours[Math.floor(sortedHours.length * 0.25)]?.count || 0;
                  return (
                    <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                      {l.peakHours.sort((a, b) => a.hour - b.hour).map((h) => (
                        <div
                          key={h.hour}
                          className={`text-center p-2 rounded-lg transition-colors ${
                            h.count >= peakThreshold
                              ? 'bg-[#2D8B8B] text-white'
                              : 'bg-muted/50 text-muted-foreground'
                          }`}
                        >
                          <p className="text-xs font-bold">{h.hour}:00</p>
                          <p className="text-lg font-bold">{formatNumber(h.count)}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <p className="text-xs text-muted-foreground text-center mt-2">
                  الأعلى تمييزاً = ساعات الذروة
                </p>
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>

        {/* أيام الذروة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-[#2D8B8B]" />
              أيام الذروة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {l.peakDays && l.peakDays.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {l.peakDays.slice(0, 7).map((day, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl text-center ${
                      i < 3 ? 'bg-[#2D8B8B]/10 border border-[#2D8B8B]/30' : 'bg-muted/50'
                    }`}
                  >
                    <p className="font-semibold">{day.day}</p>
                    <p className={`text-2xl font-bold ${i < 3 ? 'text-[#2D8B8B]' : 'text-muted-foreground'}`}>
                      {formatNumber(day.count)}
                    </p>
                    <p className="text-xs text-muted-foreground">جلسة</p>
                    {i < 3 && (
                      <Badge className="mt-1 text-xs bg-[#2D8B8B]">
                        <TrendingUp className="h-3 w-3 me-1" />
                        ذروة
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>

        {/* آخر الجلسات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-[#2D8B8B]" />
              آخر جلسات الاستماع
            </CardTitle>
          </CardHeader>
          <CardContent>
            {l.recentSessions && l.recentSessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">المستخدم</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">المحطة</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">المدة</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">المزاج</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">مفضلة</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">تم تخطي</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">الوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {l.recentSessions.slice(0, 20).map((session, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 px-2 font-medium">{session.user}</td>
                        <td className="py-2 px-2">{session.station}</td>
                        <td className="py-2 px-2">{session.duration} د</td>
                        <td className="py-2 px-2">
                          {session.mood ? (
                            <Badge variant="secondary" className="text-xs">{session.mood}</Badge>
                          ) : '-'}
                        </td>
                        <td className="py-2 px-2">
                          {session.liked ? (
                            <span className="text-green-500">✓</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          {session.skipped ? (
                            <span className="text-orange-500">✓</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-xs text-muted-foreground">
                          {session.startedAt ? new Date(session.startedAt).toLocaleDateString('ar-EG') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا توجد جلسات</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // تبويب المستخدمين
  const renderUsersTab = () => {
    if (isLoadingAnalytics) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonTable rows={8} />
        </div>
      );
    }

    if (!analytics) {
      return (
        <AnalyticsErrorCard
          message={analyticsError || 'جاري التحميل...'}
          onRetry={() => {
            setLoadedTabs(prev => {
              const next = new Set(prev);
              next.delete('users');
              return next;
            });
            fetchAnalytics();
          }}
        />
      );
    }

    const u = analytics.users;

    return (
      <div className="space-y-6">
        {/* ملخص */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-[#2D8B8B]/10 flex items-center justify-center mx-auto mb-2">
                <Users className="h-5 w-5 text-[#2D8B8B]" />
              </div>
              <p className="text-2xl font-bold text-[#2D8B8B]">{formatNumber(u.total)}</p>
              <p className="text-xs text-muted-foreground mt-1">إجمالي المستخدمين</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                <Activity className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">{formatNumber(u.withActivity)}</p>
              <p className="text-xs text-muted-foreground mt-1">لديهم نشاط</p>
            </CardContent>
          </Card>
        </div>

        {/* أعلى المستخدمين نشاطاً */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-[#2D8B8B]" />
              أعلى المستخدمين نشاطاً
            </CardTitle>
          </CardHeader>
          <CardContent>
            {u.topActive && u.topActive.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">الاسم</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">الجلسات</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">ساعات الاستماع</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">متوسط الدقائق</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">عضو منذ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {u.topActive.map((user, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#2D8B8B]/10 flex items-center justify-center text-xs font-bold text-[#2D8B8B]">
                              {i + 1}
                            </div>
                            {user.name}
                          </div>
                        </td>
                        <td className="py-2 px-3">{formatNumber(user.sessions)}</td>
                        <td className="py-2 px-3 font-medium text-[#2D8B8B]">{user.listeningHours} ساعة</td>
                        <td className="py-2 px-3">{user.avgMinutes} د</td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {user.memberSince ? new Date(user.memberSince).toLocaleDateString('ar-EG') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا توجد بيانات</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* أعلى المفضلات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-orange-500" />
              أعلى المستخدمين مفضلات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {u.topFavorites && u.topFavorites.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">الاسم</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">المفضلات</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">السجل</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">محادثات AI</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">عضو منذ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {u.topFavorites.map((user, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center text-xs font-bold text-orange-500">
                              {i + 1}
                            </div>
                            {user.name}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-orange-500 font-medium">{formatNumber(user.favorites)}</span>
                        </td>
                        <td className="py-2 px-3">{formatNumber(user.history)}</td>
                        <td className="py-2 px-3">{formatNumber(user.aiChats)}</td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {user.memberSince ? new Date(user.memberSince).toLocaleDateString('ar-EG') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا توجد بيانات</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* اتجاهات البحث */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5 text-[#2D8B8B]" />
              اتجاهات البحث
            </CardTitle>
          </CardHeader>
          <CardContent>
            {u.topSearches && u.topSearches.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {u.topSearches.slice(0, 15).map((search, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="text-sm py-1.5 px-3 flex items-center gap-1.5"
                    style={{
                      fontSize: `${Math.max(0.75, 1.2 - i * 0.03)}rem`,
                      backgroundColor: `rgba(45, 139, 139, ${Math.max(0.1, 0.3 - i * 0.015)})`,
                      color: i < 3 ? '#2D8B8B' : undefined,
                      borderColor: i < 3 ? '#2D8B8B' : undefined,
                      borderWidth: i < 3 ? 1 : 0,
                    }}
                  >
                    <Search className="h-3 w-3" />
                    {search.query}
                    <span className="text-muted-foreground">({search.count})</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا توجد بيانات بحث</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* استخدام الذكاء الاصطناعي */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5 text-purple-500" />
              استخدام مساعد الذكاء الاصطناعي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{formatNumber(u.aiUsage.totalChats)}</p>
                <p className="text-xs text-muted-foreground">إجمالي المحادثات</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{formatNumber(u.aiUsage.uniqueUsers)}</p>
                <p className="text-xs text-muted-foreground">مستخدمين فريدون</p>
              </div>
            </div>

            {u.aiUsage.recentChats && u.aiUsage.recentChats.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <p className="text-sm font-medium text-muted-foreground">آخر المحادثات:</p>
                {u.aiUsage.recentChats.map((chat, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{chat.user}</span>
                      <span className="text-xs text-muted-foreground">
                        {chat.createdAt ? new Date(chat.createdAt).toLocaleDateString('ar-EG') : ''}
                      </span>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground mb-0.5">السؤال:</p>
                      <p className="text-sm">{chat.message}</p>
                    </div>
                    <div className="bg-[#2D8B8B]/5 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground mb-0.5">الرد:</p>
                      <p className="text-sm">{chat.response}</p>
                    </div>
                    {chat.action && (
                      <p className="text-xs text-muted-foreground">
                        الإجراء: <Badge variant="secondary" className="text-xs">{chat.action}</Badge>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // تبويب الأجهزة
  const renderDevicesTab = () => {
    if (isLoadingAnalytics) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonTable rows={8} />
        </div>
      );
    }

    if (!analytics) {
      return (
        <AnalyticsErrorCard
          message={analyticsError || 'جاري التحميل...'}
          onRetry={() => {
            setLoadedTabs(prev => {
              const next = new Set(prev);
              next.delete('devices');
              return next;
            });
            fetchAnalytics();
          }}
        />
      );
    }

    const d = analytics.devices;

    const platformIcons: Record<string, React.ReactNode> = {
      web: <Globe className="h-5 w-5" />,
      android: <Smartphone className="h-5 w-5" />,
      ios: <Smartphone className="h-5 w-5" />,
    };

    const platformColors: Record<string, string> = {
      web: 'bg-[#2D8B8B]/10 text-[#2D8B8B] border-[#2D8B8B]/20',
      android: 'bg-green-500/10 text-green-600 border-green-500/20',
      ios: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    };

    const browserColors: Record<string, string> = {
      Chrome: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
      Firefox: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
      Safari: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
      Edge: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
      Opera: 'bg-red-500/10 text-red-700 border-red-500/20',
    };

    return (
      <div className="space-y-6">
        {/* ملخص */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-[#2D8B8B]/10 flex items-center justify-center mx-auto mb-2">
                <Monitor className="h-5 w-5 text-[#2D8B8B]" />
              </div>
              <p className="text-2xl font-bold text-[#2D8B8B]">{formatNumber(d.total)}</p>
              <p className="text-xs text-muted-foreground mt-1">إجمالي الأجهزة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">{formatNumber(d.activeSubscriptions)}</p>
              <p className="text-xs text-muted-foreground mt-1">اشتراكات نشطة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-red-600">{formatNumber(d.inactiveSubscriptions)}</p>
              <p className="text-xs text-muted-foreground mt-1">اشتراكات غير نشطة</p>
            </CardContent>
          </Card>
        </div>

        {/* توزيع المنصات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChart className="h-5 w-5 text-[#2D8B8B]" />
              توزيع المنصات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.platforms && Object.keys(d.platforms).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(d.platforms).map(([platform, count]) => (
                  <div
                    key={platform}
                    className={`border rounded-xl p-4 flex items-center gap-3 ${platformColors[platform] || 'bg-muted/50'}`}
                  >
                    <div className="text-2xl">
                      {platformIcons[platform] || <Monitor className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{formatNumber(count)}</p>
                      <p className="text-xs text-muted-foreground">
                        {platform === 'web' ? 'الويب' : platform === 'android' ? 'أندرويد' : platform === 'ios' ? 'iOS' : platform}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ({d.total > 0 ? ((count / d.total) * 100).toFixed(1) : 0}%)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>

        {/* توزيع المتصفحات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-[#2D8B8B]" />
              توزيع المتصفحات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.browsers && Object.keys(d.browsers).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(d.browsers).map(([browser, count]) => (
                  <div
                    key={browser}
                    className={`border rounded-xl p-3 text-center ${browserColors[browser] || 'bg-muted/50'}`}
                  >
                    <p className="font-bold text-xl">{formatNumber(count)}</p>
                    <p className="text-sm font-medium">{browser}</p>
                    <p className="text-xs text-muted-foreground">
                      ({d.total > 0 ? ((count / d.total) * 100).toFixed(1) : 0}%)
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>

        {/* توزيع أنظمة التشغيل */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Monitor className="h-5 w-5 text-[#2D8B8B]" />
              توزيع أنظمة التشغيل
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.operatingSystems && Object.keys(d.operatingSystems).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(d.operatingSystems).map(([os, count]) => (
                  <div
                    key={os}
                    className="border rounded-xl p-3 text-center bg-muted/50"
                  >
                    <p className="font-bold text-xl">{formatNumber(count)}</p>
                    <p className="text-sm font-medium">{os}</p>
                    <p className="text-xs text-muted-foreground">
                      ({d.total > 0 ? ((count / d.total) * 100).toFixed(1) : 0}%)
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>

        {/* قائمة الأجهزة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5 text-[#2D8B8B]" />
              قائمة الأجهزة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.list && d.list.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">معرّف الجهاز</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">المستخدم</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">المنصة</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">اسم العرض</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">آخر ظهور</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">أول ظهور</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.list.slice(0, 50).map((device, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 px-3 font-mono text-xs" dir="ltr">
                          {device.deviceId ? device.deviceId.substring(0, 16) + '...' : '-'}
                        </td>
                        <td className="py-2 px-3 font-medium">{device.user || '-'}</td>
                        <td className="py-2 px-3">
                          <Badge variant="secondary" className="text-xs">{device.platform || '-'}</Badge>
                        </td>
                        <td className="py-2 px-3">{device.displayName || '-'}</td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {device.lastSeen ? new Date(device.lastSeen).toLocaleDateString('ar-EG') : '-'}
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {device.firstSeen ? new Date(device.firstSeen).toLocaleDateString('ar-EG') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا توجد أجهزة</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#2D8B8B] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2D8B8B]/5 to-[#237575]/5" lang="ar" dir="rtl">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-l from-[#2D8B8B] to-[#237575] shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Radio className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">لوحة تحكم الإشعارات</h1>
              <p className="text-sm text-white/70">تطبيق اسمع راديو</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* مؤشرات سريعة */}
            {stats && (
              <div className="hidden md:flex items-center gap-3 text-white/80 text-xs">
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3 text-green-300" />
                  {stats.onlineUsers} متصل
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3 text-yellow-300" />
                  {stats.activeLastHour} نشط
                </span>
                <span className="flex items-center gap-1">
                  <Send className="h-3 w-3 text-blue-300" />
                  {stats.notificationsSentToday} إشعار اليوم
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-white hover:bg-white/20 gap-2"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline">خروج</span>
            </Button>
          </div>
        </div>
      </header>

      {/* شريط التبويبات */}
      <nav className="sticky top-[72px] z-40 bg-white/80 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#2D8B8B] text-white shadow-md'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* محتوى التبويب */}
      <main className="container mx-auto px-4 py-6">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'notifications' && renderNotificationAnalyticsTab()}
        {activeTab === 'listening' && renderListeningAnalyticsTab()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'devices' && renderDevicesTab()}
      </main>
    </div>
  );
}
