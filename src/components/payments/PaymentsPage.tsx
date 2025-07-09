import React, { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import PaymentForm from "./PaymentForm";
import PaymentsList from "./PaymentsList";
import {
  Payment,
  getPaymentStatistics,
  getAllPayments,
  deleteAllPayments,
} from "@/services/paymentService";
import { getAllMembers } from "@/services/memberService";
import { formatNumber } from "@/lib/utils";
import {
  TrendingUp,
  DollarSign,
  Download,
  Upload,
  Database,
  Cloud,
  Trash2,
  AlertTriangle,
} from "lucide-react";

const PaymentsPage = () => {
  const [refreshPaymentsList, setRefreshPaymentsList] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [statistics, setStatistics] = useState<{
    totalRevenue: number;
    monthRevenue: number;
    weekRevenue: number;
    todayRevenue: number;
  }>({ totalRevenue: 0, monthRevenue: 0, weekRevenue: 0, todayRevenue: 0 });
  const paymentsListRef = useRef<{ fetchPayments?: () => Promise<void> }>({});
  const { toast } = useToast();

  const handlePaymentSuccess = () => {
    setRefreshPaymentsList((prev) => prev + 1);
    setEditingPayment(null);
    // If we have a direct reference to the fetchPayments function, call it
    if (paymentsListRef.current?.fetchPayments) {
      paymentsListRef.current.fetchPayments();
    }
    // Refresh statistics
    fetchStatistics();
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
  };

  const handleCancelEdit = () => {
    setEditingPayment(null);
  };

  // Function to fetch payment statistics
  const fetchStatistics = async () => {
    try {
      const stats = await getPaymentStatistics();
      // Ensure all values are valid numbers
      const safeRound = (value: any) => {
        const num = Number(value);
        return isNaN(num) || !isFinite(num) ? 0 : Math.round(num);
      };

      setStatistics({
        totalRevenue: safeRound(stats.totalRevenue),
        monthRevenue: safeRound(stats.monthRevenue),
        weekRevenue: safeRound(stats.weekRevenue),
        todayRevenue: safeRound(stats.todayRevenue),
      });
    } catch (error) {
      console.error("Error fetching payment statistics:", error);
      // Set default values in case of error
      setStatistics({
        totalRevenue: 0,
        monthRevenue: 0,
        weekRevenue: 0,
        todayRevenue: 0,
      });
    }
  };

  // Function to expose the fetchPayments method from PaymentsList
  const registerPaymentsList = (methods: {
    fetchPayments: () => Promise<void>;
  }) => {
    paymentsListRef.current = methods;
  };

  // Play sound effect
  const playSound = (type: "success" | "error") => {
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (type === "success") {
        // Success sound: ascending notes
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(
          659.25,
          audioContext.currentTime + 0.1,
        ); // E5
        oscillator.frequency.setValueAtTime(
          783.99,
          audioContext.currentTime + 0.2,
        ); // G5
      } else {
        // Error sound: descending notes
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(
          415.3,
          audioContext.currentTime + 0.1,
        ); // G#4
        oscillator.frequency.setValueAtTime(
          349.23,
          audioContext.currentTime + 0.2,
        ); // F4
      }

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.3,
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log("Sound not supported");
    }
  };

  // Export all data as downloadable file
  const handleExportData = async () => {
    setIsLoading(true);

    try {
      toast({
        title: "جاري تحضير البيانات...",
        description: "يرجى الانتظار، جاري جمع البيانات",
      });

      // Fetch all data from all sources
      const [payments, members, activities] = await Promise.all([
        getAllPayments(),
        getAllMembers(),
        import("@/services/memberService").then(
          (service) => service.getRecentActivities(100000), // Get all activities
        ),
      ]);

      console.log(
        `Export: Found ${payments?.length || 0} payments, ${members?.length || 0} members, ${activities?.length || 0} activities`,
      );

      // Validate and clean data
      const cleanPayments = (payments || []).map((payment, index) => ({
        id: payment?.id || `payment_${Date.now()}_${index}`,
        memberId: payment?.memberId || `unknown_${index}`,
        amount: Number(payment?.amount) || 0,
        date: payment?.date || new Date().toISOString(),
        subscriptionType: payment?.subscriptionType || "غير محدد",
        paymentMethod: payment?.paymentMethod || "cash",
        status: payment?.status || "completed",
        invoiceNumber: payment?.invoiceNumber || `INV-${Date.now()}-${index}`,
        notes: payment?.notes || "",
        receiptUrl: payment?.receiptUrl || "",
      }));

      const cleanMembers = (members || []).map((member, index) => ({
        id: member?.id || `member_${Date.now()}_${index}`,
        name: member?.name || `عضو ${index + 1}`,
        membershipStatus: member?.membershipStatus || "pending",
        lastAttendance:
          member?.lastAttendance || new Date().toISOString().split("T")[0],
        imageUrl: member?.imageUrl || "",
        phoneNumber: member?.phoneNumber || "",
        email: member?.email || "",
        membershipType: member?.membershipType || "",
        membershipStartDate: member?.membershipStartDate || "",
        membershipEndDate: member?.membershipEndDate || "",
        subscriptionType: member?.subscriptionType,
        sessionsRemaining: Number(member?.sessionsRemaining) || 0,
        subscriptionPrice: Number(member?.subscriptionPrice) || 0,
        paymentStatus: member?.paymentStatus || "unpaid",
        note: member?.note || "",
      }));

      const cleanActivities = (activities || []).map((activity, index) => ({
        id: activity?.id || `activity_${Date.now()}_${index}`,
        memberId: activity?.memberId || `unknown_${index}`,
        memberName: activity?.memberName || "",
        memberImage: activity?.memberImage || "",
        activityType: activity?.activityType || "other",
        timestamp: activity?.timestamp || new Date().toISOString(),
        details: activity?.details || "",
      }));

      // Create comprehensive export data
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: "4.0",
          gymName: "Yacin Gym",
          exportId: `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          totalPayments: cleanPayments.length,
          totalMembers: cleanMembers.length,
          totalActivities: cleanActivities.length,
          totalRevenue: cleanPayments.reduce(
            (sum, p) => sum + (p.amount || 0),
            0,
          ),
          dataIntegrity: {
            paymentsChecksum: cleanPayments.length,
            membersChecksum: cleanMembers.length,
            activitiesChecksum: cleanActivities.length,
            exportComplete: true,
          },
        },
        data: {
          payments: cleanPayments,
          members: cleanMembers,
          activities: cleanActivities,
        },
      };

      // Create file content
      const dataStr = JSON.stringify(exportData, null, 2);

      if (!dataStr || dataStr.length < 10) {
        throw new Error("فشل في إنشاء ملف التصدير");
      }

      const timestamp = new Date()
        .toISOString()
        .split("T")[0]
        .replace(/-/g, "");
      const fileName = `yacin-gym-complete-backup-${timestamp}.json`;

      // Create and trigger download
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      playSound("success");
      toast({
        title: "✅ تم تصدير البيانات بنجاح",
        description: `تم تحميل ${cleanPayments.length} دفعة، ${cleanMembers.length} عضو، و ${cleanActivities.length} نشاط`,
      });
    } catch (error) {
      console.error("Export error:", error);
      playSound("error");

      const errorMessage =
        error instanceof Error ? error.message : "حدث خطأ غير متوقع";

      toast({
        title: "❌ خطأ في التصدير",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Clear all payments with confirmation
  const handleClearAllPayments = async () => {
    if (
      !confirm(
        "هل أنت متأكد من حذف جميع المدفوعات؟ لا يمكن التراجع عن هذا الإجراء!",
      )
    ) {
      return;
    }

    if (
      !confirm(
        "تأكيد نهائي: سيتم حذف جميع المدفوعات نهائياً. هل تريد المتابعة؟",
      )
    ) {
      return;
    }

    setIsLoading(true);

    try {
      toast({
        title: "جاري حذف المدفوعات...",
        description: "يرجى الانتظار",
      });

      await deleteAllPayments();

      playSound("success");
      toast({
        title: "✅ تم حذف جميع المدفوعات",
        description: "تم حذف جميع المدفوعات بنجاح",
      });

      // Refresh all data
      setRefreshPaymentsList((prev) => prev + 1);
      await fetchStatistics();

      // Force refresh the payments list component
      if (paymentsListRef.current?.fetchPayments) {
        await paymentsListRef.current.fetchPayments();
      }
    } catch (error) {
      console.error("Clear payments error:", error);
      playSound("error");
      toast({
        title: "❌ خطأ في الحذف",
        description: "حدث خطأ أثناء حذف المدفوعات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Import all data with comprehensive handling
  const handleImportData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.style.display = "none";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsLoading(true);

      try {
        toast({
          title: "جاري استيراد جميع البيانات...",
          description: "يرجى الانتظار، جاري معالجة الملف",
        });

        // File validation
        if (file.size > 100 * 1024 * 1024) {
          throw new Error("حجم الملف كبير جداً (الحد الأقصى 100 ميجابايت)");
        }

        if (file.size < 10) {
          throw new Error("الملف فارغ أو تالف");
        }

        // Read and parse file
        const text = await file.text();
        if (!text.trim()) {
          throw new Error("الملف فارغ");
        }

        let importData;
        try {
          importData = JSON.parse(text);
        } catch (parseError) {
          throw new Error("ملف JSON غير صحيح أو تالف");
        }

        // Extract data from different formats
        let payments = [];
        let members = [];
        let activities = [];

        // Handle new format with metadata
        if (importData.data) {
          payments = importData.data.payments || [];
          members = importData.data.members || [];
          activities = importData.data.activities || [];
        }
        // Handle old format - direct arrays
        else if (importData.payments || importData.members) {
          payments = importData.payments || [];
          members = importData.members || [];
          activities = importData.activities || [];
        }
        // Handle array format
        else if (Array.isArray(importData)) {
          // Try to detect data type
          for (const item of importData) {
            if (item.amount !== undefined) {
              payments.push(item);
            } else if (item.name !== undefined) {
              members.push(item);
            } else if (item.activityType !== undefined) {
              activities.push(item);
            }
          }
        }

        if (!Array.isArray(payments)) payments = [];
        if (!Array.isArray(members)) members = [];
        if (!Array.isArray(activities)) activities = [];

        console.log(
          `Import: Found ${payments.length} payments, ${members.length} members, ${activities.length} activities`,
        );

        if (
          payments.length === 0 &&
          members.length === 0 &&
          activities.length === 0
        ) {
          throw new Error("لا توجد بيانات صالحة للاستيراد في الملف");
        }

        let importedMembers = 0;
        let importedPayments = 0;
        let importedActivities = 0;
        const errors = [];

        // Import members with comprehensive data cleaning
        const memberService = await import("@/services/memberService");

        for (let i = 0; i < members.length; i++) {
          try {
            const member = members[i];
            if (!member || typeof member !== "object") {
              errors.push(`عضو غير صحيح في الفهرس ${i}`);
              continue;
            }

            if (
              !member.name ||
              typeof member.name !== "string" ||
              member.name.trim() === ""
            ) {
              errors.push(`عضو بدون اسم في الفهرس ${i}`);
              continue;
            }

            const cleanMember = {
              id: member.id || `imported_member_${Date.now()}_${i}`,
              name: String(member.name).trim(),
              membershipStatus: ["active", "expired", "pending"].includes(
                member.membershipStatus,
              )
                ? member.membershipStatus
                : "pending",
              lastAttendance:
                member.lastAttendance || new Date().toISOString().split("T")[0],
              imageUrl: member.imageUrl || member.profileImage || "",
              phoneNumber: member.phoneNumber || member.phone || "",
              email: member.email || "",
              membershipType: member.membershipType || "",
              membershipStartDate: member.membershipStartDate || "",
              membershipEndDate: member.membershipEndDate || "",
              subscriptionType: member.subscriptionType,
              sessionsRemaining: Math.max(
                0,
                Number(member.sessionsRemaining) || 0,
              ),
              subscriptionPrice: Math.max(
                0,
                Number(member.subscriptionPrice) || 0,
              ),
              paymentStatus: ["paid", "unpaid", "partial"].includes(
                member.paymentStatus,
              )
                ? member.paymentStatus
                : "unpaid",
              note: member.note || "",
            };

            // Use the new addOrUpdateMemberWithId function
            await memberService.addOrUpdateMemberWithId(cleanMember);
            importedMembers++;
          } catch (error) {
            errors.push(`خطأ في استيراد عضو ${i}: ${error}`);
          }
        }

        // Import payments with comprehensive data cleaning
        const paymentService = await import("@/services/paymentService");

        for (let i = 0; i < payments.length; i++) {
          try {
            const payment = payments[i];
            if (!payment || typeof payment !== "object") {
              errors.push(`دفعة غير صحيحة في الفهرس ${i}`);
              continue;
            }

            if (payment.amount === undefined || payment.amount === null) {
              errors.push(`دفعة بدون مبلغ في الفهرس ${i}`);
              continue;
            }

            const cleanPayment = {
              id: payment.id || `imported_payment_${Date.now()}_${i}`,
              memberId: payment.memberId || "unknown",
              amount: Math.max(0, Number(payment.amount) || 0),
              date: payment.date || new Date().toISOString(),
              subscriptionType: payment.subscriptionType || "غير محدد",
              paymentMethod: ["cash", "card", "transfer"].includes(
                payment.paymentMethod,
              )
                ? payment.paymentMethod
                : "cash",
              status: ["completed", "pending", "cancelled"].includes(
                payment.status,
              )
                ? payment.status
                : "completed",
              invoiceNumber: payment.invoiceNumber || `INV-${Date.now()}-${i}`,
              notes: payment.notes || "",
              receiptUrl: payment.receiptUrl || "",
            };

            // Use the new addOrUpdatePaymentWithId function
            await paymentService.addOrUpdatePaymentWithId(cleanPayment);
            importedPayments++;
          } catch (error) {
            errors.push(`خطأ في استيراد دفعة ${i}: ${error}`);
          }
        }

        // Import activities with comprehensive data cleaning
        for (let i = 0; i < activities.length; i++) {
          try {
            const activity = activities[i];
            if (
              !activity ||
              typeof activity !== "object" ||
              !activity.memberId
            ) {
              continue; // Skip invalid activities silently
            }

            const cleanActivity = {
              id: activity.id || `imported_activity_${Date.now()}_${i}`,
              memberId: activity.memberId,
              memberName: activity.memberName || "",
              memberImage: activity.memberImage || "",
              activityType: [
                "check-in",
                "membership-renewal",
                "payment",
                "other",
              ].includes(activity.activityType)
                ? activity.activityType
                : "other",
              timestamp: activity.timestamp || new Date().toISOString(),
              details: activity.details || "",
            };

            // Use the member service to add activity
            await memberService.addOrUpdateActivityWithId(cleanActivity);
            importedActivities++;
          } catch (error) {
            // Skip failed activities silently
          }
        }

        // Success feedback
        playSound("success");
        toast({
          title: "✅ تم استيراد جميع البيانات بنجاح",
          description: `تم استيراد ${importedMembers} عضو، ${importedPayments} دفعة، و ${importedActivities} نشاط`,
        });

        // Show errors summary if any
        if (errors.length > 0) {
          setTimeout(() => {
            toast({
              title: "⚠️ تحذيرات الاستيراد",
              description: `تم تجاهل ${errors.length} عنصر بسبب بيانات غير صحيحة`,
              variant: "destructive",
            });
          }, 2000);
          console.warn("Import errors:", errors);
        }

        // Refresh all data
        setRefreshPaymentsList((prev) => prev + 1);
        await fetchStatistics();

        // Force refresh the payments list component
        if (paymentsListRef.current?.fetchPayments) {
          await paymentsListRef.current.fetchPayments();
        }

        // Add a small delay to ensure all data is refreshed
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error("Import error:", error);
        playSound("error");
        toast({
          title: "❌ خطأ في الاستيراد",
          description:
            error instanceof Error
              ? error.message
              : "حدث خطأ غير متوقع أثناء الاستيراد",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        if (input.parentNode) {
          input.parentNode.removeChild(input);
        }
      }
    };

    document.body.appendChild(input);
    input.click();
  };

  // Fetch statistics on component mount and when payments are refreshed
  useEffect(() => {
    fetchStatistics();
  }, [refreshPaymentsList]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center lg:text-right mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-yellow-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
          إدارة المدفوعات
        </h1>
        <p className="text-gray-300 text-sm lg:text-base">
          تتبع وإدارة جميع المدفوعات والإيرادات بطريقة احترافية ومنظمة
        </p>

        <div className="flex justify-center lg:justify-end mt-4">
          <div className="relative group">
            <Button
              className="bg-gradient-to-r from-yellow-500 to-blue-600 hover:from-yellow-600 hover:to-blue-700 text-white px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {}}
              disabled={isLoading}
            >
              <Database
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              {isLoading ? "جاري المعالجة..." : "إدارة البيانات"}
            </Button>

            {/* Dropdown Menu */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-20">
              <div className="bg-bluegray-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-bluegray-600/50 p-2 min-w-[200px]">
                <Button
                  onClick={handleExportData}
                  disabled={isLoading}
                  className="w-full justify-start bg-transparent hover:bg-bluegray-700/50 text-gray-200 hover:text-white border-0 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download
                    className={`h-4 w-4 mr-2 ${isLoading ? "animate-pulse" : ""}`}
                  />
                  {isLoading ? "جاري المعالجة..." : "تحميل البيانات"}
                </Button>
                <Button
                  onClick={handleImportData}
                  disabled={isLoading}
                  className="w-full justify-start bg-transparent hover:bg-bluegray-700/50 text-gray-200 hover:text-white border-0 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload
                    className={`h-4 w-4 mr-2 ${isLoading ? "animate-pulse" : ""}`}
                  />
                  {isLoading ? "جاري الاستيراد..." : "استيراد البيانات"}
                </Button>
                <Button
                  onClick={handleClearAllPayments}
                  disabled={isLoading}
                  className="w-full justify-start bg-transparent hover:bg-red-700/50 text-red-400 hover:text-red-300 border-0 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2
                    className={`h-4 w-4 mr-2 ${isLoading ? "animate-pulse" : ""}`}
                  />
                  {isLoading ? "جاري الحذف..." : "حذف جميع المدفوعات"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <Card className="overflow-hidden bg-gradient-to-br from-bluegray-800/80 to-bluegray-900/80 backdrop-blur-xl border border-bluegray-600/50 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:border-bluegray-500/60 hover:scale-105">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {formatNumber(statistics.totalRevenue)}
                </div>
                <div className="text-sm text-gray-300 mt-1 font-medium">
                  إجمالي الإيرادات
                </div>
                <div className="text-xs mt-2 text-gray-400">دينار جزائري</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/20 via-blue-500/20 to-purple-500/20 p-4 rounded-2xl border border-white/10 shadow-lg">
                <DollarSign className="h-7 w-7 text-blue-400" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden bg-gradient-to-br from-bluegray-800/80 to-bluegray-900/80 backdrop-blur-xl border border-bluegray-600/50 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:border-bluegray-500/60 hover:scale-105">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {formatNumber(statistics.monthRevenue)}
                </div>
                <div className="text-sm text-gray-300 mt-1 font-medium">
                  إيرادات الشهر
                </div>
                <div className="text-xs mt-2 text-gray-400">دينار جزائري</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/20 via-blue-500/20 to-purple-500/20 p-4 rounded-2xl border border-white/10 shadow-lg">
                <TrendingUp className="h-7 w-7 text-emerald-400" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden bg-gradient-to-br from-bluegray-800/80 to-bluegray-900/80 backdrop-blur-xl border border-bluegray-600/50 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:border-bluegray-500/60 hover:scale-105">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {formatNumber(statistics.weekRevenue)}
                </div>
                <div className="text-sm text-gray-300 mt-1 font-medium">
                  إيرادات الأسبوع
                </div>
                <div className="text-xs mt-2 text-gray-400">دينار جزائري</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/20 via-blue-500/20 to-purple-500/20 p-4 rounded-2xl border border-white/10 shadow-lg">
                <TrendingUp className="h-7 w-7 text-purple-400" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden bg-gradient-to-br from-bluegray-800/80 to-bluegray-900/80 backdrop-blur-xl border border-bluegray-600/50 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:border-bluegray-500/60 hover:scale-105">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {formatNumber(statistics.todayRevenue)}
                </div>
                <div className="text-sm text-gray-300 mt-1 font-medium">
                  إيرادات اليوم
                </div>
                <div className="text-xs mt-2 text-gray-400">دينار جزائري</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/20 via-blue-500/20 to-purple-500/20 p-4 rounded-2xl border border-white/10 shadow-lg">
                <DollarSign className="h-7 w-7 text-pink-400" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        <Card className="bg-gradient-to-br from-bluegray-800/80 to-bluegray-900/80 backdrop-blur-xl border border-bluegray-600/50 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:border-bluegray-500/60">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                إضافة دفعة جديدة
              </h2>
              <p className="text-gray-300 text-sm">
                قم بإدخال تفاصيل الدفعة الجديدة
              </p>
            </div>
            <PaymentForm
              onSuccess={handlePaymentSuccess}
              editingPayment={editingPayment}
              onCancelEdit={handleCancelEdit}
            />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-bluegray-800/80 to-bluegray-900/80 backdrop-blur-xl border border-bluegray-600/50 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:border-bluegray-500/60">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                قائمة المدفوعات
              </h2>
              <p className="text-gray-300 text-sm">عرض وإدارة جميع المدفوعات</p>
            </div>
            <PaymentsList
              onRefresh={refreshPaymentsList}
              onEditPayment={handleEditPayment}
              ref={registerPaymentsList}
            />
          </div>
        </Card>
      </div>
      <Toaster />
    </div>
  );
};

export default PaymentsPage;
