import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Calendar,
  TrendingUp,
  CreditCard,
  DollarSign,
  X,
  AlertCircle,
  Phone,
  Mail,
  Trash2,
  Edit,
  Save,
  Undo2,
} from "lucide-react";
import { getAllMembers, Member, updateMember } from "@/services/memberService";
import { getAllPayments } from "@/services/paymentService";
import { useRecentActivities } from "@/hooks/useRecentActivities";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber, formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

interface StatisticCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

const StatisticCard = (
  {
    icon,
    value,
    label,
    trend,
    isLoading = false,
    onClick,
  }: StatisticCardProps & { onClick?: () => void } = {
    icon: <Users className="h-6 w-6" />,
    value: "0",
    label: "Statistic",
    trend: {
      value: 0,
      isPositive: true,
    },
    isLoading: false,
  },
) => {
  return (
    <Card
      className={`overflow-hidden bg-gradient-to-br from-bluegray-800/80 to-bluegray-900/80 backdrop-blur-xl border border-bluegray-600/50 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:border-bluegray-500/60 ${onClick ? "cursor-pointer hover:scale-105 hover:from-bluegray-700/80 hover:to-bluegray-800/80" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              {isLoading
                ? "..."
                : typeof value === "number"
                  ? formatNumber(value)
                  : value}
            </div>
            <div className="text-sm text-gray-300 mt-1 font-medium">
              {label}
            </div>
            {!isLoading && trend && (
              <div
                className={`text-xs mt-2 flex items-center font-medium ${trend.isPositive ? "text-emerald-400" : "text-red-400"}`}
              >
                {trend.isPositive ? "↗" : "↘"} {formatNumber(trend.value)}%
                <span className="ml-1 text-gray-400">
                  {trend.isPositive ? "زيادة" : "نقصان"}
                </span>
              </div>
            )}
          </div>
          <div className="bg-gradient-to-br from-yellow-500/20 via-blue-500/20 to-purple-500/20 p-4 rounded-2xl border border-white/10 shadow-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const StatisticsOverview = () => {
  const [statistics, setStatistics] = useState({
    totalMembers: 0,
    todayAttendance: 0,
    weeklyAttendance: 0,
    pendingPayments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [trends, setTrends] = useState({
    totalMembers: { value: 0, isPositive: true },
    todayAttendance: { value: 0, isPositive: true },
    weeklyAttendance: { value: 0, isPositive: true },
    pendingPayments: { value: 0, isPositive: false },
    revenue: { value: 0, isPositive: true },
  });
  const [isUnpaidMembersSheetOpen, setIsUnpaidMembersSheetOpen] =
    useState(false);
  const [unpaidMembers, setUnpaidMembers] = useState<Member[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isTodayAttendeesSheetOpen, setIsTodayAttendeesSheetOpen] =
    useState(false);
  const [todayAttendees, setTodayAttendees] = useState<
    (Member & { isSessionPayment?: boolean })[]
  >([]);
  const [editingAttendee, setEditingAttendee] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Member>>({});

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all members
        const members = await getAllMembers();
        const totalMembers = members.length;

        // Fetch all payments first
        const payments = await getAllPayments();

        // Calculate today's attendance (including single sessions)
        const today = new Date().toISOString().split("T")[0];
        const todayAttendanceMembers = members.filter(
          (member) =>
            member.lastAttendance &&
            member.lastAttendance.split("T")[0] === today,
        );

        // Count unique single session attendees from today's payments
        const todaySessionPayments = payments.filter(
          (payment) =>
            payment.subscriptionType === "حصة واحدة" &&
            payment.date.split("T")[0] === today,
        );

        // Create session payment members for display (but count them as 1 total)
        const sessionPaymentMembers = todaySessionPayments.map(
          (payment, index) => ({
            id: payment.memberId,
            name:
              payment.notes?.split(" - ")[1]?.split(" (")[0] ||
              `زائر ${index + 1}`,
            membershipStatus: "active" as const,
            lastAttendance: payment.date,
            paymentStatus: "paid" as const,
            isSessionPayment: true,
            phoneNumber: payment.notes?.match(/\(([^)]+)\)/)?.[1] || "",
          }),
        );

        // Combine regular members and session payment members for display
        const allTodayAttendees = [
          ...todayAttendanceMembers,
          ...sessionPaymentMembers,
        ];
        setTodayAttendees(allTodayAttendees);

        // Calculate total today attendance: subscribed members + count of single sessions (not individual payments)
        const totalTodayAttendance =
          todayAttendanceMembers.length +
          (todaySessionPayments.length > 0 ? todaySessionPayments.length : 0);

        // Calculate weekly attendance
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekAgoStr = oneWeekAgo.toISOString();

        const weeklyAttendanceMembers = members.filter((member) => {
          if (!member.lastAttendance) return false;
          return new Date(member.lastAttendance) >= new Date(oneWeekAgoStr);
        });

        // Count single session payments from this week
        const weeklySessionPayments = payments.filter(
          (payment) =>
            payment.subscriptionType === "حصة واحدة" &&
            new Date(payment.date) >= new Date(oneWeekAgoStr),
        );

        const weeklyAttendance =
          weeklyAttendanceMembers.length + weeklySessionPayments.length;
        // Include members with zero sessions and unpaid status
        const unpaidMembersList = members.filter(
          (member) =>
            member.paymentStatus === "unpaid" ||
            member.paymentStatus === "partial" ||
            member.membershipStatus === "pending" ||
            (member.sessionsRemaining !== undefined &&
              member.sessionsRemaining === 0),
        );
        const pendingPayments = unpaidMembersList.length;
        setUnpaidMembers(unpaidMembersList);

        // Calculate trends based on real data
        // For this example, we'll compare with previous week
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const twoWeeksAgoStr = twoWeeksAgo.toISOString();

        const previousWeekAttendance = members.filter((member) => {
          if (!member.lastAttendance) return false;
          const attendanceDate = new Date(member.lastAttendance);
          return (
            attendanceDate >= new Date(twoWeeksAgoStr) &&
            attendanceDate < new Date(oneWeekAgoStr)
          );
        }).length;

        // Calculate trend percentages
        const weeklyTrendPercentage =
          previousWeekAttendance > 0
            ? Math.round(
                ((weeklyAttendance - previousWeekAttendance) /
                  previousWeekAttendance) *
                  100,
              )
            : 0;

        const membersTrendPercentage = 5; // Placeholder - would calculate from historical data
        const todayTrendPercentage = 8; // Placeholder - would compare with previous day

        setStatistics({
          totalMembers,
          todayAttendance: totalTodayAttendance,
          weeklyAttendance,
          pendingPayments,
        });

        setTrends({
          totalMembers: {
            value: membersTrendPercentage,
            isPositive: membersTrendPercentage >= 0,
          },
          todayAttendance: {
            value: todayTrendPercentage,
            isPositive: todayTrendPercentage >= 0,
          },
          weeklyAttendance: {
            value: Math.abs(weeklyTrendPercentage),
            isPositive: weeklyTrendPercentage >= 0,
          },
          pendingPayments: { value: 2, isPositive: false },
          revenue: { value: 0, isPositive: true },
        });
      } catch (error) {
        console.error("Error fetching statistics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up interval to refresh data every 5 minutes
    const intervalId = setInterval(() => {
      fetchData();
    }, 300000); // 5 minutes

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const handleRemoveFromUnpaidList = async (member: Member) => {
    setIsUpdating(member.id);
    try {
      // Update member payment status to paid and membership status to active
      const updatedMember = {
        ...member,
        paymentStatus: "paid" as const,
        membershipStatus: "active" as const,
      };

      await updateMember(updatedMember);

      // Remove from local unpaid list
      setUnpaidMembers((prev) => prev.filter((m) => m.id !== member.id));

      // Update statistics
      setStatistics((prev) => ({
        ...prev,
        pendingPayments: prev.pendingPayments - 1,
      }));
    } catch (error) {
      console.error("Error updating member:", error);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleEditAttendee = (
    attendee: Member & { isSessionPayment?: boolean },
  ) => {
    if (attendee.isSessionPayment) {
      toast({
        title: "تنبيه",
        description: "لا يمكن تعديل بيانات الحصص المؤقتة",
        variant: "destructive",
      });
      return;
    }
    setEditingAttendee(attendee.id);
    setEditFormData({
      name: attendee.name,
      phoneNumber: attendee.phoneNumber || "",
      email: attendee.email || "",
      membershipStatus: attendee.membershipStatus,
      lastAttendance: attendee.lastAttendance,
    });
  };

  const handleSaveAttendeeEdit = async () => {
    if (!editingAttendee) return;

    try {
      const attendeeToUpdate = todayAttendees.find(
        (a) => a.id === editingAttendee,
      );
      if (!attendeeToUpdate || attendeeToUpdate.isSessionPayment) return;

      const updatedMember = {
        ...attendeeToUpdate,
        ...editFormData,
      };

      await updateMember(updatedMember as Member);

      // Update local state
      setTodayAttendees((prev) =>
        prev.map((attendee) =>
          attendee.id === editingAttendee
            ? { ...attendee, ...editFormData }
            : attendee,
        ),
      );

      setEditingAttendee(null);
      setEditFormData({});

      toast({
        title: "تم التحديث",
        description: "تم تحديث بيانات العضو بنجاح",
      });
    } catch (error) {
      console.error("Error updating attendee:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث البيانات",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingAttendee(null);
    setEditFormData({});
  };

  const handleRemoveAttendance = async (
    attendee: Member & { isSessionPayment?: boolean },
  ) => {
    if (attendee.isSessionPayment) {
      toast({
        title: "تنبيه",
        description: "لا يمكن حذف الحصص المؤقتة من هنا",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("هل أنت متأكد من إلغاء حضور هذا العضو لليوم؟")) return;

    try {
      const updatedMember = {
        ...attendee,
        lastAttendance: "", // Clear attendance
        sessionsRemaining:
          attendee.sessionsRemaining !== undefined
            ? attendee.sessionsRemaining + 1 // Add back the session
            : attendee.sessionsRemaining,
      };

      await updateMember(updatedMember as Member);

      // Remove from today's attendees list
      setTodayAttendees((prev) => prev.filter((a) => a.id !== attendee.id));

      // Update statistics
      setStatistics((prev) => ({
        ...prev,
        todayAttendance: prev.todayAttendance - 1,
      }));

      toast({
        title: "تم الإلغاء",
        description: "تم إلغاء حضور العضو وإعادة الحصة",
      });
    } catch (error) {
      console.error("Error removing attendance:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إلغاء الحضور",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatisticCard
          icon={<Users className="h-7 w-7 text-blue-400" />}
          value={statistics.totalMembers}
          label="إجمالي الأعضاء"
          trend={trends.totalMembers}
          isLoading={isLoading}
        />

        <StatisticCard
          icon={<Calendar className="h-7 w-7 text-emerald-400" />}
          value={statistics.todayAttendance}
          label="حضور اليوم"
          trend={trends.todayAttendance}
          isLoading={isLoading}
          onClick={() => setIsTodayAttendeesSheetOpen(true)}
        />

        <StatisticCard
          icon={<TrendingUp className="h-7 w-7 text-purple-400" />}
          value={statistics.weeklyAttendance}
          label="حضور الأسبوع"
          trend={trends.weeklyAttendance}
          isLoading={isLoading}
        />

        <StatisticCard
          icon={<CreditCard className="h-7 w-7 text-pink-400" />}
          value={statistics.pendingPayments}
          label="مدفوعات معلقة"
          trend={trends.pendingPayments}
          isLoading={isLoading}
          onClick={() => setIsUnpaidMembersSheetOpen(true)}
        />
      </div>

      {/* Unpaid Members Sheet */}
      <Sheet
        open={isUnpaidMembersSheetOpen}
        onOpenChange={setIsUnpaidMembersSheetOpen}
      >
        <SheetContent
          side="right"
          className="w-full sm:w-[400px] bg-gray-900 text-white"
        >
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-bold text-white">
                الأعضاء غير المدفوعين
              </SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsUnpaidMembersSheetOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SheetDescription className="text-gray-300">
              قائمة بالأعضاء الذين لديهم مدفوعات معلقة أو حصص منتهية
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {unpaidMembers.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">لا توجد مدفوعات معلقة</p>
              </div>
            ) : (
              unpaidMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-gradient-to-r from-bluegray-700/50 to-bluegray-800/50 rounded-xl p-4 border border-bluegray-600/50 backdrop-blur-sm hover:from-bluegray-600/50 hover:to-bluegray-700/50 transition-all duration-300"
                >
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.imageUrl} alt={member.name} />
                      <AvatarFallback className="bg-gray-700 text-white">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-white truncate">
                          {member.name}
                        </h3>
                        <Badge
                          variant={
                            member.paymentStatus === "unpaid"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {member.paymentStatus === "unpaid"
                            ? "غير مدفوع"
                            : member.paymentStatus === "partial"
                              ? "جزئي"
                              : "معلق"}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs text-gray-400">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Phone className="h-3 w-3" />
                          <span>{member.phoneNumber}</span>
                        </div>
                        {member.email && (
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <Mail className="h-3 w-3" />
                            <span>{member.email}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveFromUnpaidList(member)}
                          disabled={isUpdating === member.id}
                          className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                        >
                          {isUpdating === member.id ? (
                            "جاري التحديث..."
                          ) : (
                            <>
                              <Trash2 className="h-3 w-3 ml-1" />
                              إزالة
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Today's Attendees Sheet */}
      <Sheet
        open={isTodayAttendeesSheetOpen}
        onOpenChange={setIsTodayAttendeesSheetOpen}
      >
        <SheetContent
          side="right"
          className="w-full sm:w-[400px] bg-gray-900 text-white"
        >
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-bold text-white">
                حضور اليوم
              </SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTodayAttendeesSheetOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SheetDescription className="text-gray-300">
              قائمة بالأعضاء الذين حضروا اليوم (
              {formatDate(new Date().toISOString())})
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {todayAttendees.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">لا يوجد حضور اليوم</p>
              </div>
            ) : (
              todayAttendees.map((attendee, index) => (
                <div
                  key={attendee.id || index}
                  className="bg-gradient-to-r from-bluegray-700/50 to-bluegray-800/50 rounded-xl p-4 border border-bluegray-600/50 backdrop-blur-sm hover:from-bluegray-600/50 hover:to-bluegray-700/50 transition-all duration-300"
                >
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={attendee.imageUrl}
                        alt={attendee.name}
                      />
                      <AvatarFallback className="bg-gray-700 text-white">
                        {attendee.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      {editingAttendee === attendee.id ? (
                        // Edit mode
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-white">
                              تعديل بيانات العضو
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              تحرير
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs text-gray-400">
                                الاسم
                              </Label>
                              <Input
                                value={editFormData.name || ""}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                  }))
                                }
                                className="bg-gray-700 border-gray-600 text-white text-xs h-8"
                              />
                            </div>

                            <div>
                              <Label className="text-xs text-gray-400">
                                رقم الهاتف
                              </Label>
                              <Input
                                value={editFormData.phoneNumber || ""}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({
                                    ...prev,
                                    phoneNumber: e.target.value,
                                  }))
                                }
                                className="bg-gray-700 border-gray-600 text-white text-xs h-8"
                              />
                            </div>

                            <div>
                              <Label className="text-xs text-gray-400">
                                البريد الإلكتروني
                              </Label>
                              <Input
                                value={editFormData.email || ""}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({
                                    ...prev,
                                    email: e.target.value,
                                  }))
                                }
                                className="bg-gray-700 border-gray-600 text-white text-xs h-8"
                              />
                            </div>

                            <div>
                              <Label className="text-xs text-gray-400">
                                حالة العضوية
                              </Label>
                              <Select
                                value={
                                  editFormData.membershipStatus || "active"
                                }
                                onValueChange={(value) =>
                                  setEditFormData((prev) => ({
                                    ...prev,
                                    membershipStatus: value as
                                      | "active"
                                      | "expired"
                                      | "pending",
                                  }))
                                }
                              >
                                <SelectTrigger className="bg-gray-700 border-gray-600 text-white text-xs h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-700 border-gray-600 text-white">
                                  <SelectItem value="active">نشط</SelectItem>
                                  <SelectItem value="pending">معلق</SelectItem>
                                  <SelectItem value="expired">منتهي</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={handleSaveAttendeeEdit}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                            >
                              <Save className="h-3 w-3 ml-1" />
                              حفظ
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                              className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs h-7"
                            >
                              <Undo2 className="h-3 w-3 ml-1" />
                              إلغاء
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-white truncate">
                              {attendee.name}
                            </h3>
                            <Badge
                              variant={
                                attendee.isSessionPayment
                                  ? "secondary"
                                  : "default"
                              }
                              className="text-xs"
                            >
                              {attendee.isSessionPayment ? "حصة واحدة" : "عضو"}
                            </Badge>
                          </div>

                          <div className="space-y-1 text-xs text-gray-400">
                            {attendee.phoneNumber && (
                              <div className="flex items-center space-x-2 space-x-reverse">
                                <Phone className="h-3 w-3" />
                                <span>{attendee.phoneNumber}</span>
                              </div>
                            )}
                            {attendee.email && (
                              <div className="flex items-center space-x-2 space-x-reverse">
                                <Mail className="h-3 w-3" />
                                <span>{attendee.email}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <Calendar className="h-3 w-3" />
                              <span>
                                وقت الحضور:{" "}
                                {formatDate(attendee.lastAttendance)}
                              </span>
                            </div>
                            {!attendee.isSessionPayment &&
                              attendee.sessionsRemaining !== undefined && (
                                <div className="text-blue-400">
                                  الحصص المتبقية: {attendee.sessionsRemaining}
                                </div>
                              )}
                          </div>

                          {!attendee.isSessionPayment && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditAttendee(attendee)}
                                className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white text-xs h-7"
                              >
                                <Edit className="h-3 w-3 ml-1" />
                                تعديل
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemoveAttendance(attendee)}
                                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white text-xs h-7"
                              >
                                <Trash2 className="h-3 w-3 ml-1" />
                                إلغاء الحضور
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default StatisticsOverview;
