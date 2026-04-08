'use client';

import { useState, useEffect } from 'react';
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
}

interface UserData {
  id: string;
  name: string;
  subscriptionsCount: number;
  lastActive?: string;
  platforms?: string[];
  isNew?: boolean;
}

interface Stats {
  totalUsers: number;
  totalSubscribers: number;
  onlineUsers: number;
  activeLastHour: number;
  activeLastDay: number;
  notificationsSentToday: number;
}

// أيام الأسبوع
const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function DashboardPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // حالة الإحصائيات
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // حالة المستخدمين
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showUserList, setShowUserList] = useState(false);

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
  });

  // التحقق من تسجيل الدخول
  useEffect(() => {
    setIsClient(true);
    if (!isAuthenticated()) {
      router.push('/');
    } else {
      fetchStats();
      fetchScheduledNotifications();
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
    
    toast.loading('جاري رفع الصورة...');

    try {
      // ضغط الصورة أولاً
      const compressedBase64 = await compressImageForUpload(file);
      
      if (!compressedBase64) {
        toast.error('فشل في معالجة الصورة');
        setSelectedImagePreview(null);
        return;
      }

      // رفع على ImgBB
      const uploadedUrl = await uploadToImgBB(compressedBase64);
      
      if (uploadedUrl) {
        setNewBroadcast(prev => ({ ...prev, icon: uploadedUrl }));
        toast.success('تم رفع الصورة بنجاح');
      } else {
        toast.error('فشل في رفع الصورة');
        setSelectedImagePreview(null);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('فشل في رفع الصورة');
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
          toast.warning(`تم إرسال ${result.sent} من أصل ${result.total} - فشل في ${result.failed} اشتراك`);
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
  const handleAddScheduled = async () => {
    if (!newScheduled.title.trim() || !newScheduled.message.trim() || newScheduled.days.length === 0) {
      toast.error('يرجى ملء جميع الحقول واختيار يوم واحد على الأقل');
      return;
    }

    try {
      const response = await fetch('/api/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newScheduled),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('تم إضافة الإشعار المجدول');
        setScheduledNotifications(prev => [...prev, result.notification]);
        setNewScheduled({
          id: '',
          title: '',
          message: '',
          time: '12:00',
          days: [],
          enabled: true,
        });
      } else {
        throw new Error(result.error || 'فشل في الإضافة');
      }
    } catch (error) {
      toast.error('فشل في إضافة الإشعار: ' + String(error));
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
    <div className="min-h-screen bg-gradient-to-br from-[#2D8B8B]/5 to-[#237575]/5">
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
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-white hover:bg-white/20 gap-2"
          >
            <LogOut className="h-5 w-5" />
            خروج
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* إحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2D8B8B]/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-[#2D8B8B]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي المشتركين</p>
                  <p className="text-xl font-bold">
                    {isLoadingStats ? '...' : stats?.totalSubscribers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">متصلين الآن</p>
                  <p className="text-xl font-bold text-green-600">
                    {isLoadingStats ? '...' : stats?.onlineUsers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">نشطين آخر ساعة</p>
                  <p className="text-xl font-bold">
                    {isLoadingStats ? '...' : stats?.activeLastHour || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Send className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">مرسلة اليوم</p>
                  <p className="text-xl font-bold">
                    {isLoadingStats ? '...' : stats?.notificationsSentToday || 0}
                  </p>
                </div>
              </div>
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                رابط التحويل (اختياري)
              </label>
              <Input
                placeholder="مثال: /station/abc123 أو https://esma3radio.vercel.app/quran"
                value={newBroadcast.url}
                onChange={(e) => setNewBroadcast(prev => ({ ...prev, url: e.target.value }))}
                className="h-12"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                عند الضغط على الإشعار سيتم تحويل المستخدم لهذا الرابط
              </p>
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
                <Button onClick={handleAddScheduled} className="gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة إشعار
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
