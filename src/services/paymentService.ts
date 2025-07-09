import localforage from "localforage";
import { Member } from "./memberService";
import { formatNumber, formatDate } from "@/lib/utils";

export interface Payment {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  subscriptionType: string;
  paymentMethod: "cash" | "card" | "transfer";
  notes?: string;
  status?: "completed" | "pending" | "cancelled";
  invoiceNumber?: string;
  receiptUrl?: string;
}

export interface MemberActivity {
  id?: string;
  memberId: string;
  memberName?: string;
  memberImage?: string;
  activityType: "check-in" | "membership-renewal" | "payment" | "other";
  timestamp: string;
  details: string;
}

// Initialize the databases with better configuration
const paymentsDB = localforage.createInstance({
  name: "gym-tracker",
  storeName: "payments",
  driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
  version: 1.0,
  description: "Gym payments database",
});

const activitiesDB = localforage.createInstance({
  name: "gym-tracker",
  storeName: "activities",
  driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
  version: 1.0,
  description: "Gym activities database",
});

// Initialize database without sample data
const initPaymentsDB = async () => {
  // Database is ready to use without any sample data
  return;
};

// Get all payments with error handling
export const getAllPayments = async (): Promise<Payment[]> => {
  try {
    await initPaymentsDB();
    const payments: Payment[] = [];
    await paymentsDB.iterate((value: Payment) => {
      if (value && typeof value === "object" && value.id) {
        payments.push(value);
      }
    });
    return payments.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  } catch (error) {
    console.warn("تحذير: مشكلة في تحميل بيانات المدفوعات:", error);
    return [];
  }
};

// Get payments by member ID
export const getPaymentsByMemberId = async (
  memberId: string,
): Promise<Payment[]> => {
  const allPayments = await getAllPayments();
  return allPayments.filter((payment) => payment.memberId === memberId);
};

// Get a payment by ID
export const getPaymentById = async (id: string): Promise<Payment | null> => {
  return await paymentsDB.getItem(id);
};

// Add a new payment with validation
export const addPayment = async (
  payment: Omit<Payment, "id">,
): Promise<Payment> => {
  try {
    if (!payment.memberId) {
      throw new Error("معرف العضو مطلوب");
    }

    if (!payment.amount || payment.amount <= 0) {
      throw new Error("مبلغ الدفع يجب أن يكون أكبر من صفر");
    }

    const id = Date.now().toString();
    const invoiceNumber = `INV-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")}`;

    const newPayment = {
      ...payment,
      id,
      status: payment.status || "completed",
      invoiceNumber,
      date: payment.date || new Date().toISOString(),
      paymentMethod: payment.paymentMethod || "cash",
      subscriptionType: payment.subscriptionType || "غير محدد",
    };

    await paymentsDB.setItem(id, newPayment);

    // Import here to avoid circular dependency
    const { getMemberById, addActivity, resetMemberSessions } = await import(
      "./memberService"
    );

    // Add payment activity if we have member info
    if (payment.memberId) {
      const member = await getMemberById(payment.memberId);
      if (member) {
        await addActivity({
          memberId: member.id,
          memberName: member.name,
          memberImage: member.imageUrl,
          activityType: "payment",
          timestamp: new Date().toISOString(),
          details: `دفع ${formatNumber(payment.amount)} دج - ${payment.subscriptionType}`,
        });

        // Reset member sessions when payment is completed
        if (newPayment.status === "completed") {
          await resetMemberSessions(payment.memberId);
        }
      }
    }

    return newPayment;
  } catch (error) {
    console.error("Error adding payment:", error);
    throw error;
  }
};

// Update a payment
export const updatePayment = async (payment: Payment): Promise<Payment> => {
  const updatedPayment = {
    ...payment,
    // Preserve original date and invoice number if they exist
    date: payment.date || new Date().toISOString(),
    invoiceNumber:
      payment.invoiceNumber ||
      `INV-${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0")}`,
    status: payment.status || "completed",
  };

  await paymentsDB.setItem(payment.id, updatedPayment);
  return updatedPayment;
};

// Add or update payment with specific ID (for imports)
export const addOrUpdatePaymentWithId = async (
  payment: Payment,
): Promise<Payment> => {
  const updatedPayment = {
    ...payment,
    date: payment.date || new Date().toISOString(),
    invoiceNumber: payment.invoiceNumber || `INV-${Date.now()}`,
    status: payment.status || "completed",
  };

  await paymentsDB.setItem(payment.id, updatedPayment);
  return updatedPayment;
};

// Add a session payment for non-subscribed members
export const addSessionPayment = async (
  memberName: string,
  memberPhone?: string,
): Promise<{ payment: Payment; memberId: string }> => {
  // Create a temporary member ID for the session
  const memberId = `session_${Date.now()}`;

  // Get current pricing from settings
  const sessionPrice = calculateSubscriptionPrice("حصة واحدة");

  const payment: Omit<Payment, "id"> = {
    memberId,
    amount: sessionPrice,
    date: new Date().toISOString(),
    subscriptionType: "حصة واحدة",
    paymentMethod: "cash",
    notes: `دفع حصة واحدة - ${memberName}${memberPhone ? ` (${memberPhone})` : ""}`,
    status: "completed",
  };

  const newPayment = await addPayment(payment);

  // Import addActivity function
  const { addActivity } = await import("./memberService");

  // Add activity for this session payment
  await addActivity({
    memberId,
    memberName,
    activityType: "payment",
    timestamp: new Date().toISOString(),
    details: `دفع حصة واحدة - ${formatNumber(sessionPrice)} دج`,
  });

  // Add check-in activity
  await addActivity({
    memberId,
    memberName,
    activityType: "check-in",
    timestamp: new Date().toISOString(),
    details: `تسجيل حضور حصة واحدة`,
  });

  return { payment: newPayment, memberId };
};

// Delete a payment
export const deletePayment = async (id: string): Promise<void> => {
  await paymentsDB.removeItem(id);
};

// Delete all payments (for easy data cleanup)
export const deleteAllPayments = async (): Promise<void> => {
  await paymentsDB.clear();
};

// Delete multiple payments by IDs
export const deleteMultiplePayments = async (ids: string[]): Promise<void> => {
  for (const id of ids) {
    await paymentsDB.removeItem(id);
  }
};

// Calculate subscription price based on type
export const calculateSubscriptionPrice = (
  subscriptionType: string,
): number => {
  if (!subscriptionType || typeof subscriptionType !== "string") {
    return 1000; // Default price
  }

  // Load custom pricing from localStorage
  const savedPricing = localStorage.getItem("gymPricingSettings");
  let pricing = {
    singleSession: 200,
    sessions13: 1500,
    sessions15: 1800,
    sessions30: 1800,
  };

  if (savedPricing) {
    try {
      const parsedPricing = JSON.parse(savedPricing);
      pricing = {
        singleSession: parsedPricing.singleSession || 200,
        sessions13: parsedPricing.sessions13 || 1500,
        sessions15: parsedPricing.sessions15 || 1800,
        sessions30: parsedPricing.sessions30 || 1800,
      };
    } catch (error) {
      console.error("Error loading pricing settings:", error);
    }
  }

  switch (subscriptionType.trim()) {
    case "شهري":
      return pricing.sessions13;
    case "نصف شهري":
      return pricing.sessions15;
    case "13 حصة":
      return pricing.sessions13;
    case "15 حصة":
      return pricing.sessions15;
    case "30 حصة":
      return pricing.sessions30;
    case "حصة واحدة":
      return pricing.singleSession;
    default:
      return pricing.sessions13;
  }
};

// Get payment statistics
export const getPaymentStatistics = async () => {
  const payments = await getAllPayments();

  // Helper function to safely sum amounts
  const safeSum = (paymentList: Payment[]) => {
    return paymentList.reduce((sum, payment) => {
      const amount = Number(payment.amount);
      return sum + (isNaN(amount) || !isFinite(amount) ? 0 : amount);
    }, 0);
  };

  // Calculate today's revenue
  const today = new Date().toISOString().split("T")[0];
  const todayPayments = payments.filter(
    (payment) => payment.date && payment.date.split("T")[0] === today,
  );

  // Calculate this week's revenue
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekPayments = payments.filter(
    (payment) => payment.date && new Date(payment.date) >= oneWeekAgo,
  );

  // Calculate this month's revenue
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const monthPayments = payments.filter(
    (payment) => payment.date && new Date(payment.date) >= oneMonthAgo,
  );

  const totalRevenue = safeSum(payments);
  const todayRevenue = safeSum(todayPayments);
  const weekRevenue = safeSum(weekPayments);
  const monthRevenue = safeSum(monthPayments);

  return {
    totalRevenue,
    todayRevenue,
    weekRevenue,
    monthRevenue,
    paymentCount: payments.length,
    averagePayment: payments.length > 0 ? totalRevenue / payments.length : 0,
    subscriptionTypeBreakdown: payments.reduce(
      (acc: Record<string, number>, payment) => {
        const type = payment.subscriptionType || "غير محدد";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {},
    ),
    recentPayments: payments
      .filter((payment) => payment.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5),
  };
};

// Update payment status based on attendance (removed to prevent duplicate activities)
export const updatePaymentStatusByAttendance = async (
  memberId: string,
  attendanceDate: string,
): Promise<void> => {
  try {
    // Get all payments for this member
    const memberPayments = await getPaymentsByMemberId(memberId);

    if (memberPayments.length === 0) {
      return; // Don't create session payments automatically
    }

    // Get the most recent payment
    const latestPayment = memberPayments.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];

    // Update the payment with attendance information (without creating duplicate activities)
    const updatedPayment = {
      ...latestPayment,
      lastAttendanceDate: attendanceDate,
      // Add a note about the attendance
      notes: latestPayment.notes
        ? `${latestPayment.notes} | حضور بتاريخ ${formatDate(attendanceDate)}`
        : `حضور بتاريخ ${formatDate(attendanceDate)}`,
    };

    // Save the updated payment (without creating additional activities)
    await updatePayment(updatedPayment);
  } catch (error) {
    console.error("Error updating payment status based on attendance:", error);
  }
};
