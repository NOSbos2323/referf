import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Users,
  CreditCard,
  BarChart3,
  QrCode,
  LogOut,
  Calendar,
  DollarSign,
  Plus,
  Settings,
  X,
  User,
  Database,
  Tag,
  Search,
} from "lucide-react";
import QrScannerDialog from "../attendance/QrScannerDialog";
import { getAllMembers } from "@/services/memberService";

interface MobileNavigationProps {
  activeItem: string;
  setActiveItem: (item: string) => void;
  onTodayAttendanceClick?: () => void;
  onPendingPaymentsClick?: () => void;
  onAddSessionClick?: () => void;
  onAddMemberClick?: () => void;
}

const MobileNavigation = ({
  activeItem,
  setActiveItem,
  onTodayAttendanceClick = () => {},
  onPendingPaymentsClick = () => {},
  onAddSessionClick = () => {},
  onAddMemberClick = () => {},
}: MobileNavigationProps) => {
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsSidebarOpen, setIsSettingsSidebarOpen] = useState(false);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [hasNewPendingPayments, setHasNewPendingPayments] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleScan = (data: string) => {
    console.log("QR Code scanned:", data);
    // Handle the scanned data here
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleSearch = () => {
    // Navigate to members page and activate search
    setActiveItem("attendance");
    // Trigger search mode in members page
    setTimeout(() => {
      const searchInput = document.querySelector(
        'input[placeholder*="بحث"]',
      ) as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.click();
      }
    }, 100);
  };

  const closeSearch = () => {
    setIsSearchActive(false);
    setSearchQuery("");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log("Searching for:", searchQuery);
      // Implement search functionality here
    }
  };

  // Auto-focus search input when activated
  useEffect(() => {
    if (isSearchActive && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchActive]);

  // Check for pending payments with new member detection system
  useEffect(() => {
    const checkPendingPayments = async () => {
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

        const currentCount = unpaidMembersList.length;
        const currentMemberIds = unpaidMembersList
          .map((member) => member.id)
          .sort();

        setPendingPaymentsCount(currentCount);

        // Get previously seen member IDs
        const previousMemberIds = JSON.parse(
          localStorage.getItem("seenPendingMemberIds") || "[]",
        );

        // Check for new members in the pending list
        const newMemberIds = currentMemberIds.filter(
          (id) => !previousMemberIds.includes(id),
        );

        // Check if user has manually dismissed the notification
        const notificationDismissed =
          localStorage.getItem("pendingPaymentsNotificationSeen") === "true";

        // Get the timestamp of last dismissal
        const lastDismissalTime = localStorage.getItem(
          "pendingPaymentsLastDismissed",
        );
        const currentTime = Date.now();

        if (currentCount === 0) {
          // Reset all notification states when no pending payments
          localStorage.removeItem("pendingPaymentsNotificationSeen");
          localStorage.removeItem("seenPendingMemberIds");
          localStorage.removeItem("pendingPaymentsLastDismissed");
          setHasNewPendingPayments(false);
        } else if (newMemberIds.length > 0) {
          // New members detected in pending list - show blue dot
          localStorage.removeItem("pendingPaymentsNotificationSeen");
          localStorage.removeItem("pendingPaymentsLastDismissed");
          setHasNewPendingPayments(true);
        } else if (notificationDismissed && lastDismissalTime) {
          // Check if enough time has passed since last dismissal (24 hours)
          const timeSinceLastDismissal =
            currentTime - parseInt(lastDismissalTime);
          const twentyFourHours = 24 * 60 * 60 * 1000;

          if (timeSinceLastDismissal > twentyFourHours && currentCount > 0) {
            // Show notification again after 24 hours if there are still pending payments
            localStorage.removeItem("pendingPaymentsNotificationSeen");
            setHasNewPendingPayments(true);
          } else {
            setHasNewPendingPayments(false);
          }
        } else {
          // Show blue dot if there are pending payments and notification hasn't been dismissed
          setHasNewPendingPayments(!notificationDismissed && currentCount > 0);
        }

        // Update the seen member IDs list (only when there are pending members)
        if (currentCount > 0) {
          localStorage.setItem(
            "seenPendingMemberIds",
            JSON.stringify(currentMemberIds),
          );
        }
      } catch (error) {
        console.error("Error checking pending payments:", error);
        setPendingPaymentsCount(0);
        setHasNewPendingPayments(false);
      }
    };

    checkPendingPayments();

    // Check every 30 seconds for updates
    const interval = setInterval(checkPendingPayments, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Settings Sidebar */}
      <AnimatePresence>
        {isSettingsSidebarOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsSettingsSidebarOpen(false)}
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-gradient-to-br from-bluegray-800/95 to-bluegray-900/95 backdrop-blur-xl shadow-2xl z-50 border-r border-bluegray-600/50 overflow-y-auto"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                    الإعدادات
                  </h2>
                  <button
                    onClick={() => setIsSettingsSidebarOpen(false)}
                    className="p-2 rounded-full bg-bluegray-700/50 hover:bg-bluegray-600 transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>

                {/* Pricing Section */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Tag className="h-5 w-5 text-yellow-400" />
                    <h3 className="text-lg font-semibold text-white">
                      الأسعار
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-bluegray-700/50 rounded-lg p-4 border border-bluegray-600/50">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">حصة واحدة</span>
                        <span className="text-yellow-400 font-semibold">
                          200 دج
                        </span>
                      </div>
                    </div>
                    <div className="bg-bluegray-700/50 rounded-lg p-4 border border-bluegray-600/50">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">13 حصة</span>
                        <span className="text-yellow-400 font-semibold">
                          1,500 دج
                        </span>
                      </div>
                    </div>
                    <div className="bg-bluegray-700/50 rounded-lg p-4 border border-bluegray-600/50">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">15 حصة</span>
                        <span className="text-yellow-400 font-semibold">
                          1,800 دج
                        </span>
                      </div>
                    </div>
                    <div className="bg-bluegray-700/50 rounded-lg p-4 border border-bluegray-600/50">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">30 حصة</span>
                        <span className="text-yellow-400 font-semibold">
                          1,800 دج
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Settings Section */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <User className="h-5 w-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">
                      الإعدادات الشخصية
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <button className="w-full bg-bluegray-700/50 hover:bg-bluegray-600/50 rounded-lg p-4 border border-bluegray-600/50 text-right transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">تغيير كلمة المرور</span>
                        <span className="text-blue-400">›</span>
                      </div>
                    </button>
                    <button className="w-full bg-bluegray-700/50 hover:bg-bluegray-600/50 rounded-lg p-4 border border-bluegray-600/50 text-right transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">معلومات الحساب</span>
                        <span className="text-blue-400">›</span>
                      </div>
                    </button>
                    <button className="w-full bg-bluegray-700/50 hover:bg-bluegray-600/50 rounded-lg p-4 border border-bluegray-600/50 text-right transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">إعدادات الإشعارات</span>
                        <span className="text-blue-400">›</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Data Settings Section */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Database className="h-5 w-5 text-green-400" />
                    <h3 className="text-lg font-semibold text-white">
                      إعدادات البيانات
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <button className="w-full bg-bluegray-700/50 hover:bg-bluegray-600/50 rounded-lg p-4 border border-bluegray-600/50 text-right transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">
                          نسخ احتياطي للبيانات
                        </span>
                        <span className="text-green-400">›</span>
                      </div>
                    </button>
                    <button className="w-full bg-bluegray-700/50 hover:bg-bluegray-600/50 rounded-lg p-4 border border-bluegray-600/50 text-right transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">استيراد البيانات</span>
                        <span className="text-green-400">›</span>
                      </div>
                    </button>
                    <button className="w-full bg-bluegray-700/50 hover:bg-bluegray-600/50 rounded-lg p-4 border border-bluegray-600/50 text-right transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">تصدير البيانات</span>
                        <span className="text-green-400">›</span>
                      </div>
                    </button>
                    <button className="w-full bg-red-600/20 hover:bg-red-600/30 rounded-lg p-4 border border-red-500/50 text-right transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-red-300">مسح جميع البيانات</span>
                        <span className="text-red-400">›</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg p-4 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center justify-center gap-2">
                    <LogOut className="h-5 w-5" />
                    <span>تسجيل الخروج</span>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Logout button moved to top navigation */}
      <QrScannerDialog
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScan={handleScan}
      />
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-br from-bluegray-800/95 to-bluegray-900/95 backdrop-blur-xl border-t border-bluegray-500/50 shadow-2xl lg:hidden z-50 pointer-events-auto">
        {/* Enhanced gradient background */}
        <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/5 via-blue-500/5 to-purple-500/5" />

        <div className="relative flex justify-around items-center px-1 sm:px-2 py-3 sm:py-4 pb-8 sm:pb-10 safe-area-bottom">
          <motion.div
            className={`flex flex-col items-center p-1.5 sm:p-2 rounded-xl min-w-[45px] sm:min-w-[50px] transition-all duration-200 ${activeItem === "dashboard" ? "bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-blue-400/30 shadow-lg" : "hover:bg-white/10 hover:shadow-md"}`}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setActiveItem("dashboard")}
          >
            <Home
              size={16}
              className={`sm:w-5 sm:h-5 ${
                activeItem === "dashboard" ? "text-blue-300" : "text-gray-300"
              }`}
            />
            <span
              className={`text-[9px] sm:text-xs mt-0.5 sm:mt-1 font-medium ${activeItem === "dashboard" ? "text-blue-300" : "text-gray-300"}`}
            >
              الرئيسية
            </span>
          </motion.div>
          <motion.div
            className={`flex flex-col items-center p-1.5 sm:p-2 rounded-xl min-w-[45px] sm:min-w-[50px] transition-all duration-200 ${activeItem === "attendance" ? "bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-blue-400/30 shadow-lg" : "hover:bg-white/10 hover:shadow-md"}`}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setActiveItem("attendance")}
          >
            <Users
              size={16}
              className={`sm:w-5 sm:h-5 ${
                activeItem === "attendance" ? "text-blue-300" : "text-gray-300"
              }`}
            />
            <span
              className={`text-[9px] sm:text-xs mt-0.5 sm:mt-1 font-medium ${activeItem === "attendance" ? "text-blue-300" : "text-gray-300"}`}
            >
              الأعضاء
            </span>
          </motion.div>
          <motion.div
            className={`flex flex-col items-center p-1.5 sm:p-2 rounded-xl min-w-[45px] sm:min-w-[50px] transition-all duration-200 ${activeItem === "today-attendance" ? "bg-gradient-to-r from-green-500/30 to-emerald-500/30 border border-green-400/30 shadow-lg" : "hover:bg-white/10 hover:shadow-md"}`}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setActiveItem("today-attendance")}
          >
            <Calendar
              size={16}
              className={`sm:w-5 sm:h-5 ${
                activeItem === "today-attendance"
                  ? "text-green-300"
                  : "text-gray-300"
              }`}
            />
            <span
              className={`text-[9px] sm:text-xs mt-0.5 sm:mt-1 font-medium ${activeItem === "today-attendance" ? "text-green-300" : "text-gray-300"}`}
            >
              الحضور
            </span>
          </motion.div>
          {/* Today's Attendance Button */}
          {/* Floating Action Buttons - Positioned higher above menu bar */}
          <div className="absolute -top-20 sm:-top-24 inset-x-0 flex justify-center items-center gap-3 z-20 pointer-events-none">
            {/* Add Session Button */}
            <motion.div
              className="p-3 sm:p-4 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-2xl border-2 border-white/30 pointer-events-auto backdrop-blur-sm"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onAddSessionClick}
            >
              <Plus size={18} className="sm:w-5 sm:h-5 text-white" />
            </motion.div>
            {/* Search Button - Larger */}
            <motion.div
              className="p-4 sm:p-5 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-2xl border-2 border-white/30 pointer-events-auto backdrop-blur-sm"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSearch}
            >
              <Search size={24} className="sm:w-7 sm:h-7 text-white" />
            </motion.div>
            {/* Add Member Button */}
            <motion.div
              className="p-3 sm:p-4 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-2xl border-2 border-white/30 pointer-events-auto backdrop-blur-sm"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onAddMemberClick}
            >
              <Users size={18} className="sm:w-5 sm:h-5 text-white" />
            </motion.div>
          </div>
          <motion.div
            className={`flex flex-col items-center p-1.5 sm:p-2 rounded-xl min-w-[45px] sm:min-w-[50px] transition-all duration-200 ${activeItem === "payments" ? "bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-blue-400/30 shadow-lg" : "hover:bg-white/10 hover:shadow-md"}`}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setActiveItem("payments")}
          >
            <CreditCard
              size={16}
              className={`sm:w-5 sm:h-5 ${
                activeItem === "payments" ? "text-blue-300" : "text-gray-300"
              }`}
            />
            <span
              className={`text-[9px] sm:text-xs mt-0.5 sm:mt-1 font-medium ${activeItem === "payments" ? "text-blue-300" : "text-gray-300"}`}
            >
              المدفوعات
            </span>
          </motion.div>
          {/* Rebuilt Pending Payments Button with Enhanced Memory */}
          <motion.div
            className="relative flex flex-col items-center p-1.5 sm:p-2 rounded-xl min-w-[45px] sm:min-w-[50px] bg-gradient-to-r from-red-500/30 to-red-600/30 border border-red-400/40 transition-all duration-300 hover:from-red-500/40 hover:to-red-600/40 shadow-lg hover:shadow-xl backdrop-blur-sm"
            whileTap={{ scale: 0.85 }}
            whileHover={{ scale: 1.08 }}
            onClick={() => {
              // Immediately hide blue dot and remember the dismissal
              setHasNewPendingPayments(false);

              // Store dismissal markers with timestamp
              const currentTimestamp = Date.now().toString();
              localStorage.setItem("pendingPaymentsNotificationSeen", "true");
              localStorage.setItem(
                "pendingPaymentsLastDismissed",
                currentTimestamp,
              );

              // Mark current session as having clicked the button
              sessionStorage.setItem(
                "pendingPaymentsClickedThisSession",
                "true",
              );

              // Execute the callback
              onPendingPaymentsClick();
            }}
          >
            {/* Enhanced Notification Badge */}
            {pendingPaymentsCount > 0 && <></>}

            {/* Enhanced Icon with subtle animation */}
            <motion.div
              animate={
                hasNewPendingPayments ? { scale: [1, 1.1, 1] } : { scale: 1 }
              }
              transition={{
                duration: 2,
                repeat: hasNewPendingPayments ? Infinity : 0,
              }}
            >
              <DollarSign size={16} className="sm:w-5 sm:h-5 text-red-300" />
            </motion.div>

            <span className="text-[9px] sm:text-xs mt-0.5 sm:mt-1 font-medium text-red-300">
              معلقة
            </span>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default MobileNavigation;
