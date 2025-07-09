import { useState, useEffect, useCallback } from "react";
import { getAllMembers, getAllPayments } from "@/services/memberService";

interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  isSyncing: boolean;
}

export const useOfflineSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    isSyncing: false,
  });

  // تتبع حالة الاتصال
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus((prev) => ({ ...prev, isOnline: true }));
      // بدء المزامنة التلقائية عند العودة للاتصال
      syncData();
    };

    const handleOffline = () => {
      setSyncStatus((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // حفظ البيانات محلياً مع تتبع التغييرات
  const saveOfflineData = useCallback(async (key: string, data: any) => {
    try {
      // حفظ البيانات في localStorage مع timestamp
      const offlineData = {
        data,
        timestamp: new Date().toISOString(),
        synced: false,
      };

      localStorage.setItem(`offline_${key}`, JSON.stringify(offlineData));

      // تحديث عدد التغييرات المعلقة
      const pendingKeys = Object.keys(localStorage).filter(
        (k) =>
          k.startsWith("offline_") &&
          !JSON.parse(localStorage.getItem(k) || "{}").synced,
      ).length;

      setSyncStatus((prev) => ({ ...prev, pendingChanges: pendingKeys }));

      return true;
    } catch (error) {
      console.error("خطأ في حفظ البيانات محلياً:", error);
      return false;
    }
  }, []);

  // استرجاع البيانات المحلية
  const getOfflineData = useCallback((key: string) => {
    try {
      const offlineData = localStorage.getItem(`offline_${key}`);
      if (offlineData) {
        const parsed = JSON.parse(offlineData);
        return parsed.data;
      }
      return null;
    } catch (error) {
      console.error("خطأ في استرجاع البيانات المحلية:", error);
      return null;
    }
  }, []);

  // مزامنة البيانات مع الخادم
  const syncData = useCallback(async () => {
    if (!navigator.onLine) {
      console.log("لا يمكن المزامنة - غير متصل بالإنترنت");
      return false;
    }

    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));

    try {
      // البحث عن البيانات غير المتزامنة
      const pendingKeys = Object.keys(localStorage).filter((key) => {
        if (!key.startsWith("offline_")) return false;
        try {
          const data = JSON.parse(localStorage.getItem(key) || "{}");
          return !data.synced;
        } catch {
          return false;
        }
      });

      // محاولة مزامنة كل عنصر
      for (const key of pendingKeys) {
        try {
          const offlineData = JSON.parse(localStorage.getItem(key) || "{}");

          // هنا يمكن إضافة منطق المزامنة مع API خارجي إذا لزم الأمر
          // في الوقت الحالي، نحن نعتمد على التخزين المحلي فقط

          // تحديث حالة المزامنة
          offlineData.synced = true;
          offlineData.syncedAt = new Date().toISOString();
          localStorage.setItem(key, JSON.stringify(offlineData));
        } catch (error) {
          console.error(`خطأ في مزامنة ${key}:`, error);
        }
      }

      setSyncStatus((prev) => ({
        ...prev,
        lastSync: new Date(),
        pendingChanges: 0,
        isSyncing: false,
      }));

      return true;
    } catch (error) {
      console.error("خطأ في المزامنة:", error);
      setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
      return false;
    }
  }, []);

  // تنظيف البيانات القديمة
  const cleanupOldData = useCallback(() => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      Object.keys(localStorage)
        .filter((key) => key.startsWith("offline_"))
        .forEach((key) => {
          try {
            const data = JSON.parse(localStorage.getItem(key) || "{}");
            const dataDate = new Date(data.timestamp);

            // حذف البيانات المتزامنة والقديمة
            if (data.synced && dataDate < oneWeekAgo) {
              localStorage.removeItem(key);
            }
          } catch (error) {
            // حذف البيانات التالفة
            localStorage.removeItem(key);
          }
        });
    } catch (error) {
      console.error("خطأ في تنظيف البيانات:", error);
    }
  }, []);

  // تشغيل التنظيف عند التحميل
  useEffect(() => {
    cleanupOldData();

    // تشغيل التنظيف كل ساعة
    const cleanupInterval = setInterval(cleanupOldData, 60 * 60 * 1000);

    return () => clearInterval(cleanupInterval);
  }, [cleanupOldData]);

  // حفظ بيانات العضو
  const saveMemberOffline = useCallback(
    async (member: any) => {
      return await saveOfflineData(`member_${member.id}`, member);
    },
    [saveOfflineData],
  );

  // حفظ بيانات الدفع
  const savePaymentOffline = useCallback(
    async (payment: any) => {
      return await saveOfflineData(`payment_${payment.id}`, payment);
    },
    [saveOfflineData],
  );

  // التحقق من توفر البيانات محلياً
  const hasOfflineData = useCallback(() => {
    return Object.keys(localStorage).some((key) => key.startsWith("offline_"));
  }, []);

  return {
    syncStatus,
    saveOfflineData,
    getOfflineData,
    syncData,
    saveMemberOffline,
    savePaymentOffline,
    hasOfflineData,
    cleanupOldData,
  };
};
