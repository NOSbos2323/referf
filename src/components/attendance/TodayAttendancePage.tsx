import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  Users,
  Edit,
  Trash2,
  Save,
  Undo2,
  ArrowLeft,
  Clock,
  CheckCircle,
  DollarSign,
} from "lucide-react";
import { getAllMembers, Member, updateMember } from "@/services/memberService";
import { getAllPayments } from "@/services/paymentService";
import { formatDate, formatNumber } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import TopMobileNavigation from "../layout/TopMobileNavigation";
import MobileNavigationComponent from "../layout/MobileNavigation";

interface TodayAttendancePageProps {
  onBack?: () => void;
}

const TodayAttendancePage = ({ onBack }: TodayAttendancePageProps) => {
  const [todayAttendees, setTodayAttendees] = useState<
    (Member & { isSessionPayment?: boolean })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [editingAttendee, setEditingAttendee] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Member>>({});

  // Helper function to check if member has payment issues
  const hasPaymentIssues = (
    attendee: Member & { isSessionPayment?: boolean },
  ) => {
    if (attendee.isSessionPayment) return false;

    const hasUnpaidStatus =
      attendee.paymentStatus === "unpaid" ||
      attendee.paymentStatus === "partial";
    const hasPendingMembership = attendee.membershipStatus === "pending";
    const hasZeroSessions =
      attendee.sessionsRemaining !== undefined &&
      attendee.sessionsRemaining === 0;

    // Check if subscription month has ended
    const hasExpiredSubscription = (() => {
      if (!attendee.membershipStartDate) return false;

      const startDate = new Date(attendee.membershipStartDate);
      const currentDate = new Date();

      // Calculate one month from start date
      const oneMonthLater = new Date(startDate);
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

      // Check if current date is past the one month mark
      return currentDate > oneMonthLater;
    })();

    return (
      hasUnpaidStatus ||
      hasPendingMembership ||
      hasZeroSessions ||
      hasExpiredSubscription
    );
  };

  useEffect(() => {
    const fetchTodayAttendees = async () => {
      setLoading(true);
      try {
        const [members, payments] = await Promise.all([
          getAllMembers(),
          getAllPayments(),
        ]);

        const today = new Date().toISOString().split("T")[0];

        // Get members who attended today
        const todayAttendanceMembers = members.filter(
          (member) =>
            member.lastAttendance &&
            member.lastAttendance.split("T")[0] === today,
        );

        // Get session payments from today
        const todaySessionPayments = payments.filter(
          (payment) =>
            payment.subscriptionType === "حصة واحدة" &&
            payment.date.split("T")[0] === today,
        );

        // Create session payment members for display
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

        // Combine both types
        const allTodayAttendees = [
          ...todayAttendanceMembers,
          ...sessionPaymentMembers,
        ];

        setTodayAttendees(allTodayAttendees);
      } catch (error) {
        console.error("Error fetching today's attendees:", error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تحميل بيانات الحضور",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTodayAttendees();
  }, []);

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
    <>
      {/* Mobile Navigation */}
      <TopMobileNavigation activeItem="attendance" setActiveItem={() => {}} />

      <div className="bg-gradient-to-br from-bluegray-900 via-bluegray-800 to-bluegray-900 fixed inset-0 text-white overflow-y-auto">
        <div className="container mx-auto px-3 sm:px-4 pt-20 pb-36 sm:pb-32 lg:pt-6 lg:pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="text-white hover:bg-white/10"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  حضور اليوم
                </h1>
                <p className="text-gray-300 text-sm">
                  {formatDate(new Date().toISOString())}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-green-400 font-semibold">
                {formatNumber(todayAttendees.length)} حاضر
              </span>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300 text-sm">إجمالي الحضور</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {formatNumber(todayAttendees.length)}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-300 text-sm">أعضاء مشتركين</p>
                    <p className="text-2xl font-bold text-green-400">
                      {formatNumber(
                        todayAttendees.filter((a) => !a.isSessionPayment)
                          .length,
                      )}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-300 text-sm">حصص مؤقتة</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {formatNumber(
                        todayAttendees.filter((a) => a.isSessionPayment).length,
                      )}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendees List */}
          <Card className="bg-bluegray-800/50 backdrop-blur-xl border-bluegray-700">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-400" />
                قائمة الحضور
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : todayAttendees.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">لا يوجد حضور اليوم</p>
                  <p className="text-gray-500 text-sm">
                    لم يسجل أي عضو حضوره اليوم بعد
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayAttendees.map((attendee, index) => {
                    const hasIssues = hasPaymentIssues(attendee);
                    return (
                      <div
                        key={attendee.id || index}
                        className={`rounded-lg p-4 border ${
                          hasIssues
                            ? "bg-red-900/30 border-red-500/50 shadow-red-500/20 shadow-lg"
                            : "bg-bluegray-700/50 border-bluegray-600"
                        }`}
                      >
                        <div className="flex items-start space-x-3 space-x-reverse">
                          <Avatar className="h-12 w-12">
                            <AvatarImage
                              src={attendee.imageUrl}
                              alt={attendee.name}
                            />
                            <AvatarFallback className="bg-bluegray-600 text-white">
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
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    تحرير
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                      className="bg-bluegray-600 border-bluegray-500 text-white text-sm h-8"
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
                                      className="bg-bluegray-600 border-bluegray-500 text-white text-sm h-8"
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
                                      className="bg-bluegray-600 border-bluegray-500 text-white text-sm h-8"
                                    />
                                  </div>

                                  <div>
                                    <Label className="text-xs text-gray-400">
                                      حالة العضوية
                                    </Label>
                                    <Select
                                      value={
                                        editFormData.membershipStatus ||
                                        "active"
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
                                      <SelectTrigger className="bg-bluegray-600 border-bluegray-500 text-white text-sm h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-bluegray-700 border-bluegray-600 text-white">
                                        <SelectItem value="active">
                                          نشط
                                        </SelectItem>
                                        <SelectItem value="pending">
                                          معلق
                                        </SelectItem>
                                        <SelectItem value="expired">
                                          منتهي
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="flex gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    onClick={handleSaveAttendeeEdit}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs h-8"
                                  >
                                    <Save className="h-3 w-3 mr-1" />
                                    حفظ
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                    className="border-bluegray-500 text-gray-300 hover:bg-bluegray-600 text-xs h-8"
                                  >
                                    <Undo2 className="h-3 w-3 mr-1" />
                                    إلغاء
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // View mode
                              <>
                                <div className="flex items-center justify-between mb-2">
                                  <h3
                                    className={`text-lg font-medium truncate ${
                                      hasIssues ? "text-red-300" : "text-white"
                                    }`}
                                  >
                                    {attendee.name}
                                    {hasIssues && (
                                      <DollarSign className="h-4 w-4 text-red-400 inline ml-2" />
                                    )}
                                  </h3>
                                  <div className="flex gap-2">
                                    {hasIssues && (
                                      <Badge className="bg-red-600/80 text-red-100 text-xs border-red-500">
                                        مدفوعات معلقة
                                      </Badge>
                                    )}
                                    <Badge
                                      variant={
                                        attendee.isSessionPayment
                                          ? "secondary"
                                          : "default"
                                      }
                                      className="text-xs"
                                    >
                                      {attendee.isSessionPayment
                                        ? "حصة واحدة"
                                        : "عضو مشترك"}
                                    </Badge>
                                  </div>
                                </div>

                                <div
                                  className={`space-y-2 text-sm ${
                                    hasIssues ? "text-red-200" : "text-gray-300"
                                  }`}
                                >
                                  {attendee.phoneNumber && (
                                    <p>📱 {attendee.phoneNumber}</p>
                                  )}
                                  {attendee.email && <p>📧 {attendee.email}</p>}
                                  <p>
                                    🕐 وقت الحضور:{" "}
                                    {formatDate(attendee.lastAttendance)}
                                  </p>
                                  {!attendee.isSessionPayment &&
                                    attendee.sessionsRemaining !==
                                      undefined && (
                                      <p
                                        className={
                                          hasIssues
                                            ? "text-red-300"
                                            : "text-blue-400"
                                        }
                                      >
                                        💪 الحصص المتبقية:{" "}
                                        {formatNumber(
                                          attendee.sessionsRemaining,
                                        )}
                                      </p>
                                    )}
                                  {hasIssues && (
                                    <div className="mt-2 p-2 bg-red-800/30 rounded border border-red-600/30">
                                      <p className="text-red-300 text-xs font-medium">
                                        ⚠️ يحتاج إلى تجديد الاشتراك أو دفع
                                        المستحقات
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {!attendee.isSessionPayment && (
                                  <div className="flex gap-2 mt-4">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleEditAttendee(attendee)
                                      }
                                      className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white text-xs"
                                    >
                                      <Edit className="h-3 w-3 mr-1" />
                                      تعديل
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleRemoveAttendance(attendee)
                                      }
                                      className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white text-xs"
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      إلغاء الحضور
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNavigationComponent
        activeItem="attendance"
        setActiveItem={(item) => {
          if (onBack) onBack();
        }}
        onTodayAttendanceClick={() => {}}
        onPendingPaymentsClick={() => {
          if (onBack) onBack();
        }}
      />
    </>
  );
};

export default TodayAttendancePage;
