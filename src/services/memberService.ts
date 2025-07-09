import localforage from "localforage";
import { formatNumber, formatDate } from "@/lib/utils";

export interface Member {
  id: string;
  name: string;
  membershipStatus: "active" | "expired" | "pending";
  lastAttendance: string;
  imageUrl?: string;
  phoneNumber?: string;
  email?: string;
  membershipType?: string;
  membershipStartDate?: string;
  membershipEndDate?: string;
  subscriptionType?: "13 حصة" | "15 حصة" | "30 حصة";
  sessionsRemaining?: number;
  subscriptionPrice?: number;
  paymentStatus?: "paid" | "unpaid" | "partial";
  note?: string;
}

// Initialize the database with better configuration
const membersDB = localforage.createInstance({
  name: "gym-tracker",
  storeName: "members",
  driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
  version: 1.0,
  description: "Gym members database",
});

// Initial seed data
const initialMembers: Member[] = [
  {
    id: "1",
    name: "أحمد محمد",
    membershipStatus: "active",
    lastAttendance: "2023-06-15",
    imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=ahmed",
    phoneNumber: "0501234567",
    email: "ahmed@example.com",
    membershipType: "شهري",
    membershipStartDate: "2023-05-15",
    membershipEndDate: "2023-07-15",
    subscriptionType: "30 حصة",
    sessionsRemaining: 25,
    subscriptionPrice: 1800,
    paymentStatus: "paid",
  },
  {
    id: "2",
    name: "سارة علي",
    membershipStatus: "active",
    lastAttendance: "2023-06-14",
    imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sara",
    phoneNumber: "0507654321",
    email: "sara@example.com",
    membershipType: "سنوي",
    membershipStartDate: "2023-01-01",
    membershipEndDate: "2023-12-31",
    subscriptionType: "15 حصة",
    sessionsRemaining: 10,
    subscriptionPrice: 1000,
    paymentStatus: "paid",
  },
  {
    id: "3",
    name: "محمد خالد",
    membershipStatus: "expired",
    lastAttendance: "2023-05-20",
    imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=mohamed",
    phoneNumber: "0509876543",
    email: "mohamed@example.com",
    membershipType: "شهري",
    membershipStartDate: "2023-04-01",
    membershipEndDate: "2023-05-01",
    subscriptionType: "13 حصة",
    sessionsRemaining: 0,
    subscriptionPrice: 1000,
    paymentStatus: "paid",
  },
  {
    id: "4",
    name: "فاطمة أحمد",
    membershipStatus: "pending",
    lastAttendance: "2023-06-10",
    imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=fatima",
    phoneNumber: "0503456789",
    email: "fatima@example.com",
    membershipType: "شهري",
    membershipStartDate: "2023-06-01",
    membershipEndDate: "2023-07-01",
  },
  {
    id: "5",
    name: "عمر حسن",
    membershipStatus: "active",
    lastAttendance: "2023-06-15",
    imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=omar",
    phoneNumber: "0505555555",
    email: "omar@example.com",
    membershipType: "سنوي",
    membershipStartDate: "2023-03-15",
    membershipEndDate: "2024-03-15",
  },
  {
    id: "6",
    name: "نور محمد",
    membershipStatus: "expired",
    lastAttendance: "2023-04-30",
    imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=noor",
    phoneNumber: "0506666666",
    email: "noor@example.com",
    membershipType: "شهري",
    membershipStartDate: "2023-03-01",
    membershipEndDate: "2023-04-01",
  },
  {
    id: "7",
    name: "خالد عبدالله",
    membershipStatus: "active",
    lastAttendance: "2023-06-12",
    imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=khaled",
    phoneNumber: "0507777777",
    email: "khaled@example.com",
    membershipType: "شهري",
    membershipStartDate: "2023-06-01",
    membershipEndDate: "2023-07-01",
  },
  {
    id: "8",
    name: "ليلى سعيد",
    membershipStatus: "pending",
    lastAttendance: "2023-06-01",
    imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=layla",
    phoneNumber: "0508888888",
    email: "layla@example.com",
    membershipType: "سنوي",
    membershipStartDate: "2023-06-15",
    membershipEndDate: "2024-06-15",
  },
];

// Initialize the database with seed data if empty
const initDB = async () => {
  const keys = await membersDB.keys();
  if (keys.length === 0) {
    for (const member of initialMembers) {
      await membersDB.setItem(member.id, member);
    }
    // Add some initial activities
    await initActivitiesDB();
  }
};

// Initialize activities with sample data
const initActivitiesDB = async () => {
  const keys = await activitiesDB.keys();
  if (keys.length === 0) {
    const sampleActivities: MemberActivity[] = [
      {
        id: "act1",
        memberId: "1",
        memberName: "أحمد محمد",
        memberImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=ahmed",
        activityType: "check-in",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        details: "تسجيل حضور - متبقي 24 حصة",
      },
      {
        id: "act2",
        memberId: "2",
        memberName: "سارة علي",
        memberImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=sara",
        activityType: "payment",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        details: "دفع 1000 دج - 15 حصة",
      },
      {
        id: "act3",
        memberId: "5",
        memberName: "عمر حسن",
        memberImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=omar",
        activityType: "check-in",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
        details: "تسجيل حضور",
      },
      {
        id: "act4",
        memberId: "7",
        memberName: "خالد عبدالله",
        memberImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=khaled",
        activityType: "membership-renewal",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
        details: "تجديد اشتراك شهري",
      },
      {
        id: "act5",
        memberId: "session_temp",
        memberName: "زائر مؤقت",
        activityType: "payment",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
        details: "دفع حصة واحدة - 200 دج",
      },
    ];

    for (const activity of sampleActivities) {
      await activitiesDB.setItem(activity.id!, activity);
    }
  }
};

// Get all members with error handling
export const getAllMembers = async (): Promise<Member[]> => {
  try {
    await initDB();
    const members: Member[] = [];
    await membersDB.iterate((value: Member) => {
      if (value && typeof value === "object" && value.id) {
        members.push(value);
      }
    });
    return members.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  } catch (error) {
    console.warn("تحذير: مشكلة في تحميل بيانات الأعضاء:", error);
    // Return empty array instead of throwing error
    return [];
  }
};

// Get a member by ID
export const getMemberById = async (id: string): Promise<Member | null> => {
  return await membersDB.getItem(id);
};

// Add a new member with validation
export const addMember = async (
  member: Omit<Member, "id">,
): Promise<Member> => {
  try {
    if (!member.name || member.name.trim() === "") {
      throw new Error("اسم العضو مطلوب");
    }

    const id = Date.now().toString();
    const newMember = {
      ...member,
      id,
      name: member.name.trim(),
      membershipStatus: member.membershipStatus || "active",
      lastAttendance: member.lastAttendance || "",
      paymentStatus: member.paymentStatus || "unpaid",
    };

    await membersDB.setItem(id, newMember);
    return newMember;
  } catch (error) {
    console.error("Error adding member:", error);
    throw error;
  }
};

// Add or update member with specific ID (for imports)
export const addOrUpdateMemberWithId = async (
  member: Member,
): Promise<Member> => {
  await membersDB.setItem(member.id, member);
  return member;
};

// Update a member with validation
export const updateMember = async (member: Member): Promise<Member> => {
  try {
    if (!member.id) {
      throw new Error("معرف العضو مطلوب");
    }

    if (!member.name || member.name.trim() === "") {
      throw new Error("اسم العضو مطلوب");
    }

    const updatedMember = {
      ...member,
      name: member.name.trim(),
    };

    await membersDB.setItem(member.id, updatedMember);
    return updatedMember;
  } catch (error) {
    console.error("Error updating member:", error);
    throw error;
  }
};

// Reset member sessions based on subscription type
export const resetMemberSessions = async (
  memberId: string,
): Promise<Member | null> => {
  const member = await getMemberById(memberId);
  if (!member) return null;

  // Reset sessions based on subscription type
  let newSessionsRemaining = 0;
  if (member.subscriptionType === "13 حصة") {
    newSessionsRemaining = 13;
  } else if (member.subscriptionType === "15 حصة") {
    newSessionsRemaining = 15;
  } else if (member.subscriptionType === "30 حصة") {
    newSessionsRemaining = 30;
  } else if (member.membershipType === "نصف شهري") {
    newSessionsRemaining = 15;
  }

  const updatedMember = {
    ...member,
    sessionsRemaining: newSessionsRemaining,
    paymentStatus: "paid" as const,
    membershipStatus: "active" as const,
  };

  await membersDB.setItem(memberId, updatedMember);

  // Add activity for session reset
  await addActivity({
    memberId: member.id,
    memberName: member.name,
    memberImage: member.imageUrl,
    activityType: "membership-renewal",
    timestamp: new Date().toISOString(),
    details: `تم إعادة تعيين الحصص - ${formatNumber(newSessionsRemaining)}/${formatNumber(newSessionsRemaining)} حصة`,
  });

  return updatedMember;
};

// Delete a member
export const deleteMember = async (id: string): Promise<void> => {
  await membersDB.removeItem(id);
};

// Mark attendance for a member
export const markAttendance = async (id: string): Promise<Member | null> => {
  const member = await getMemberById(id);
  if (!member) return null;

  // Initialize sessions remaining if not set (for new members)
  if (member.subscriptionType && member.sessionsRemaining === undefined) {
    if (member.subscriptionType === "13 حصة") {
      member.sessionsRemaining = 13;
    } else if (member.subscriptionType === "15 حصة") {
      member.sessionsRemaining = 15;
    } else if (member.subscriptionType === "30 حصة") {
      member.sessionsRemaining = 30;
    } else if (member.membershipType === "نصف شهري") {
      member.sessionsRemaining = 15;
    } else {
      member.sessionsRemaining = 0;
    }
  }

  // Check if member has sessions remaining (only if they have a subscription type)
  if (member.subscriptionType && member.sessionsRemaining !== undefined) {
    if (member.sessionsRemaining <= 0) {
      throw new Error("لا توجد حصص متبقية لهذا العضو");
    }

    // Decrement sessions remaining
    member.sessionsRemaining -= 1;
  }

  const updatedMember = {
    ...member,
    lastAttendance: new Date().toISOString().split("T")[0],
  };

  // Save the updated member with decremented sessions to the database
  await membersDB.setItem(id, updatedMember);

  // Add check-in activity (only one activity per attendance)
  await addActivity({
    memberId: member.id,
    memberName: member.name,
    memberImage: member.imageUrl,
    activityType: "check-in",
    timestamp: new Date().toISOString(),
    details:
      member.subscriptionType && updatedMember.sessionsRemaining !== undefined
        ? `تسجيل حضور - متبقي ${formatNumber(updatedMember.sessionsRemaining)} حصة`
        : `تسجيل حضور`,
  });

  return updatedMember;
};

// Search members by name
export const searchMembersByName = async (query: string): Promise<Member[]> => {
  const allMembers = await getAllMembers();
  return allMembers.filter((member) =>
    member.name.toLowerCase().includes(query.toLowerCase()),
  );
};

// Filter members by status
export const filterMembersByStatus = async (
  status: string | null,
): Promise<Member[]> => {
  const allMembers = await getAllMembers();
  if (!status) return allMembers;

  return allMembers.filter((member) => member.membershipStatus === status);
};

// Search and filter combined
export const searchAndFilterMembers = async (
  query: string,
  status: string | null,
): Promise<Member[]> => {
  const allMembers = await getAllMembers();
  return allMembers.filter((member) => {
    const matchesSearch = member.name
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesFilter = status ? member.membershipStatus === status : true;
    return matchesSearch && matchesFilter;
  });
};

// Initialize activities database with better configuration
const activitiesDB = localforage.createInstance({
  name: "gym-tracker",
  storeName: "activities",
  driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
  version: 1.0,
  description: "Gym activities database",
});

export interface MemberActivity {
  id?: string;
  memberId: string;
  memberName?: string;
  memberImage?: string;
  activityType: "check-in" | "membership-renewal" | "payment" | "other";
  timestamp: string;
  details: string;
}

// Add an activity
export const addActivity = async (
  activity: MemberActivity,
): Promise<MemberActivity> => {
  const id = Date.now().toString();
  const newActivity = { ...activity, id };
  await activitiesDB.setItem(id, newActivity);
  return newActivity;
};

// Add or update activity with specific ID (for imports)
export const addOrUpdateActivityWithId = async (
  activity: MemberActivity,
): Promise<MemberActivity> => {
  const activityWithId = {
    ...activity,
    id: activity.id || Date.now().toString(),
  };
  await activitiesDB.setItem(activityWithId.id, activityWithId);
  return activityWithId;
};

// Get recent activities with error handling
export const getRecentActivities = async (
  limit: number = 10,
): Promise<MemberActivity[]> => {
  try {
    const activities: MemberActivity[] = [];
    await activitiesDB.iterate((value: MemberActivity) => {
      if (value && typeof value === "object" && value.timestamp) {
        activities.push(value);
      }
    });

    // Sort by timestamp (newest first) and limit the results
    return activities
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, limit);
  } catch (error) {
    console.warn("تحذير: مشكلة في تحميل النشاطات الأخيرة:", error);
    return [];
  }
};
