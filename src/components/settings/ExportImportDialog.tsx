import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Upload,
  FileText,
  Database,
  Calendar,
  Settings,
  AlertCircle,
  CheckCircle,
  X,
  Trash2,
  RotateCcw,
  Clock,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { formatNumber, formatDate } from "@/lib/utils";
import {
  exportImportService,
  ExportOptions,
  ImportOptions,
  ImportResult,
} from "@/services/exportImportService";

interface ExportImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExportImportDialog = ({ isOpen, onClose }: ExportImportDialogProps) => {
  const [activeTab, setActiveTab] = useState("export");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export options state
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeMembers: true,
    includePayments: true,
    includeActivities: true,
    includeSettings: true,
    includePassword: false,
    format: "json",
  });

  // Import options state
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    overwriteExisting: false,
    skipDuplicates: true,
    validateData: true,
    createBackup: true,
  });

  // Date range state
  const [dateRange, setDateRange] = useState({
    enabled: false,
    from: "",
    to: "",
  });

  // Available backups
  const [backups, setBackups] = useState(
    exportImportService.getAvailableBackups(),
  );

  // Handle export
  const handleExport = async () => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const options = {
        ...exportOptions,
        dateRange: dateRange.enabled
          ? { from: dateRange.from, to: dateRange.to }
          : undefined,
      };

      setProgress(30);
      const blob = await exportImportService.exportData(options);
      setProgress(70);

      // Generate filename
      const timestamp = new Date().toISOString().split("T")[0];
      const formatExt =
        options.format === "json"
          ? "json"
          : options.format === "csv"
            ? "csv"
            : "xls";
      const filename = `yacin-gym-export-${timestamp}.${formatExt}`;

      // Download file
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      toast({
        title: "تم التصدير بنجاح",
        description: `تم تحميل الملف: ${filename}`,
      });
    } catch (error) {
      toast({
        title: "خطأ في التصدير",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  // Handle import
  const handleImport = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setImportResult(null);

    try {
      setProgress(20);
      const result = await exportImportService.importData(file, importOptions);
      setProgress(100);
      setImportResult(result);

      if (result.success) {
        toast({
          title: "تم الاستيراد بنجاح",
          description: `تم استيراد ${result.imported.members} عضو، ${result.imported.payments} دفعة، ${result.imported.activities} نشاط`,
        });

        // Refresh page after successful import
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: "فشل الاستيراد",
          description: `تم العثور على ${result.errors.length} خطأ`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ في الاستيراد",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImport(file);
    }
  };

  // Handle backup restore
  const handleRestoreBackup = async (backupKey: string) => {
    if (!confirm("هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟")) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await exportImportService.restoreFromBackup(backupKey);
      if (result.success) {
        toast({
          title: "تم الاستعادة بنجاح",
          description: "تم استعادة النسخة الاحتياطية",
        });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast({
          title: "فشل الاستعادة",
          description: result.errors.join(", "),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ في الاستعادة",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle backup deletion
  const handleDeleteBackup = (backupKey: string) => {
    if (confirm("هل أنت متأكد من حذف هذه النسخة الاحتياطية؟")) {
      exportImportService.deleteBackup(backupKey);
      setBackups(exportImportService.getAvailableBackups());
      toast({
        title: "تم الحذف",
        description: "تم حذف النسخة الاحتياطية",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-bluegray-800/95 to-bluegray-900/95 backdrop-blur-xl text-white border border-bluegray-600/50 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
            <Database className="h-6 w-6 text-blue-400" />
            تصدير واستيراد البيانات
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-bluegray-700/50">
            <TabsTrigger
              value="export"
              className="data-[state=active]:bg-blue-600"
            >
              <Download className="h-4 w-4 mr-2" />
              تصدير
            </TabsTrigger>
            <TabsTrigger
              value="import"
              className="data-[state=active]:bg-green-600"
            >
              <Upload className="h-4 w-4 mr-2" />
              استيراد
            </TabsTrigger>
            <TabsTrigger
              value="backups"
              className="data-[state=active]:bg-purple-600"
            >
              <Clock className="h-4 w-4 mr-2" />
              النسخ الاحتياطية
            </TabsTrigger>
          </TabsList>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-6">
            <Card className="bg-bluegray-800/50 border-bluegray-600/50">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-400" />
                  خيارات التصدير
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Data Selection */}
                <div className="space-y-3">
                  <Label className="text-gray-300 font-medium">
                    البيانات المراد تصديرها:
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id="includeMembers"
                        checked={exportOptions.includeMembers}
                        onCheckedChange={(checked) =>
                          setExportOptions((prev) => ({
                            ...prev,
                            includeMembers: !!checked,
                          }))
                        }
                      />
                      <Label htmlFor="includeMembers" className="text-white">
                        الأعضاء
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id="includePayments"
                        checked={exportOptions.includePayments}
                        onCheckedChange={(checked) =>
                          setExportOptions((prev) => ({
                            ...prev,
                            includePayments: !!checked,
                          }))
                        }
                      />
                      <Label htmlFor="includePayments" className="text-white">
                        المدفوعات
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id="includeActivities"
                        checked={exportOptions.includeActivities}
                        onCheckedChange={(checked) =>
                          setExportOptions((prev) => ({
                            ...prev,
                            includeActivities: !!checked,
                          }))
                        }
                      />
                      <Label htmlFor="includeActivities" className="text-white">
                        الأنشطة
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id="includeSettings"
                        checked={exportOptions.includeSettings}
                        onCheckedChange={(checked) =>
                          setExportOptions((prev) => ({
                            ...prev,
                            includeSettings: !!checked,
                          }))
                        }
                      />
                      <Label htmlFor="includeSettings" className="text-white">
                        الإعدادات
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Format Selection */}
                <div className="space-y-2">
                  <Label className="text-gray-300 font-medium">
                    تنسيق الملف:
                  </Label>
                  <Select
                    value={exportOptions.format}
                    onValueChange={(value: "json" | "csv" | "excel") =>
                      setExportOptions((prev) => ({ ...prev, format: value }))
                    }
                  >
                    <SelectTrigger className="bg-bluegray-700 border-bluegray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-bluegray-700 border-bluegray-600 text-white">
                      <SelectItem value="json">JSON (موصى به)</SelectItem>
                      <SelectItem value="csv">CSV (جداول بيانات)</SelectItem>
                      <SelectItem value="excel">Excel (تقرير)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="enableDateRange"
                      checked={dateRange.enabled}
                      onCheckedChange={(checked) =>
                        setDateRange((prev) => ({
                          ...prev,
                          enabled: !!checked,
                        }))
                      }
                    />
                    <Label htmlFor="enableDateRange" className="text-white">
                      تحديد فترة زمنية
                    </Label>
                  </div>

                  {dateRange.enabled && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-gray-300 text-sm">
                          من تاريخ:
                        </Label>
                        <Input
                          type="date"
                          value={dateRange.from}
                          onChange={(e) =>
                            setDateRange((prev) => ({
                              ...prev,
                              from: e.target.value,
                            }))
                          }
                          className="bg-bluegray-700 border-bluegray-600 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300 text-sm">
                          إلى تاريخ:
                        </Label>
                        <Input
                          type="date"
                          value={dateRange.to}
                          onChange={(e) =>
                            setDateRange((prev) => ({
                              ...prev,
                              to: e.target.value,
                            }))
                          }
                          className="bg-bluegray-700 border-bluegray-600 text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Include Password */}
                {exportOptions.includeSettings && (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="includePassword"
                      checked={exportOptions.includePassword}
                      onCheckedChange={(checked) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          includePassword: !!checked,
                        }))
                      }
                    />
                    <Label htmlFor="includePassword" className="text-white">
                      تضمين كلمة المرور
                    </Label>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">جاري التصدير...</span>
                  <span className="text-blue-400">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <Button
              onClick={handleExport}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-12"
            >
              <Download className="h-4 w-4 mr-2" />
              {isProcessing ? "جاري التصدير..." : "تصدير البيانات"}
            </Button>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-6">
            <Card className="bg-bluegray-800/50 border-bluegray-600/50">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-green-400" />
                  خيارات الاستيراد
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="overwriteExisting"
                      checked={importOptions.overwriteExisting}
                      onCheckedChange={(checked) =>
                        setImportOptions((prev) => ({
                          ...prev,
                          overwriteExisting: !!checked,
                        }))
                      }
                    />
                    <Label htmlFor="overwriteExisting" className="text-white">
                      استبدال البيانات الموجودة
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="skipDuplicates"
                      checked={importOptions.skipDuplicates}
                      onCheckedChange={(checked) =>
                        setImportOptions((prev) => ({
                          ...prev,
                          skipDuplicates: !!checked,
                        }))
                      }
                    />
                    <Label htmlFor="skipDuplicates" className="text-white">
                      تخطي البيانات المكررة
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="validateData"
                      checked={importOptions.validateData}
                      onCheckedChange={(checked) =>
                        setImportOptions((prev) => ({
                          ...prev,
                          validateData: !!checked,
                        }))
                      }
                    />
                    <Label htmlFor="validateData" className="text-white">
                      التحقق من صحة البيانات
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="createBackup"
                      checked={importOptions.createBackup}
                      onCheckedChange={(checked) =>
                        setImportOptions((prev) => ({
                          ...prev,
                          createBackup: !!checked,
                        }))
                      }
                    />
                    <Label htmlFor="createBackup" className="text-white">
                      إنشاء نسخة احتياطية قبل الاستيراد
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* File Upload */}
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".json,.csv"
                className="hidden"
              />

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white h-12"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isProcessing ? "جاري الاستيراد..." : "اختيار ملف للاستيراد"}
              </Button>

              <div className="text-center text-sm text-gray-400">
                الملفات المدعومة: JSON, CSV
              </div>
            </div>

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">جاري الاستيراد...</span>
                  <span className="text-green-400">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Import Results */}
            {importResult && (
              <Card
                className={`border ${importResult.success ? "border-green-500/50 bg-green-500/10" : "border-red-500/50 bg-red-500/10"}`}
              >
                <CardHeader>
                  <CardTitle
                    className={`text-lg flex items-center gap-2 ${importResult.success ? "text-green-400" : "text-red-400"}`}
                  >
                    {importResult.success ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                    {importResult.success
                      ? "تم الاستيراد بنجاح"
                      : "فشل الاستيراد"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">
                        {formatNumber(importResult.imported.members)}
                      </div>
                      <div className="text-sm text-gray-300">أعضاء</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {formatNumber(importResult.imported.payments)}
                      </div>
                      <div className="text-sm text-gray-300">مدفوعات</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">
                        {formatNumber(importResult.imported.activities)}
                      </div>
                      <div className="text-sm text-gray-300">أنشطة</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">
                        {importResult.imported.settings ? "✓" : "✗"}
                      </div>
                      <div className="text-sm text-gray-300">إعدادات</div>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-red-400 font-medium">الأخطاء:</h4>
                      <ul className="text-sm text-red-300 space-y-1">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {importResult.warnings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-yellow-400 font-medium">تحذيرات:</h4>
                      <ul className="text-sm text-yellow-300 space-y-1">
                        {importResult.warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Backups Tab */}
          <TabsContent value="backups" className="space-y-6">
            <Card className="bg-bluegray-800/50 border-bluegray-600/50">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-400" />
                  النسخ الاحتياطية المتاحة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {backups.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">لا توجد نسخ احتياطية</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {backups.map((backup) => (
                      <div
                        key={backup.key}
                        className="flex items-center justify-between p-3 bg-bluegray-700/50 rounded-lg border border-bluegray-600/50"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-purple-400" />
                          <div>
                            <div className="text-white font-medium">
                              {backup.date}
                            </div>
                            <div className="text-sm text-gray-400">
                              {backup.size}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestoreBackup(backup.key)}
                            className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            استعادة
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteBackup(backup.key)}
                            className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-bluegray-600 text-gray-300 hover:bg-bluegray-700"
          >
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportImportDialog;
