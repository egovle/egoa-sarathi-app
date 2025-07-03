
'use server';

import { addDoc, arrayUnion, collection, doc, getDocs, query, runTransaction, where } from "firebase/firestore";
import { db } from "@/lib/firebase";


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


// --- CENTRALIZED PAYOUT LOGIC ---
export async function processPayout(task: any, adminUserId: string) {
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

            const totalPaid = parseFloat(task.totalPaid);
            const governmentFee = parseFloat(task.governmentFeeApplicable || 0);

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
