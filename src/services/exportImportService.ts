import localforage from "localforage";
import {
  getAllMembers,
  addOrUpdateMemberWithId,
  MemberActivity,
  addOrUpdateActivityWithId,
} from "./memberService";
import { getAllPayments, addOrUpdatePaymentWithId } from "./paymentService";
import { formatNumber, formatDate } from "@/lib/utils";

export interface ExportData {
  version: string;
  timestamp: string;
  metadata: {
    totalMembers: number;
    totalPayments: number;
    totalActivities: number;
    exportedBy: string;
    gymName: string;
  };
  data: {
    members: any[];
    payments: any[];
    activities: any[];
    settings: {
      pricing: any;
      user: any;
      password?: string;
    };
  };
}

export interface ImportResult {
  success: boolean;
  imported: {
    members: number;
    payments: number;
    activities: number;
    settings: boolean;
  };
  errors: string[];
  warnings: string[];
}

export interface ExportOptions {
  includeMembers: boolean;
  includePayments: boolean;
  includeActivities: boolean;
  includeSettings: boolean;
  includePassword: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
  format: "json" | "csv" | "excel";
}

export interface ImportOptions {
  overwriteExisting: boolean;
  skipDuplicates: boolean;
  validateData: boolean;
  createBackup: boolean;
}

class ExportImportService {
  private readonly EXPORT_VERSION = "2.0";
  private readonly SUPPORTED_VERSIONS = ["1.0", "2.0"];

  // Enhanced export with multiple formats and options
  async exportData(options: ExportOptions): Promise<Blob> {
    try {
      const exportData: ExportData = {
        version: this.EXPORT_VERSION,
        timestamp: new Date().toISOString(),
        metadata: {
          totalMembers: 0,
          totalPayments: 0,
          totalActivities: 0,
          exportedBy: this.getCurrentUser(),
          gymName: "Yacin Gym",
        },
        data: {
          members: [],
          payments: [],
          activities: [],
          settings: {
            pricing: {},
            user: {},
          },
        },
      };

      // Export members
      if (options.includeMembers) {
        const members = await getAllMembers();
        exportData.data.members = this.filterByDateRange(
          members,
          options.dateRange,
          "membershipStartDate",
        );
        exportData.metadata.totalMembers = exportData.data.members.length;
      }

      // Export payments
      if (options.includePayments) {
        const payments = await getAllPayments();
        exportData.data.payments = this.filterByDateRange(
          payments,
          options.dateRange,
          "date",
        );
        exportData.metadata.totalPayments = exportData.data.payments.length;
      }

      // Export activities
      if (options.includeActivities) {
        const activities = await this.getAllActivities();
        exportData.data.activities = this.filterByDateRange(
          activities,
          options.dateRange,
          "timestamp",
        );
        exportData.metadata.totalActivities = exportData.data.activities.length;
      }

      // Export settings
      if (options.includeSettings) {
        exportData.data.settings = {
          pricing: JSON.parse(
            localStorage.getItem("gymPricingSettings") || "{}",
          ),
          user: JSON.parse(localStorage.getItem("gymUserSettings") || "{}"),
        };

        if (options.includePassword) {
          exportData.data.settings.password =
            localStorage.getItem("gymPassword") || "ADMIN";
        }
      }

      // Generate file based on format
      switch (options.format) {
        case "json":
          return new Blob([JSON.stringify(exportData, null, 2)], {
            type: "application/json",
          });
        case "csv":
          return this.generateCSV(exportData);
        case "excel":
          return this.generateExcel(exportData);
        default:
          throw new Error("تنسيق التصدير غير مدعوم");
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      throw new Error("فشل في تصدير البيانات: " + (error as Error).message);
    }
  }

  // Enhanced import with validation and options
  async importData(file: File, options: ImportOptions): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: {
        members: 0,
        payments: 0,
        activities: 0,
        settings: false,
      },
      errors: [],
      warnings: [],
    };

    try {
      // Create backup if requested
      if (options.createBackup) {
        await this.createBackup();
      }

      const fileContent = await this.readFile(file);
      let importData: ExportData;

      // Parse file based on extension
      if (file.name.endsWith(".json")) {
        importData = JSON.parse(fileContent);
      } else if (file.name.endsWith(".csv")) {
        importData = await this.parseCSV(fileContent);
      } else {
        throw new Error("تنسيق الملف غير مدعوم. يرجى استخدام JSON أو CSV");
      }

      // Validate data structure
      if (options.validateData) {
        const validationErrors = this.validateImportData(importData);
        if (validationErrors.length > 0) {
          result.errors = validationErrors;
          return result;
        }
      }

      // Check version compatibility
      if (
        importData.version &&
        !this.SUPPORTED_VERSIONS.includes(importData.version)
      ) {
        result.warnings.push(
          `إصدار الملف (${importData.version}) قد لا يكون متوافق تماماً`,
        );
      }

      // Import members
      if (importData.data.members && importData.data.members.length > 0) {
        for (const member of importData.data.members) {
          try {
            if (
              options.skipDuplicates &&
              (await this.memberExists(member.id))
            ) {
              continue;
            }
            await addOrUpdateMemberWithId(member);
            result.imported.members++;
          } catch (error) {
            result.errors.push(
              `خطأ في استيراد العضو ${member.name}: ${(error as Error).message}`,
            );
          }
        }
      }

      // Import payments
      if (importData.data.payments && importData.data.payments.length > 0) {
        for (const payment of importData.data.payments) {
          try {
            if (
              options.skipDuplicates &&
              (await this.paymentExists(payment.id))
            ) {
              continue;
            }
            await addOrUpdatePaymentWithId(payment);
            result.imported.payments++;
          } catch (error) {
            result.errors.push(
              `خطأ في استيراد الدفعة ${payment.id}: ${(error as Error).message}`,
            );
          }
        }
      }

      // Import activities
      if (importData.data.activities && importData.data.activities.length > 0) {
        for (const activity of importData.data.activities) {
          try {
            if (
              options.skipDuplicates &&
              (await this.activityExists(activity.id))
            ) {
              continue;
            }
            await addOrUpdateActivityWithId(activity);
            result.imported.activities++;
          } catch (error) {
            result.errors.push(
              `خطأ في استيراد النشاط ${activity.id}: ${(error as Error).message}`,
            );
          }
        }
      }

      // Import settings
      if (importData.data.settings) {
        try {
          if (importData.data.settings.pricing) {
            localStorage.setItem(
              "gymPricingSettings",
              JSON.stringify(importData.data.settings.pricing),
            );
          }
          if (importData.data.settings.user) {
            localStorage.setItem(
              "gymUserSettings",
              JSON.stringify(importData.data.settings.user),
            );
          }
          if (importData.data.settings.password) {
            localStorage.setItem(
              "gymPassword",
              importData.data.settings.password,
            );
          }
          result.imported.settings = true;
        } catch (error) {
          result.errors.push(
            `خطأ في استيراد الإعدادات: ${(error as Error).message}`,
          );
        }
      }

      result.success =
        result.errors.length === 0 ||
        result.imported.members > 0 ||
        result.imported.payments > 0 ||
        result.imported.activities > 0;

      return result;
    } catch (error) {
      result.errors.push(`خطأ عام في الاستيراد: ${(error as Error).message}`);
      return result;
    }
  }

  // Generate CSV format
  private generateCSV(data: ExportData): Blob {
    let csvContent = "";

    // Members CSV
    if (data.data.members.length > 0) {
      csvContent += "=== الأعضاء ===\n";
      csvContent +=
        "الاسم,حالة العضوية,آخر حضور,رقم الهاتف,البريد الإلكتروني,نوع الاشتراك,الحصص المتبقية,حالة الدفع\n";

      data.data.members.forEach((member) => {
        csvContent += `"${member.name}","${member.membershipStatus}","${formatDate(member.lastAttendance)}","${member.phoneNumber || ""}","${member.email || ""}","${member.subscriptionType || ""}","${member.sessionsRemaining || 0}","${member.paymentStatus || ""}"\n`;
      });
      csvContent += "\n";
    }

    // Payments CSV
    if (data.data.payments.length > 0) {
      csvContent += "=== المدفوعات ===\n";
      csvContent +=
        "المبلغ,التاريخ,نوع الاشتراك,طريقة الدفع,الحالة,رقم الفاتورة\n";

      data.data.payments.forEach((payment) => {
        csvContent += `"${formatNumber(payment.amount)}","${formatDate(payment.date)}","${payment.subscriptionType}","${payment.paymentMethod}","${payment.status || ""}","${payment.invoiceNumber || ""}"\n`;
      });
      csvContent += "\n";
    }

    return new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  }

  // Generate Excel format (simplified HTML table)
  private generateExcel(data: ExportData): Blob {
    let htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #f2f2f2; font-weight: bold; }
            h2 { color: #333; }
          </style>
        </head>
        <body>
          <h1>تقرير بيانات نادي ياسين الرياضي</h1>
          <p>تاريخ التصدير: ${formatDate(data.timestamp)}</p>
    `;

    // Members table
    if (data.data.members.length > 0) {
      htmlContent += `
        <h2>الأعضاء (${data.metadata.totalMembers})</h2>
        <table>
          <tr>
            <th>الاسم</th>
            <th>حالة العضوية</th>
            <th>آخر حضور</th>
            <th>رقم الهاتف</th>
            <th>البريد الإلكتروني</th>
            <th>نوع الاشتراك</th>
            <th>الحصص المتبقية</th>
            <th>حالة الدفع</th>
          </tr>
      `;

      data.data.members.forEach((member) => {
        htmlContent += `
          <tr>
            <td>${member.name}</td>
            <td>${member.membershipStatus}</td>
            <td>${formatDate(member.lastAttendance)}</td>
            <td>${member.phoneNumber || ""}</td>
            <td>${member.email || ""}</td>
            <td>${member.subscriptionType || ""}</td>
            <td>${member.sessionsRemaining || 0}</td>
            <td>${member.paymentStatus || ""}</td>
          </tr>
        `;
      });
      htmlContent += "</table>";
    }

    // Payments table
    if (data.data.payments.length > 0) {
      htmlContent += `
        <h2>المدفوعات (${data.metadata.totalPayments})</h2>
        <table>
          <tr>
            <th>المبلغ</th>
            <th>التاريخ</th>
            <th>نوع الاشتراك</th>
            <th>طريقة الدفع</th>
            <th>الحالة</th>
            <th>رقم الفاتورة</th>
          </tr>
      `;

      data.data.payments.forEach((payment) => {
        htmlContent += `
          <tr>
            <td>${formatNumber(payment.amount)} دج</td>
            <td>${formatDate(payment.date)}</td>
            <td>${payment.subscriptionType}</td>
            <td>${payment.paymentMethod}</td>
            <td>${payment.status || ""}</td>
            <td>${payment.invoiceNumber || ""}</td>
          </tr>
        `;
      });
      htmlContent += "</table>";
    }

    htmlContent += "</body></html>";

    return new Blob([htmlContent], { type: "application/vnd.ms-excel" });
  }

  // Parse CSV file
  private async parseCSV(content: string): Promise<ExportData> {
    // This is a simplified CSV parser - in a real implementation,
    // you'd want to use a proper CSV parsing library
    throw new Error("استيراد CSV غير مدعوم حالياً. يرجى استخدام ملف JSON");
  }

  // Utility functions
  private filterByDateRange(
    data: any[],
    dateRange?: { from: string; to: string },
    dateField: string = "date",
  ): any[] {
    if (!dateRange) return data;

    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);

    return data.filter((item) => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= fromDate && itemDate <= toDate;
    });
  }

  private getCurrentUser(): string {
    try {
      const user = JSON.parse(localStorage.getItem("gymUserSettings") || "{}");
      return user.username || "ADMIN";
    } catch {
      return "ADMIN";
    }
  }

  private async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error("فشل في قراءة الملف"));
      reader.readAsText(file);
    });
  }

  private validateImportData(data: any): string[] {
    const errors: string[] = [];

    if (!data || typeof data !== "object") {
      errors.push("بنية الملف غير صحيحة");
      return errors;
    }

    if (!data.data) {
      errors.push("لا توجد بيانات في الملف");
      return errors;
    }

    // Validate members
    if (data.data.members && Array.isArray(data.data.members)) {
      data.data.members.forEach((member: any, index: number) => {
        if (!member.id || !member.name) {
          errors.push(`العضو رقم ${index + 1}: معرف أو اسم مفقود`);
        }
      });
    }

    // Validate payments
    if (data.data.payments && Array.isArray(data.data.payments)) {
      data.data.payments.forEach((payment: any, index: number) => {
        if (!payment.id || !payment.amount) {
          errors.push(`الدفعة رقم ${index + 1}: معرف أو مبلغ مفقود`);
        }
      });
    }

    return errors;
  }

  private async memberExists(id: string): Promise<boolean> {
    const membersDB = localforage.createInstance({
      name: "gym-tracker",
      storeName: "members",
    });
    const member = await membersDB.getItem(id);
    return member !== null;
  }

  private async paymentExists(id: string): Promise<boolean> {
    const paymentsDB = localforage.createInstance({
      name: "gym-tracker",
      storeName: "payments",
    });
    const payment = await paymentsDB.getItem(id);
    return payment !== null;
  }

  private async activityExists(id: string): Promise<boolean> {
    const activitiesDB = localforage.createInstance({
      name: "gym-tracker",
      storeName: "activities",
    });
    const activity = await activitiesDB.getItem(id);
    return activity !== null;
  }

  private async getAllActivities(): Promise<MemberActivity[]> {
    const activitiesDB = localforage.createInstance({
      name: "gym-tracker",
      storeName: "activities",
    });

    const activities: MemberActivity[] = [];
    await activitiesDB.iterate((value: MemberActivity) => {
      if (value && typeof value === "object" && value.timestamp) {
        activities.push(value);
      }
    });

    return activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  private async createBackup(): Promise<void> {
    const backupOptions: ExportOptions = {
      includeMembers: true,
      includePayments: true,
      includeActivities: true,
      includeSettings: true,
      includePassword: true,
      format: "json",
    };

    const backupBlob = await this.exportData(backupOptions);
    const backupKey = `backup_${Date.now()}`;

    // Store backup in localStorage (simplified - in production, you might want to use IndexedDB)
    const reader = new FileReader();
    reader.onload = () => {
      localStorage.setItem(backupKey, reader.result as string);
    };
    reader.readAsText(backupBlob);
  }

  // Get available backups
  getAvailableBackups(): Array<{ key: string; date: string; size: string }> {
    const backups: Array<{ key: string; date: string; size: string }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("backup_")) {
        const timestamp = key.replace("backup_", "");
        const date = new Date(parseInt(timestamp));
        const data = localStorage.getItem(key);
        const size = data ? `${Math.round(data.length / 1024)} KB` : "0 KB";

        backups.push({
          key,
          date: formatDate(date.toISOString()),
          size,
        });
      }
    }

    return backups.sort((a, b) => b.key.localeCompare(a.key));
  }

  // Restore from backup
  async restoreFromBackup(backupKey: string): Promise<ImportResult> {
    const backupData = localStorage.getItem(backupKey);
    if (!backupData) {
      throw new Error("النسخة الاحتياطية غير موجودة");
    }

    const backupFile = new File([backupData], "backup.json", {
      type: "application/json",
    });
    const importOptions: ImportOptions = {
      overwriteExisting: true,
      skipDuplicates: false,
      validateData: true,
      createBackup: false, // Don't create backup when restoring
    };

    return await this.importData(backupFile, importOptions);
  }

  // Delete backup
  deleteBackup(backupKey: string): void {
    localStorage.removeItem(backupKey);
  }
}

export const exportImportService = new ExportImportService();
