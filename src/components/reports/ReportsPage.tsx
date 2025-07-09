import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Download,
  FileText,
  PieChart,
} from "lucide-react";
import { getAllMembers } from "@/services/memberService";
import { getPaymentStatistics } from "@/services/paymentService";
import { formatNumber, formatDate } from "@/lib/utils";

const ReportsPage = () => {
  const [timeRange, setTimeRange] = useState("month");
  const [reportType, setReportType] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    todayAttendance: 0,
    weeklyAttendance: 0,
  });

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const [members, paymentStats] = await Promise.all([
          getAllMembers(),
          getPaymentStatistics(),
        ]);

        const today = new Date().toISOString().split("T")[0];
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const todayAttendance = members.filter(
          (m) => m.lastAttendance && m.lastAttendance.split("T")[0] === today,
        ).length;

        const weeklyAttendance = members.filter((m) => {
          if (!m.lastAttendance) return false;
          const attendanceDate = new Date(m.lastAttendance);
          return attendanceDate >= oneWeekAgo;
        }).length;

        setStats({
          totalMembers: members.length,
          activeMembers: members.filter((m) => m.membershipStatus === "active")
            .length,
          totalRevenue: paymentStats.totalRevenue,
          monthlyRevenue: paymentStats.monthRevenue,
          todayAttendance,
          weeklyAttendance,
        });
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [timeRange]);

  const StatCard = ({
    title,
    value,
    icon,
    color = "blue",
    trend,
  }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color?: string;
    trend?: string;
  }) => {
    const colorClasses = {
      blue: "from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400 bg-gradient-to-br from-bluegray-800/80 to-bluegray-900/80 backdrop-blur-xl shadow-2xl hover:shadow-3xl hover:border-blue-400/50",
      green:
        "from-green-500/20 to-green-600/20 border-green-500/30 text-green-400 bg-gradient-to-br from-bluegray-800/80 to-bluegray-900/80 backdrop-blur-xl shadow-2xl hover:shadow-3xl hover:border-green-400/50",
      purple:
        "from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400 bg-gradient-to-br from-bluegray-800/80 to-bluegray-900/80 backdrop-blur-xl shadow-2xl hover:shadow-3xl hover:border-purple-400/50",
      yellow:
        "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 text-yellow-400 bg-gradient-to-br from-bluegray-800/80 to-bluegray-900/80 backdrop-blur-xl shadow-2xl hover:shadow-3xl hover:border-yellow-400/50",
    };

    return (
      <Card
        className={`${colorClasses[color as keyof typeof colorClasses]} border transition-all duration-500 hover:scale-105`}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300 mb-2">{title}</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                {typeof value === "number" ? formatNumber(value) : value}
              </p>
              {trend && (
                <p className="text-xs text-gray-400 mt-2 font-medium">
                  {trend}
                </p>
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            التقارير والإحصائيات
          </h1>
          <p className="text-gray-300 mt-2 text-lg">
            تحليل شامل لأداء الصالة الرياضية
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 bg-bluegray-700/50 border-bluegray-600/50 text-white backdrop-blur-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-bluegray-800 border-bluegray-600 text-white backdrop-blur-xl">
              <SelectItem value="week">هذا الأسبوع</SelectItem>
              <SelectItem value="month">هذا الشهر</SelectItem>
              <SelectItem value="quarter">هذا الربع</SelectItem>
              <SelectItem value="year">هذا العام</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-gradient-to-r from-yellow-500 to-blue-600 hover:from-yellow-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <Download className="h-4 w-4 mr-2" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الأعضاء"
          value={stats.totalMembers}
          icon={<Users className="h-8 w-8" />}
          color="blue"
          trend={`${stats.activeMembers} نشط`}
        />
        <StatCard
          title="إجمالي الإيرادات"
          value={`${formatNumber(stats.totalRevenue)} دج`}
          icon={<DollarSign className="h-8 w-8" />}
          color="green"
          trend={`${formatNumber(stats.monthlyRevenue)} دج هذا الشهر`}
        />
        <StatCard
          title="حضور اليوم"
          value={stats.todayAttendance}
          icon={<Calendar className="h-8 w-8" />}
          color="purple"
          trend={`${stats.weeklyAttendance} هذا الأسبوع`}
        />
        <StatCard
          title="معدل النمو"
          value="+12%"
          icon={<TrendingUp className="h-8 w-8" />}
          color="yellow"
          trend="مقارنة بالشهر الماضي"
        />
      </div>

      {/* Detailed Reports */}
      <Tabs value={reportType} onValueChange={setReportType} className="w-full">
        <TabsList className="bg-bluegray-700/50 backdrop-blur-xl border border-bluegray-600/30 rounded-2xl p-2">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/30 data-[state=active]:to-blue-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300 text-gray-300"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/30 data-[state=active]:to-blue-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300 text-gray-300"
          >
            <Users className="h-4 w-4 mr-2" />
            الحضور
          </TabsTrigger>
          <TabsTrigger
            value="revenue"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/30 data-[state=active]:to-blue-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300 text-gray-300"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            الإيرادات
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/30 data-[state=active]:to-blue-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300 text-gray-300"
          >
            <PieChart className="h-4 w-4 mr-2" />
            الأعضاء
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-bluegray-800/80 to-bluegray-900/80 backdrop-blur-xl border border-bluegray-600/50 shadow-2xl hover:shadow-3xl transition-all duration-500">
              <CardHeader className="border-b border-bluegray-600/50 bg-gradient-to-r from-bluegray-800/50 to-bluegray-700/30">
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-yellow-400" />
                  أداء الحضور
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">رسم بياني للحضور</p>
                    <p className="text-gray-500 text-sm">قريباً</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bluegray-800/50 backdrop-blur-xl border-bluegray-700">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  نمو الإيرادات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">رسم بياني للإيرادات</p>
                    <p className="text-gray-500 text-sm">قريباً</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <Card className="bg-gradient-to-br from-bluegray-800/80 to-bluegray-900/80 backdrop-blur-xl border border-bluegray-600/50 shadow-2xl hover:shadow-3xl transition-all duration-500">
            <CardHeader className="border-b border-bluegray-600/50 bg-gradient-to-r from-bluegray-800/50 to-bluegray-700/30">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                تقرير الحضور المفصل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">تقرير الحضور</p>
                <p className="text-gray-500 text-sm">
                  تحليل مفصل لأنماط الحضور قريباً
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card className="bg-bluegray-800/50 backdrop-blur-xl border-bluegray-700">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                تقرير الإيرادات المفصل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">تقرير الإيرادات</p>
                <p className="text-gray-500 text-sm">
                  تحليل مفصل للإيرادات والمدفوعات قريباً
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <Card className="bg-bluegray-800/50 backdrop-blur-xl border-bluegray-700">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-400" />
                تحليل الأعضاء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <PieChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">تحليل الأعضاء</p>
                <p className="text-gray-500 text-sm">
                  إحصائيات مفصلة عن الأعضاء قريباً
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
