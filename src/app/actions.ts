
'use server';

import { addDoc, arrayUnion, collection, doc, getDocs, query, runTransaction, where, setDoc, updateDoc, writeBatch, deleteDoc, getDoc, Timestamp, orderBy, limit } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Task, UserProfile, Service, CampPayout, TaskDocument, VLEProfile } from "@/lib/types";
import { calculateVleEarnings } from "@/lib/utils";
import { defaultServices } from "@/lib/seedData";
import { sendWhatsAppMessage } from "@/services/whatsapp";

// --- NOTIFICATION HELPERS ---
export async function createNotification(userId: string, title: string, description: string, link?: string) {
    if (!userId) return;

    // Create in-app notification
    await addDoc(collection(db, "notifications"), {
        userId,
        title,
        description,
        link: link || '/dashboard',
        read: false,
        date: new Date().toISOString(),
    });

    // Send WhatsApp notification
    try {
        const userRef = doc(db, 'users', userId);
        const vleRef = doc(db, 'vles', userId);
        const govRef = doc(db, 'government', userId);

        const [userSnap, vleSnap, govSnap] = await Promise.all([
            getDoc(userRef),
            getDoc(vleRef),
            getDoc(govRef)
        ]);
        
        let userProfile: UserProfile | null = null;
        if(userSnap.exists()) userProfile = userSnap.data() as UserProfile;
        else if (vleSnap.exists()) userProfile = vleSnap.data() as UserProfile;
        else if (govSnap.exists()) userProfile = govSnap.data() as UserProfile;

        if (userProfile?.mobile) {
            const whatsappBody = `*${title}*\n\n${description}`;
            // Prepend Indian country code if not present
            const mobileNumber = userProfile.mobile.startsWith('+91') ? userProfile.mobile : `+91${userProfile.mobile}`;
            await sendWhatsAppMessage(mobileNumber, whatsappBody);
        }
    } catch (error) {
        console.error("Failed to send WhatsApp notification:", error);
        // We don't want to fail the whole operation if WhatsApp fails, so we just log the error.
    }
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


// --- CENTRALIZED TASK CREATION ---
export async function createTask(formData: FormData) {
    try {
        const creatorId = formData.get('creatorId') as string;
        const creatorProfile = JSON.parse(formData.get('creatorProfile') as string) as UserProfile;
        const service = JSON.parse(formData.get('selectedService') as string) as Service;
        const type = formData.get('type') as 'Customer Request' | 'VLE Lead';

        if (!creatorId || !creatorProfile || !service) {
            throw new Error("Missing critical user or service data.");
        }
        
        const taskId = doc(collection(db, "tasks")).id;
        const uploadedDocuments: TaskDocument[] = [];
        const fileUploadPromises: Promise<any>[] = [];
        const customFormData: { [key: string]: string } = {};

        for (const [key, value] of formData.entries()) {
            if (key.startsWith('file_') && value instanceof File) {
                const file = value;
                const keys = key.replace('file_', '').split(':');
                const groupKey = keys[0];
                const optionKey = keys[1];

                const storageRef = ref(storage, `tasks/${taskId}/${Date.now()}_${file.name}`);
                
                const metadata = { 
                    customMetadata: { 
                        creatorId: creatorId,
                        groupKey: groupKey,
                        optionKey: optionKey,
                    }
                };

                const uploadPromise = uploadBytes(storageRef, file, metadata).then(async (snapshot) => {
                    const downloadURL = await getDownloadURL(snapshot.ref);
                    uploadedDocuments.push({
                        name: file.name,
                        url: downloadURL,
                        groupKey: groupKey,
                        optionKey: optionKey,
                    });
                });
                fileUploadPromises.push(uploadPromise);
            } else if (key.startsWith('text_')) {
                 const keys = key.replace('text_', '');
                 customFormData[keys] = value as string;
            }
        }
        
        await Promise.all(fileUploadPromises);
        
        const isVleLead = creatorProfile.role === 'vle';
        const totalPaid = isVleLead ? service.vleRate : service.customerRate;

        const taskData: Omit<Task, 'id'> = {
            customer: formData.get('name') as string,
            customerAddress: formData.get('address') as string,
            customerMobile: formData.get('mobile') as string,
            customerEmail: formData.get('email') as string,
            customerPincode: creatorProfile.pincode,
            service: service.name,
            serviceId: service.id,
            date: new Date().toISOString(),
            status: 'Unassigned', // Will be updated below
            totalPaid: totalPaid,
            governmentFeeApplicable: service.governmentFee || 0,
            customerRate: service.customerRate,
            vleRate: service.vleRate,
            history: [{
                timestamp: new Date().toISOString(),
                actorId: creatorId,
                actorRole: type === 'VLE Lead' ? 'VLE' : 'Customer',
                action: 'Task Created',
                details: `Task created for service: ${service.name}.`
            }],
            acknowledgementNumber: null,
            complaint: null,
            feedback: null,
            type: type,
            assignedVleId: null,
            assignedVleName: null,
            creatorId: creatorId,
            documents: uploadedDocuments,
            formData: customFormData,
            finalCertificate: null,
        };

        if (service.isVariable) {
            const taskWithStatus = { ...taskData, status: 'Pending Price Approval' as const };
            await setDoc(doc(db, "tasks", taskId), taskWithStatus);
            await createNotificationForAdmins(
                'New Variable-Rate Task',
                `A task for '${service.name}' requires a price to be set.`,
                `/dashboard/task/${taskId}`
            );
            return { success: true, message: 'Request Submitted! An admin will review the details and notify you of the final cost.' };
        } else {
            const result = await createFixedPriceTask(taskId, taskData, creatorProfile);
            if (result.success) {
                return { success: true, message: `Task Created & Paid! ₹${taskData.totalPaid.toFixed(2)} has been deducted from your wallet.` };
            } else {
                throw new Error(result.error || "An unknown error occurred during task creation.");
            }
        }
    } catch (error: any) {
        console.error("Task creation failed in server action:", error);
        return { success: false, error: error.message };
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

            const taskWithStatus = { ...taskData, status: 'Unassigned' as const };
            transaction.set(doc(db, "tasks", taskId), taskWithStatus);
        });

        await autoAssignVleToTask(taskId);

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
         
        await autoAssignVleToTask(task.id);

        return { success: true };
     } catch (error: any) {
         console.error("Payment transaction failed: ", error);
         return { success: false, error: error.message };
     }
}


// --- AUTO-ASSIGNMENT LOGIC ---
export async function autoAssignVleToTask(taskId: string) {
    const taskRef = doc(db, "tasks", taskId);
    const taskSnap = await getDoc(taskRef);
    if (!taskSnap.exists()) {
        console.error(`Auto-assign failed: Task ${taskId} not found.`);
        return;
    }
    const task = taskSnap.data() as Task;
    const { serviceId, customerPincode } = task;

    // 1. Fetch all potentially eligible VLEs
    const vlesQuery = query(
        collection(db, "vles"),
        where("status", "==", "Approved"),
        where("available", "==", true),
        where("offeredServices", "array-contains", serviceId)
    );
    const vlesSnapshot = await getDocs(vlesQuery);
    let eligibleVles = vlesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }) as VLEProfile);

    if (eligibleVles.length === 0) {
        await createNotificationForAdmins('Auto-Assignment Failed', `No VLEs found for service "${task.service}". Manual assignment required.`, `/dashboard`);
        return;
    }

    // 2. Apply task limit filter
    const activeStatuses: Task['status'][] = ['Assigned', 'Pending VLE Acceptance', 'Awaiting Documents', 'In Progress'];
    const taskCounts = new Map<string, number>();
    const tasksQuery = query(collection(db, "tasks"), where("status", "in", activeStatuses));
    const activeTasksSnap = await getDocs(tasksQuery);
    activeTasksSnap.forEach(doc => {
        const taskData = doc.data() as Task;
        if (taskData.assignedVleId) {
            taskCounts.set(taskData.assignedVleId, (taskCounts.get(taskData.assignedVleId) || 0) + 1);
        }
    });

    eligibleVles = eligibleVles.filter(vle => (taskCounts.get(vle.id) || 0) < 3);

    if (eligibleVles.length === 0) {
        await createNotificationForAdmins('Auto-Assignment Failed', `No available VLEs with capacity for service "${task.service}". Manual assignment may be needed.`, `/dashboard`);
        return;
    }

    // 3. Pincode-based sorting
    const customerDistrict = task.customerAddress.split(',').map(s => s.trim())[2] || '';
    const samePincodeVles = eligibleVles.filter(v => v.pincode === customerPincode);
    const sameDistrictVles = eligibleVles.filter(v => v.pincode !== customerPincode && (v.location.includes(customerDistrict)));
    const otherVles = eligibleVles.filter(v => !samePincodeVles.includes(v) && !sameDistrictVles.includes(v));

    // 4. Fair Rotation (Round-Robin) within each group
    const sortByLastAssigned = (a: VLEProfile, b: VLEProfile) => {
        const aTime = a.lastAssigned?.[serviceId] ? new Date(a.lastAssigned[serviceId]).getTime() : 0;
        const bTime = b.lastAssigned?.[serviceId] ? new Date(b.lastAssigned[serviceId]).getTime() : 0;
        return aTime - bTime; // Sorts ascending, oldest first
    };
    
    samePincodeVles.sort(sortByLastAssigned);
    sameDistrictVles.sort(sortByLastAssigned);
    otherVles.sort(sortByLastAssigned);

    const finalSortedVles = [...samePincodeVles, ...sameDistrictVles, ...otherVles];

    if (finalSortedVles.length === 0) {
         await createNotificationForAdmins('Auto-Assignment Failed', `No VLEs available after all filters for service "${task.service}". Manual assignment required.`, `/dashboard`);
        return;
    }
    
    // 5. Assign Task to the best candidate
    const selectedVle = finalSortedVles[0];
    const vleRef = doc(db, "vles", selectedVle.id);

    const historyEntry = {
        timestamp: new Date().toISOString(),
        actorId: 'system', // Indicates auto-assignment
        actorRole: 'System',
        action: 'Task Assigned to VLE',
        details: `Task automatically assigned to VLE ${selectedVle.name} for acceptance.`
    };

    try {
        await updateDoc(taskRef, { 
            status: 'Pending VLE Acceptance', 
            assignedVleId: selectedVle.id, 
            assignedVleName: selectedVle.name,
            history: arrayUnion(historyEntry)
        });
        
        // Update VLE's lastAssigned timestamp for this service
        await updateDoc(vleRef, {
            [`lastAssigned.${serviceId}`]: new Date().toISOString()
        });

        await createNotification(
            selectedVle.id,
            'New Task Invitation',
            `You have been invited to work on task: ${taskId.slice(-6).toUpperCase()}.`,
            `/dashboard`
        );
        await createNotificationForAdmins('Task Auto-Assigned', `Task ${taskId.slice(-6).toUpperCase()} was assigned to ${selectedVle.name}.`, `/dashboard`);

    } catch (error) {
        console.error("Error during final step of auto-assignment:", error);
        await createNotificationForAdmins('Auto-Assignment Error', `A system error occurred assigning task ${taskId.slice(-6).toUpperCase()}. Manual check required.`, `/dashboard`);
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

            const { governmentFee, vleCommission, adminCommission } = calculateVleEarnings(task);
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


export async function processCampPayout(campId: string, payoutData: { vleId: string, vleName: string, amount: number }[], adminEarnings: number, adminUserId: string) {
    if (!adminUserId || !campId) {
        return { success: false, error: "Missing required information for camp payout." };
    }

    const campRef = doc(db, "camps", campId);

    try {
        await runTransaction(db, async (transaction) => {
            const campDoc = await transaction.get(campRef);
            if (!campDoc.exists()) {
                throw new Error("Camp not found.");
            }

            const finalPayouts: CampPayout[] = [];

            for (const payout of payoutData) {
                if (payout.amount > 0) {
                    const vleRef = doc(db, "vles", payout.vleId);
                    const vleDoc = await transaction.get(vleRef);
                    if (vleDoc.exists()) {
                        const currentBalance = vleDoc.data().walletBalance || 0;
                        const newBalance = currentBalance + payout.amount;
                        transaction.update(vleRef, { walletBalance: newBalance });

                        finalPayouts.push({
                            ...payout,
                            paidAt: new Date().toISOString(),
                            paidBy: adminUserId
                        });
                    }
                }
            }
            
            transaction.update(campRef, {
                status: 'Paid Out',
                payouts: finalPayouts,
                adminEarnings: adminEarnings
            });
        });

        for (const payout of payoutData) {
            if (payout.amount > 0) {
                await createNotification(payout.vleId, 'Camp Payment Received', `You have received a payment of ₹${payout.amount.toFixed(2)} for your participation in a recent camp.`);
            }
        }

        return { success: true, message: "Camp payouts processed successfully!" };

    } catch (error: any) {
        console.error("Camp payout transaction failed:", error);
        return { success: false, error: error.message || 'An unknown error occurred during camp payout.' };
    }
}


// --- Admin Data Actions ---
async function clearCollection(collectionName: string) {
    const q = query(collection(db, collectionName));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
}

async function seedServices() {
    const servicesCollection = collection(db, "services");
    for (const service of defaultServices) {
        const docRef = doc(servicesCollection, service.id);
        await setDoc(docRef, service);
    }
}

export async function resetApplicationData() {
    try {
        await clearCollection("tasks");
        await clearCollection("camps");
        await clearCollection("notifications");

        const usersSnapshot = await getDocs(collection(db, "users"));
        const vlesSnapshot = await getDocs(collection(db, "vles"));
        
        const resetBatch = writeBatch(db);
        usersSnapshot.forEach(userDoc => {
            resetBatch.update(userDoc.ref, { walletBalance: 0 });
        });
        vlesSnapshot.forEach(vleDoc => {
            resetBatch.update(vleDoc.ref, { walletBalance: 0, lastAssigned: {} });
        });
        await resetBatch.commit();

        await clearCollection("services");
        await seedServices();

        return { success: true, message: "Application data has been reset." };
    } catch (error: any) {
        console.error("Error resetting application data:", error);
        return { success: false, error: error.message };
    }
}
