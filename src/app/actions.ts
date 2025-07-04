
'use server';

import { addDoc, arrayUnion, collection, doc, getDocs, query, runTransaction, where, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Task, UserProfile } from "@/lib/types";

// --- NOTIFICATION HELPERS ---
export async function createNotification(userId: string, title: string, description: string, link?: string) {
    if (!userId) return;
    await addDoc(collection(db, "notifications"), {
        userId,
        title,
        description,
        link: link || '/dashboard',
        read: false,
        date: new Date().toISOString(),
    });
}

export async function createNotificationForAdmins(title: string, description: string, link?: string) {
    try {
        const adminsQuery = query(collection(db, "vles"), where("isAdmin", "==", true));
        const adminSnapshot = await getDocs(adminsQuery);
        
        if (adminSnapshot.empty) {
            console.log("No admin users found to notify.");
            return;
        }

        const notificationPromises = adminSnapshot.docs.map(adminDoc => {
            return createNotification(adminDoc.id, title, description, link);
        });

        await Promise.all(notificationPromises);
    } catch (error) {
        console.error("Error creating notifications for admins:", error);
    }
}


// --- CENTRALIZED PAYMENT & TASK LOGIC ---

export async function createFixedPriceTask(
    taskId: string,
    taskData: Omit<Task, 'id'>, 
    userProfile: UserProfile
) {
    const adminsQuery = query(collection(db, "vles"), where("isAdmin", "==", true));
    const adminSnapshot = await getDocs(adminsQuery);
    if (adminSnapshot.empty) {
        throw new Error("No admin account configured to receive payments.");
    }
    const adminRef = adminSnapshot.docs[0].ref;

    try {
        await runTransaction(db, async (transaction) => {
            const creatorCollection = userProfile.role === 'vle' ? 'vles' : 'users';
            const creatorRef = doc(db, creatorCollection, userProfile.id);
            const creatorDoc = await transaction.get(creatorRef);
            const adminDoc = await transaction.get(adminRef);

            if (!creatorDoc.exists()) throw new Error("Could not find your user profile to process payment.");
            if (!adminDoc.exists()) throw new Error("Could not find the admin profile to process payment.");
            
            const creatorBalance = creatorDoc.data().walletBalance || 0;
            if (creatorBalance < taskData.totalPaid) throw new Error("Insufficient wallet balance.");
            
            const adminBalance = adminDoc.data().walletBalance || 0;

            const newCreatorBalance = creatorBalance - taskData.totalPaid;
            const newAdminBalance = adminBalance + taskData.totalPaid;

            transaction.update(creatorRef, { walletBalance: newCreatorBalance });
            transaction.update(adminRef, { walletBalance: newAdminBalance });

            const taskWithStatus = { ...taskData, status: 'Unassigned' };
            transaction.set(doc(db, "tasks", taskId), taskWithStatus);
        });

        await createNotificationForAdmins(
            'New Task Ready for Assignment',
            `A new task '${taskData.service}' by ${taskData.customer} is paid and ready for assignment.`,
            `/dashboard`
        );
        return { success: true };
    } catch (error: any) {
        console.error("Fixed-price task creation failed:", error);
        return { success: false, error: error.message };
    }
}

export async function payForVariablePriceTask(task: Task, userProfile: UserProfile) {
     const adminsQuery = query(collection(db, "vles"), where("isAdmin", "==", true));
     const adminSnapshot = await getDocs(adminsQuery);
     if (adminSnapshot.empty) {
         throw new Error("No admin account configured to receive payments.");
     }
     const adminRef = adminSnapshot.docs[0].ref;

     try {
         await runTransaction(db, async (transaction) => {
             const customerCollection = userProfile.role === 'vle' ? 'vles' : 'users';
             const customerRef = doc(db, customerCollection, userProfile.id);
             const taskRef = doc(db, 'tasks', task.id);

             const customerDoc = await transaction.get(customerRef);
             const adminDoc = await transaction.get(adminRef);

             if (!customerDoc.exists()) throw new Error("User profile not found.");
             if (!adminDoc.exists()) throw new Error("Admin profile not found.");

             const customerBalance = customerDoc.data().walletBalance || 0;
             if (customerBalance < task.totalPaid) throw new Error("Insufficient wallet balance.");
             
             const adminBalance = adminDoc.data().walletBalance || 0;

             const newCustomerBalance = customerBalance - task.totalPaid;
             const newAdminBalance = adminBalance + task.totalPaid;

             transaction.update(customerRef, { walletBalance: newCustomerBalance });
             transaction.update(adminRef, { walletBalance: newAdminBalance });

             const historyEntry = {
                 timestamp: new Date().toISOString(),
                 actorId: userProfile.id,
                 actorRole: userProfile.role === 'vle' ? 'VLE' : 'Customer',
                 action: 'Payment Completed',
                 details: `Paid ₹${task.totalPaid.toFixed(2)}.`,
             };
             transaction.update(taskRef, {
                 status: 'Unassigned',
                 history: arrayUnion(historyEntry)
             });
         });

         await createNotificationForAdmins(
             'Task Paid & Ready for Assignment',
             `Task ${task.id.slice(-6).toUpperCase()} is now paid and awaits assignment.`,
             `/dashboard`
         );
        return { success: true };
     } catch (error: any) {
         console.error("Payment transaction failed: ", error);
         return { success: false, error: error.message };
     }
}


// --- CENTRALIZED PAYOUT LOGIC ---
export async function processPayout(task: Task, adminUserId: string) {
    if (!adminUserId || !task.assignedVleId || !task.totalPaid) {
        return { success: false, error: 'Cannot process payout. Missing required information.' };
    }

    const adminRef = doc(db, "vles", adminUserId);
    const assignedVleRef = doc(db, "vles", task.assignedVleId);
    const taskRef = doc(db, "tasks", task.id);

    try {
        let payoutDetailsToast = '';
        
        await runTransaction(db, async (transaction) => {
            const adminDoc = await transaction.get(adminRef);
            const assignedVleDoc = await transaction.get(assignedVleRef);

            if (!adminDoc.exists()) throw new Error("Admin profile not found.");
            if (!assignedVleDoc.exists()) throw new Error("Assigned VLE profile not found.");

            const adminBalance = adminDoc.data().walletBalance || 0;
            const assignedVleBalance = assignedVleDoc.data().walletBalance || 0;

            const totalPaid = parseFloat(task.totalPaid.toString());
            const governmentFee = parseFloat(task.governmentFeeApplicable?.toString() || '0');

            const serviceProfit = totalPaid - governmentFee;
            const vleCommission = serviceProfit * 0.8;
            const adminCommission = serviceProfit * 0.2;
            
            const amountToVle = governmentFee + vleCommission;

            if (adminBalance < amountToVle) {
                throw new Error("Admin wallet has insufficient funds to process this payout.");
            }

            const newAdminBalance = adminBalance - amountToVle;
            const newAssignedVleBalance = assignedVleBalance + amountToVle;

            transaction.update(adminRef, { walletBalance: newAdminBalance });
            transaction.update(assignedVleRef, { walletBalance: newAssignedVleBalance });
            
            const historyDetails = `Payout of ₹${amountToVle.toFixed(2)} approved. VLE Commission: ₹${vleCommission.toFixed(2)}, Govt. Fee: ₹${governmentFee.toFixed(2)}.`;
            payoutDetailsToast = `Paid out ₹${amountToVle.toFixed(2)} to ${task.assignedVleName}. Admin profit: ₹${adminCommission.toFixed(2)}.`;

            const historyEntry = {
                timestamp: new Date().toISOString(),
                actorId: adminUserId,
                actorRole: 'Admin',
                action: 'Payout Approved',
                details: historyDetails
            };

            transaction.update(taskRef, {
                status: 'Paid Out',
                history: arrayUnion(historyEntry)
            });
        });

        await createNotification(task.assignedVleId, 'Payment Received', `You have received a payment for task ${task.id.slice(-6).toUpperCase()}.`);
        
        return { success: true, message: payoutDetailsToast };

    } catch (error: any) {
        console.error("Payout transaction failed:", error);
        return { success: false, error: error.message || 'An unknown error occurred.' };
    }
}
