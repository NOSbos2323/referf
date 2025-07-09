import localforage from "localforage";

// Database health check and maintenance service
export class DatabaseService {
  private static instance: DatabaseService;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Check database health
  async checkDatabaseHealth(): Promise<{
    isHealthy: boolean;
    issues: string[];
    stats: {
      membersCount: number;
      paymentsCount: number;
      activitiesCount: number;
    };
  }> {
    const issues: string[] = [];
    let membersCount = 0;
    let paymentsCount = 0;
    let activitiesCount = 0;

    try {
      // Check members database
      const membersDB = localforage.createInstance({
        name: "gym-tracker",
        storeName: "members",
      });

      const memberKeys = await membersDB.keys();
      membersCount = memberKeys.length;

      // Check for corrupted member records
      let corruptedMembers = 0;
      await membersDB.iterate((value: any) => {
        if (!value || typeof value !== "object" || !value.id || !value.name) {
          corruptedMembers++;
        }
      });

      if (corruptedMembers > 0) {
        issues.push(`${corruptedMembers} سجل عضو تالف`);
      }

      // Check payments database
      const paymentsDB = localforage.createInstance({
        name: "gym-tracker",
        storeName: "payments",
      });

      const paymentKeys = await paymentsDB.keys();
      paymentsCount = paymentKeys.length;

      // Check for corrupted payment records
      let corruptedPayments = 0;
      await paymentsDB.iterate((value: any) => {
        if (
          !value ||
          typeof value !== "object" ||
          !value.id ||
          !value.memberId ||
          !value.amount
        ) {
          corruptedPayments++;
        }
      });

      if (corruptedPayments > 0) {
        issues.push(`${corruptedPayments} سجل دفع تالف`);
      }

      // Check activities database
      const activitiesDB = localforage.createInstance({
        name: "gym-tracker",
        storeName: "activities",
      });

      const activityKeys = await activitiesDB.keys();
      activitiesCount = activityKeys.length;

      // Check for corrupted activity records
      let corruptedActivities = 0;
      await activitiesDB.iterate((value: any) => {
        if (
          !value ||
          typeof value !== "object" ||
          !value.timestamp ||
          !value.memberId
        ) {
          corruptedActivities++;
        }
      });

      if (corruptedActivities > 0) {
        issues.push(`${corruptedActivities} سجل نشاط تالف`);
      }
    } catch (error) {
      issues.push(`خطأ في الوصول لقاعدة البيانات: ${error}`);
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      stats: {
        membersCount,
        paymentsCount,
        activitiesCount,
      },
    };
  }

  // Clean up corrupted records
  async cleanupDatabase(): Promise<{
    success: boolean;
    cleaned: {
      members: number;
      payments: number;
      activities: number;
    };
    errors: string[];
  }> {
    const cleaned = { members: 0, payments: 0, activities: 0 };
    const errors: string[] = [];

    try {
      // Clean members
      const membersDB = localforage.createInstance({
        name: "gym-tracker",
        storeName: "members",
      });

      const corruptedMemberKeys: string[] = [];
      await membersDB.iterate((value: any, key: string) => {
        if (!value || typeof value !== "object" || !value.id || !value.name) {
          corruptedMemberKeys.push(key);
        }
      });

      for (const key of corruptedMemberKeys) {
        await membersDB.removeItem(key);
        cleaned.members++;
      }

      // Clean payments
      const paymentsDB = localforage.createInstance({
        name: "gym-tracker",
        storeName: "payments",
      });

      const corruptedPaymentKeys: string[] = [];
      await paymentsDB.iterate((value: any, key: string) => {
        if (
          !value ||
          typeof value !== "object" ||
          !value.id ||
          !value.memberId ||
          !value.amount
        ) {
          corruptedPaymentKeys.push(key);
        }
      });

      for (const key of corruptedPaymentKeys) {
        await paymentsDB.removeItem(key);
        cleaned.payments++;
      }

      // Clean activities
      const activitiesDB = localforage.createInstance({
        name: "gym-tracker",
        storeName: "activities",
      });

      const corruptedActivityKeys: string[] = [];
      await activitiesDB.iterate((value: any, key: string) => {
        if (
          !value ||
          typeof value !== "object" ||
          !value.timestamp ||
          !value.memberId
        ) {
          corruptedActivityKeys.push(key);
        }
      });

      for (const key of corruptedActivityKeys) {
        await activitiesDB.removeItem(key);
        cleaned.activities++;
      }
    } catch (error) {
      errors.push(`خطأ في تنظيف قاعدة البيانات: ${error}`);
    }

    return {
      success: errors.length === 0,
      cleaned,
      errors,
    };
  }

  // Optimize database (remove old activities)
  async optimizeDatabase(): Promise<{
    success: boolean;
    optimized: {
      oldActivitiesRemoved: number;
    };
    errors: string[];
  }> {
    const optimized = { oldActivitiesRemoved: 0 };
    const errors: string[] = [];

    try {
      const activitiesDB = localforage.createInstance({
        name: "gym-tracker",
        storeName: "activities",
      });

      // Remove activities older than 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const oldActivityKeys: string[] = [];
      await activitiesDB.iterate((value: any, key: string) => {
        if (value && value.timestamp) {
          const activityDate = new Date(value.timestamp);
          if (activityDate < threeMonthsAgo) {
            oldActivityKeys.push(key);
          }
        }
      });

      for (const key of oldActivityKeys) {
        await activitiesDB.removeItem(key);
        optimized.oldActivitiesRemoved++;
      }
    } catch (error) {
      errors.push(`خطأ في تحسين قاعدة البيانات: ${error}`);
    }

    return {
      success: errors.length === 0,
      optimized,
      errors,
    };
  }

  // Get database size estimate
  async getDatabaseSize(): Promise<{
    estimatedSizeKB: number;
    breakdown: {
      members: number;
      payments: number;
      activities: number;
    };
  }> {
    let totalSize = 0;
    const breakdown = { members: 0, payments: 0, activities: 0 };

    try {
      // Estimate members size
      const membersDB = localforage.createInstance({
        name: "gym-tracker",
        storeName: "members",
      });

      await membersDB.iterate((value: any) => {
        if (value) {
          const size = JSON.stringify(value).length;
          breakdown.members += size;
          totalSize += size;
        }
      });

      // Estimate payments size
      const paymentsDB = localforage.createInstance({
        name: "gym-tracker",
        storeName: "payments",
      });

      await paymentsDB.iterate((value: any) => {
        if (value) {
          const size = JSON.stringify(value).length;
          breakdown.payments += size;
          totalSize += size;
        }
      });

      // Estimate activities size
      const activitiesDB = localforage.createInstance({
        name: "gym-tracker",
        storeName: "activities",
      });

      await activitiesDB.iterate((value: any) => {
        if (value) {
          const size = JSON.stringify(value).length;
          breakdown.activities += size;
          totalSize += size;
        }
      });
    } catch (error) {
      console.error("Error calculating database size:", error);
    }

    return {
      estimatedSizeKB: Math.round(totalSize / 1024),
      breakdown: {
        members: Math.round(breakdown.members / 1024),
        payments: Math.round(breakdown.payments / 1024),
        activities: Math.round(breakdown.activities / 1024),
      },
    };
  }
}

export const databaseService = DatabaseService.getInstance();
