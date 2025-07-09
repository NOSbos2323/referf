import React, { useState, useEffect } from "react";
import {
  Phone,
  Calendar,
  DollarSign,
  CreditCard,
  Edit,
  Save,
  X,
} from "lucide-react";
import { getAllMembers, Member, updateMember } from "@/services/memberService";
import { formatDate, formatNumber } from "@/lib/utils";
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
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import TopMobileNavigation from "../layout/TopMobileNavigation";
import MobileNavigationComponent from "../layout/MobileNavigation";

interface PendingPaymentsPageProps {
  onBack?: () => void;
}

const PendingPaymentsPage = ({ onBack }: PendingPaymentsPageProps) => {
  const [unpaidMembers, setUnpaidMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    subscriptionType: string;
    subscriptionPrice: number;
    paymentStatus: "paid" | "unpaid" | "partial";
    membershipStatus: "active" | "expired" | "pending";
    sessionsRemaining: number;
  }>({} as any);

  // Helper function to hide notification dot for a member
  const hideNotificationDot = (memberId: string) => {
    const seenNotifications = JSON.parse(
      localStorage.getItem("seenMemberNotifications") || "[]",
    );
    if (!seenNotifications.includes(memberId)) {
      seenNotifications.push(memberId);
      localStorage.setItem(
        "seenMemberNotifications",
        JSON.stringify(seenNotifications),
      );
    }
  };

  useEffect(() => {
    const fetchUnpaidMembers = async () => {
      setLoading(true);
      try {
        const members = await getAllMembers();

        // Filter members with pending payments or expired subscriptions
        const unpaidMembersList = members.filter((member) => {
          const hasUnpaidStatus =
            member.paymentStatus === "unpaid" ||
            member.paymentStatus === "partial";
          const hasPendingMembership = member.membershipStatus === "pending";
          const hasZeroSessions =
            member.sessionsRemaining !== undefined &&
            member.sessionsRemaining === 0;

          // Check if subscription has ended based on membership type
          // Only check date expiration for time-based memberships (not session-based)
          const hasExpiredSubscription = (() => {
            if (!member.membershipStartDate || !member.membershipType)
              return false;

            // Skip date-based expiration for session-based subscriptions
            if (
              member.subscriptionType === "13 حصة" ||
              member.subscriptionType === "15 حصة" ||
              member.subscriptionType === "30 حصة"
            ) {
              return false; // Only check sessions remaining for these types
            }

            const startDate = new Date(member.membershipStartDate);
            const currentDate = new Date();

            if (member.membershipType === "نصف شهري") {
              // For bi-weekly membership, add 15 days
              const fifteenDaysLater = new Date(startDate);
              fifteenDaysLater.setDate(fifteenDaysLater.getDate() + 15);
              return currentDate > fifteenDaysLater;
            } else {
              // For monthly membership, add one month
              const oneMonthLater = new Date(startDate);
              oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
              return currentDate > oneMonthLater;
            }
          })();

          return (
            hasUnpaidStatus ||
            hasPendingMembership ||
            hasZeroSessions ||
            hasExpiredSubscription
          );
        });

        setUnpaidMembers(unpaidMembersList);
      } catch (error) {
        console.error("Error fetching unpaid members:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUnpaidMembers();
  }, []);

  // Handle edit member
  const handleEditMember = (member: Member) => {
    setEditingMember(member.id);
    setEditFormData({
      subscriptionType: member.subscriptionType || "13 حصة",
      subscriptionPrice: member.subscriptionPrice || 1500,
      paymentStatus: member.paymentStatus || "unpaid",
      membershipStatus: member.membershipStatus || "pending",
      sessionsRemaining: member.sessionsRemaining || 0,
    });
  };

  // Handle save member edit
  const handleSaveMemberEdit = async () => {
    if (!editingMember) return;

    try {
      const memberToUpdate = unpaidMembers.find((m) => m.id === editingMember);
      if (!memberToUpdate) return;

      // Calculate sessions based on subscription type
      let newSessionsRemaining = editFormData.sessionsRemaining;
      if (editFormData.subscriptionType === "13 حصة") {
        newSessionsRemaining = 13;
      } else if (editFormData.subscriptionType === "15 حصة") {
        newSessionsRemaining = 15;
      } else if (editFormData.subscriptionType === "30 حصة") {
        newSessionsRemaining = 30;
      }

      const updatedMember: Member = {
        ...memberToUpdate,
        subscriptionType: editFormData.subscriptionType as any,
        subscriptionPrice: editFormData.subscriptionPrice,
        paymentStatus: editFormData.paymentStatus,
        membershipStatus: editFormData.membershipStatus,
        sessionsRemaining: newSessionsRemaining,
        membershipStartDate: new Date().toISOString().split("T")[0], // Set new start date
        membershipEndDate: (() => {
          const endDate = new Date();
          if (editFormData.subscriptionType === "نصف شهري") {
            endDate.setDate(endDate.getDate() + 15); // Add 15 days for bi-weekly
          } else {
            endDate.setMonth(endDate.getMonth() + 1); // Add one month for monthly
          }
          return endDate.toISOString().split("T")[0];
        })(),
      };

      await updateMember(updatedMember);

      // Update local state
      setUnpaidMembers((prev) =>
        prev
          .map((member) =>
            member.id === editingMember ? updatedMember : member,
          )
          .filter((member) => {
            // Remove from unpaid list if payment status is now paid and membership is active
            if (updatedMember.id === member.id) {
              return !(
                updatedMember.paymentStatus === "paid" &&
                updatedMember.membershipStatus === "active"
              );
            }
            return true;
          }),
      );

      setEditingMember(null);
      setEditFormData({} as any);

      toast({
        title: "تم التحديث",
        description: "تم تحديث بيانات العضو بنجاح",
      });
    } catch (error) {
      console.error("Error updating member:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث البيانات",
        variant: "destructive",
      });
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingMember(null);
    setEditFormData({} as any);
  };

  return (
    <>
      {/* Mobile Navigation */}
      <TopMobileNavigation activeItem="payments" setActiveItem={() => {}} />

      <div className="bg-gradient-to-br from-bluegray-900 via-bluegray-800 to-bluegray-900 fixed inset-0 text-white overflow-y-auto">
        <div className="container mx-auto px-3 sm:px-4 pt-20 pb-36 sm:pb-32 lg:pt-6 lg:pb-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-red-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : unpaidMembers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-green-400 text-lg">لا توجد مدفوعات معلقة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {unpaidMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-bluegray-800/50 backdrop-blur-xl border border-bluegray-700 rounded-lg p-4"
                >
                  {editingMember === member.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-white">
                          تعديل بيانات {member.name}
                        </h3>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveMemberEdit}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            حفظ
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            <X className="h-4 w-4 mr-1" />
                            إلغاء
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Subscription Type */}
                        <div>
                          <Label className="text-gray-300 text-sm mb-2 block">
                            نوع الاشتراك
                          </Label>
                          <Select
                            value={editFormData.subscriptionType}
                            onValueChange={(value) =>
                              setEditFormData((prev) => ({
                                ...prev,
                                subscriptionType: value,
                              }))
                            }
                          >
                            <SelectTrigger className="bg-bluegray-700 border-bluegray-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-bluegray-700 border-bluegray-600 text-white">
                              <SelectItem value="13 حصة">13 حصة</SelectItem>
                              <SelectItem value="15 حصة">15 حصة</SelectItem>
                              <SelectItem value="30 حصة">30 حصة</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Subscription Price */}
                        <div>
                          <Label className="text-gray-300 text-sm mb-2 block">
                            ثمن الاشتراك (دج)
                          </Label>
                          <Input
                            type="number"
                            value={editFormData.subscriptionPrice}
                            onChange={(e) =>
                              setEditFormData((prev) => ({
                                ...prev,
                                subscriptionPrice:
                                  parseInt(e.target.value) || 0,
                              }))
                            }
                            className="bg-bluegray-700 border-bluegray-600 text-white"
                          />
                        </div>

                        {/* Payment Status */}
                        <div>
                          <Label className="text-gray-300 text-sm mb-2 block">
                            حالة الدفع
                          </Label>
                          <Select
                            value={editFormData.paymentStatus}
                            onValueChange={(
                              value: "paid" | "unpaid" | "partial",
                            ) =>
                              setEditFormData((prev) => ({
                                ...prev,
                                paymentStatus: value,
                              }))
                            }
                          >
                            <SelectTrigger className="bg-bluegray-700 border-bluegray-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-bluegray-700 border-bluegray-600 text-white">
                              <SelectItem value="paid">مدفوع</SelectItem>
                              <SelectItem value="unpaid">غير مدفوع</SelectItem>
                              <SelectItem value="partial">
                                مدفوع جزئياً
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Membership Status */}
                        <div>
                          <Label className="text-gray-300 text-sm mb-2 block">
                            حالة العضوية
                          </Label>
                          <Select
                            value={editFormData.membershipStatus}
                            onValueChange={(
                              value: "active" | "expired" | "pending",
                            ) =>
                              setEditFormData((prev) => ({
                                ...prev,
                                membershipStatus: value,
                              }))
                            }
                          >
                            <SelectTrigger className="bg-bluegray-700 border-bluegray-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-bluegray-700 border-bluegray-600 text-white">
                              <SelectItem value="active">نشط</SelectItem>
                              <SelectItem value="pending">معلق</SelectItem>
                              <SelectItem value="expired">منتهي</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="space-y-3 relative">
                      {/* Blue notification dot for new members (added today) */}
                      {(() => {
                        const today = new Date().toISOString().split("T")[0];
                        const memberCreatedToday =
                          member.membershipStartDate === today;
                        const seenNotifications = JSON.parse(
                          localStorage.getItem("seenMemberNotifications") ||
                            "[]",
                        );
                        const notificationSeen = seenNotifications.includes(
                          member.id,
                        );
                        return (
                          memberCreatedToday &&
                          !notificationSeen && (
                            <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-bluegray-800 z-10">
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            </div>
                          )
                        );
                      })()}
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-white">
                          {member.name}
                        </h3>
                        <div className="flex items-center gap-3">
                          {member.phoneNumber && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-blue-400" />
                              <span className="text-white font-medium">
                                {member.phoneNumber}
                              </span>
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Hide the blue notification dot when member card is clicked
                              hideNotificationDot(member.id);
                              handleEditMember(member);
                            }}
                            className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            تعديل
                          </Button>
                        </div>
                      </div>

                      {/* Subscription Price */}
                      {member.subscriptionPrice && (
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-green-400" />
                          <span className="text-green-300 text-sm font-semibold">
                            ثمن الاشتراك:{" "}
                            {formatNumber(member.subscriptionPrice)} دج
                          </span>
                        </div>
                      )}

                      {/* Subscription Type */}
                      {member.subscriptionType && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-purple-400" />
                          <span className="text-purple-300 text-sm">
                            نوع الاشتراك: {member.subscriptionType}
                          </span>
                        </div>
                      )}

                      {/* Sessions Remaining */}
                      {member.sessionsRemaining !== undefined && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-400" />
                          <span className="text-blue-300 text-sm">
                            الحصص المتبقية:{" "}
                            {formatNumber(member.sessionsRemaining)}
                          </span>
                        </div>
                      )}

                      {member.membershipStartDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-yellow-400" />
                          <span className="text-gray-300 text-sm">
                            تاريخ الاشتراك:{" "}
                            {formatDate(member.membershipStartDate)}
                          </span>
                        </div>
                      )}

                      {/* Payment Status Badge */}
                      <div className="flex items-center gap-2">
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            member.paymentStatus === "unpaid"
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : member.paymentStatus === "partial"
                                ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                                : "bg-green-500/20 text-green-300 border border-green-500/30"
                          }`}
                        >
                          {member.paymentStatus === "unpaid" && "غير مدفوع"}
                          {member.paymentStatus === "partial" && "مدفوع جزئياً"}
                          {member.paymentStatus === "paid" && "مدفوع"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNavigationComponent
        activeItem="payments"
        setActiveItem={(item) => {
          if (onBack) onBack();
        }}
        onTodayAttendanceClick={() => {
          if (onBack) onBack();
        }}
        onPendingPaymentsClick={() => {}}
      />

      {/* Toast Notifications */}
      <Toaster />
    </>
  );
};

export default PendingPaymentsPage;
