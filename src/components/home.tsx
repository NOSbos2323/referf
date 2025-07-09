import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatisticsOverview from "./dashboard/StatisticsOverview";
import AttendanceChart from "./dashboard/AttendanceChart";
import RecentActivities from "./dashboard/RecentActivities";
import MembersList from "./attendance/MembersList";
import TodayAttendancePage from "./attendance/TodayAttendancePage";
import PendingPaymentsPage from "./payments/PendingPaymentsPage";
import SimpleTodayAttendancePage from "./attendance/SimpleTodayAttendancePage";
import QrScannerDialog from "./attendance/QrScannerDialog";
import TopMobileNavigation from "./layout/TopMobileNavigation";
import MobileNavigationComponent from "./layout/MobileNavigation";
import SettingsPage from "./settings/SettingsPage";
import PaymentForm from "./payments/PaymentForm";
import PaymentsList from "./payments/PaymentsList";
import PaymentsPage from "./payments/PaymentsPage";
import ReportsPage from "./reports/ReportsPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Home,
  Users,
  CreditCard,
  BarChart3,
  Search,
  LogOut,
  Activity,
  TrendingUp,
  Calendar,
  DollarSign,
} from "lucide-react";

import { formatNumber } from "@/lib/utils";
import {
  getAllMembers,
  addActivity,
  resetMemberSessions,
  searchAndFilterMembers,
  addMember,
  Member,
} from "@/services/memberService";
import { addSessionPayment } from "@/services/paymentService";
import { toast } from "@/components/ui/use-toast";
import MemberDialog from "./attendance/MemberDialog";

const BackgroundBlob = ({ className }: { className?: string }) => (
  <motion.div
    className={`absolute rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-3xl ${className}`}
    animate={{
      x: [0, 20, 0],
      y: [0, 30, 0],
      scale: [1, 1.1, 1],
    }}
    transition={{
      duration: 12,
      repeat: Infinity,
      repeatType: "reverse",
    }}
  >
    <div className="w-[600px] h-[400px]"></div>
  </motion.div>
);

const SidebarItem = ({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) => (
  <motion.div
    className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-300 ${active ? "bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-blue-400/30 shadow-lg" : "hover:bg-white/10 hover:border hover:border-white/20"}`}
    whileHover={{ scale: 1.02, x: 5 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
  >
    <div
      className={`${active ? "text-blue-300" : "text-gray-300"} transition-colors duration-300`}
    >
      {icon}
    </div>
    <span
      className={`font-semibold text-sm ${active ? "bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent" : "text-gray-300"} transition-all duration-300`}
    >
      {label}
    </span>
  </motion.div>
);

const Sidebar = ({
  activeItem,
  setActiveItem,
}: {
  activeItem: string;
  setActiveItem: (item: string) => void;
}) => {
  return (
    <Card className="h-full w-72 bg-gradient-to-b from-bluegray-800/80 to-bluegray-900/80 backdrop-blur-xl border border-bluegray-600/50 shadow-2xl overflow-hidden hidden lg:block">
      <div className="p-6 flex flex-col h-full">
        {/* Logo Section */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
            <img
              src="/yacin-gym-logo.png"
              alt="Yacin Gym"
              className="w-12 h-12 rounded-full object-cover"
            />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            Yacin Gym
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            نظام إدارة الصالة الرياضية
          </p>
        </div>

        {/* Navigation Items */}
        <div className="space-y-3 flex-1">
          <SidebarItem
            icon={<Home size={22} />}
            label="الرئيسية"
            active={activeItem === "dashboard"}
            onClick={() => setActiveItem("dashboard")}
          />
          <SidebarItem
            icon={<Users size={22} />}
            label="الأعضاء"
            active={activeItem === "attendance"}
            onClick={() => setActiveItem("attendance")}
          />
          <SidebarItem
            icon={<CreditCard size={22} />}
            label="المدفوعات"
            active={activeItem === "payments"}
            onClick={() => setActiveItem("payments")}
          />
          <SidebarItem
            icon={<BarChart3 size={22} />}
            label="التقارير"
            active={activeItem === "reports"}
            onClick={() => setActiveItem("reports")}
          />
        </div>

        {/* Footer */}
        <div className="mt-auto pt-6 border-t border-bluegray-600/50">
          <div className="text-center text-xs text-gray-500">
            <p>© 2024 Yacin Gym</p>
            <p className="mt-1">الإصدار 1.0</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

const HomePage = () => {
  // Check if we just logged in and remove the flag
  React.useEffect(() => {
    const loginSuccess = localStorage.getItem("loginSuccess");
    if (loginSuccess) {
      localStorage.removeItem("loginSuccess");
    }
  }, []);
  const [activeTab, setActiveTab] = React.useState("dashboard");
  const [showTodayAttendance, setShowTodayAttendance] = React.useState(false);
  const [showPendingPayments, setShowPendingPayments] = React.useState(false);
  const [showAddSessionDialog, setShowAddSessionDialog] = React.useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = React.useState(false);
  const [showSettingsPage, setShowSettingsPage] = React.useState(false);

  // Listen for custom events from settings page
  React.useEffect(() => {
    const handleOpenAddSession = () => {
      setShowAddSessionDialog(true);
    };

    const handleOpenAddMember = () => {
      setShowAddMemberDialog(true);
    };

    window.addEventListener("openAddSessionDialog", handleOpenAddSession);
    window.addEventListener("openAddMemberDialog", handleOpenAddMember);

    return () => {
      window.removeEventListener("openAddSessionDialog", handleOpenAddSession);
      window.removeEventListener("openAddMemberDialog", handleOpenAddMember);
    };
  }, []);

  // Play success sound function
  const playSuccessSound = async () => {
    try {
      const audio = new Audio("/success-sound.mp3");
      audio.volume = 0.7;
      await audio.play();
    } catch (error) {
      // Fallback beep sound
      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.3,
        );
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (fallbackError) {
        console.error("Sound failed:", fallbackError);
      }
    }
  };

  // Get current session price from settings
  const getCurrentSessionPrice = () => {
    const savedPricing = localStorage.getItem("gymPricingSettings");
    if (savedPricing) {
      try {
        const pricing = JSON.parse(savedPricing);
        return pricing.singleSession || 200;
      } catch (error) {
        console.error("Error loading pricing:", error);
      }
    }
    return 200;
  };

  // Handle add session function
  const handleAddSession = async () => {
    try {
      const { payment, memberId } = await addSessionPayment("عضو مؤقت");
      const sessionPrice = getCurrentSessionPrice();

      toast({
        title: "تم بنجاح",
        description: `تم تسجيل حصة واحدة - ${formatNumber(sessionPrice)} دج`,
      });

      playSuccessSound();
    } catch (error) {
      console.error("Error adding session:", error);
      const errorMessage =
        error instanceof Error ? error.message : "حدث خطأ أثناء تسجيل الحصة";
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setShowAddSessionDialog(false);
    }
  };

  // Handle add member function
  const handleAddMember = async (memberData: Partial<Member>) => {
    try {
      const newMember = await addMember(memberData as Omit<Member, "id">);
      setShowAddMemberDialog(false);
      toast({
        title: "تمت الإضافة",
        description: `تم إضافة ${newMember.name} بنجاح`,
      });
      playSuccessSound();
    } catch (error) {
      console.error("Error adding member:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة العضو",
        variant: "destructive",
      });
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-bluegray-900 via-bluegray-800 to-bluegray-900 relative overflow-hidden text-white">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <BackgroundBlob className="w-[800px] h-[600px] -top-40 -left-40 opacity-30" />
        <BackgroundBlob className="w-[600px] h-[400px] -bottom-20 -right-20 opacity-40" />
        <BackgroundBlob className="w-[400px] h-[300px] top-1/3 left-1/3 opacity-20" />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-bluegray-900/20 to-bluegray-800/40" />

        {/* Animated Grid */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>
      </div>
      <div className="relative z-10 container mx-auto px-2 sm:px-4 py-4 sm:py-6 lg:py-8 flex h-screen">
        {/* Enhanced Sidebar */}
        <div className="mr-4 lg:mr-6 hidden lg:block">
          <Sidebar activeItem={activeTab} setActiveItem={setActiveTab} />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto pb-36 sm:pb-32 lg:pb-6 pt-16 lg:pt-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            defaultValue="dashboard"
            className="w-full h-full"
          >
            {/* Enhanced Desktop Tab Navigation */}
            <TabsList className="mb-8 bg-gradient-to-r from-bluegray-800/80 to-bluegray-700/80 backdrop-blur-xl border border-bluegray-600/50 shadow-xl hidden md:flex rounded-2xl p-2">
              <TabsTrigger
                value="dashboard"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/30 data-[state=active]:to-purple-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-6 py-3 font-semibold transition-all duration-300"
              >
                <Home className="w-4 h-4 mr-2" />
                الرئيسية
              </TabsTrigger>
              <TabsTrigger
                value="attendance"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/30 data-[state=active]:to-purple-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-6 py-3 font-semibold transition-all duration-300"
              >
                <Users className="w-4 h-4 mr-2" />
                الأعضاء
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/30 data-[state=active]:to-purple-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-6 py-3 font-semibold transition-all duration-300"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                المدفوعات
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/30 data-[state=active]:to-purple-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-6 py-3 font-semibold transition-all duration-300"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                التقارير
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Content */}
            <TabsContent value="dashboard" className="space-y-8 mt-0">
              {/* Welcome Header - Mobile Optimized */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center lg:text-right mb-6 sm:mb-8"
              >
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-yellow-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                  مرحباً بك في Yacin Gym
                </h1>
                <p className="text-gray-300 text-sm lg:text-base">
                  نظام إدارة شامل لصالتك الرياضية
                </p>
              </motion.div>
              {/* Statistics Overview */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <StatisticsOverview />
              </motion.div>
              {/* Charts and Activities Grid - Mobile Optimized */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8"
              >
                {/* Attendance Chart */}
                <div className="order-2 xl:order-1">
                  <AttendanceChart />
                </div>

                {/* Recent Activities */}
                <div className="order-1 xl:order-2">
                  <RecentActivities limit={6} />
                </div>
              </motion.div>
              {/* Quick Actions - Mobile Optimized */}
            </TabsContent>

            <TabsContent value="attendance" className="mt-0">
              <MembersList />
            </TabsContent>

            <TabsContent value="payments" className="mt-0">
              <PaymentsPage />
            </TabsContent>

            <TabsContent value="reports" className="mt-0">
              <ReportsPage />
            </TabsContent>

            <TabsContent value="today-attendance" className="mt-0">
              <SimpleTodayAttendancePage />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      {/* Mobile Navigation */}
      <TopMobileNavigation
        activeItem={activeTab}
        setActiveItem={setActiveTab}
        onSettingsClick={() => setShowSettingsPage(true)}
      />
      <MobileNavigationComponent
        activeItem={activeTab}
        setActiveItem={(item) => {
          setActiveTab(item);
          setShowTodayAttendance(false);
          setShowPendingPayments(false);
        }}
        onTodayAttendanceClick={() => setShowTodayAttendance(true)}
        onPendingPaymentsClick={() => setShowPendingPayments(true)}
        onAddSessionClick={() => setShowAddSessionDialog(true)}
        onAddMemberClick={() => setShowAddMemberDialog(true)}
      />
      {/* Today's Attendance Page */}
      {showTodayAttendance && (
        <div className="fixed inset-0 z-40 bg-bluegray-900">
          <TodayAttendancePage onBack={() => setShowTodayAttendance(false)} />
        </div>
      )}
      {/* Pending Payments Page */}
      {showPendingPayments && (
        <div className="fixed inset-0 z-40 bg-bluegray-900">
          <PendingPaymentsPage onBack={() => setShowPendingPayments(false)} />
        </div>
      )}
      {/* Settings Page */}
      {showSettingsPage && (
        <div className="fixed inset-0 z-40 bg-bluegray-900">
          <SettingsPage
            onBack={() => setShowSettingsPage(false)}
            onNavigate={(page) => {
              setShowSettingsPage(false);
              if (page === "today-attendance") {
                setShowTodayAttendance(true);
              } else if (page === "pending-payments") {
                setShowPendingPayments(true);
              } else {
                setActiveTab(page);
              }
            }}
          />
        </div>
      )}
      {/* Add Session Dialog */}
      <Dialog
        open={showAddSessionDialog}
        onOpenChange={setShowAddSessionDialog}
      >
        <DialogContent className="bg-bluegray-800 text-white border-bluegray-700 max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              إضافة حصة واحدة
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-green-400 font-semibold">
                سعر الحصة الواحدة: {formatNumber(getCurrentSessionPrice())} دج
              </p>
            </div>

            <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-blue-400">هل أنت متأكد من إضافة حصة واحدة؟</p>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddSessionDialog(false)}
              className="border-bluegray-600 text-gray-300 hover:bg-bluegray-700"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAddSession}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
            >
              تسجيل الحصة - {formatNumber(getCurrentSessionPrice())} دج
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add Member Dialog */}
      <MemberDialog
        isOpen={showAddMemberDialog}
        onClose={() => setShowAddMemberDialog(false)}
        onSave={handleAddMember}
        title="إضافة عضو جديد"
      />
      {/* Add padding to account for top and bottom navigation bars on mobile */}
      <div className="pt-16 pb-32 lg:pt-0 lg:pb-0 md:hidden" />
    </div>
  );
};

export default HomePage;
