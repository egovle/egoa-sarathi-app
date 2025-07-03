
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, query, orderBy, getDoc, setDoc, where, getDocs, arrayUnion, runTransaction, limit, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { createNotification, createNotificationForAdmins, processPayout } from '@/app/actions';
import { services as seedServices } from '@/lib/seed';
import { Loader2 } from 'lucide-react';

import AdminDashboard from '@/components/dashboard/AdminDashboard';
import VleDashboard from '@/components/dashboard/VleDashboard';
import CustomerDashboard from '@/components/dashboard/CustomerDashboard';
import GovernmentDashboard from '@/components/dashboard/GovernmentDashboard';
import ProfileView from '@/components/dashboard/ProfileView';

import type { Task, Service, UserProfile, VLEProfile, CustomerProfile, PaymentRequest } from '@/lib/types';


export default function DashboardPage() {
    const { toast } = useToast();
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [allUsers, setAllUsers] = useState<(VLEProfile | CustomerProfile)[]>([]);
    const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
    
    const [services, setServices] = useState<Service[]>([]);
    
    const activeTab = useMemo(() => {
        const tabFromUrl = searchParams.get('tab');
        if (tabFromUrl) return tabFromUrl;
        if (userProfile?.isAdmin) return 'overview';
        return 'tasks';
    }, [searchParams, userProfile]);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);


    useEffect(() => {
        if (!user || !userProfile) {
            return;
        }

        let unsubscribers: (() => void)[] = [];
        const servicesQuery = query(collection(db, "services"), orderBy("name"));
        unsubscribers.push(onSnapshot(servicesQuery, (snapshot) => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Service));
        }));

        if (userProfile.isAdmin) {
            unsubscribers.push(onSnapshot(query(collection(db, "tasks"), orderBy("date", "desc")), (s) => setAllTasks(s.docs.map(d => ({ id: d.id, ...d.data() }) as Task))));
            
            const unsubUsers = onSnapshot(query(collection(db, "users")), (userSnapshot) => {
                 const customerData = userSnapshot.docs.map(d => ({ id: d.id, ...d.data() }) as CustomerProfile);
                 const unsubVles = onSnapshot(query(collection(db, "vles")), (vleSnapshot) => {
                    const vleData = vleSnapshot.docs.map(d => ({ id: d.id, ...d.data() }) as VLEProfile);
                    setAllUsers([...customerData, ...vleData]);
                 });
                 unsubscribers.push(unsubVles);
            });
            unsubscribers.push(unsubUsers);
            
            unsubscribers.push(onSnapshot(query(collection(db, "paymentRequests"), where("status", "==", "pending")), (s) => setPaymentRequests(s.docs.map(d => ({ id: d.id, ...d.data() }) as PaymentRequest))));
        } else if (userProfile.role === 'vle') {
            const assignedTasksQuery = query(collection(db, "tasks"), where("assignedVleId", "==", user.uid));
            unsubscribers.push(onSnapshot(assignedTasksQuery, (snapshot) => {
                const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
                fetched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setAllTasks(fetched);
            }));

            const myLeadsQuery = query(collection(db, "tasks"), where("creatorId", "==", user.uid));
             unsubscribers.push(onSnapshot(myLeadsQuery, (snapshot) => {
                const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
                // Combine with assigned tasks for a full view
                setAllTasks(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newLeads = fetched.filter(f => !existingIds.has(f.id));
                    const updatedTasks = [...prev, ...newLeads];
                    updatedTasks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    return updatedTasks;
                });
            }));
        } else if (userProfile.role === 'customer') {
            const tasksQuery = query(collection(db, "tasks"), where("creatorId", "==", user.uid));
            unsubscribers.push(onSnapshot(tasksQuery, (snapshot) => {
                 const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
                fetched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setAllTasks(fetched);
            }));
        }
        
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [user, userProfile]);


    const handleCreateTask = async (newTaskData: any, service: Service, filesToUpload: File[]) => {
        if (!user || !userProfile) {
            throw new Error("Profile not loaded");
        }
    
        const taskId = doc(collection(db, "tasks")).id;
        const uploadedDocuments: { name: string, url: string }[] = [];
    
        if (filesToUpload.length > 0) {
            for (const file of filesToUpload) {
                const storageRef = ref(storage, `tasks/${taskId}/${Date.now()}_${file.name}`);
                const metadata = { customMetadata: { creatorId: user.uid } };
                await uploadBytes(storageRef, file, metadata);
                const downloadURL = await getDownloadURL(storageRef);
                uploadedDocuments.push({ name: file.name, url: downloadURL });
            }
        }
        
        const taskWithDocs = { ...newTaskData, documents: uploadedDocuments };
    
        if (service.isVariable) {
            const taskWithStatus = { ...taskWithDocs, status: 'Pending Price Approval' };
            await setDoc(doc(db, "tasks", taskId), taskWithStatus);
            toast({
                title: 'Request Submitted!',
                description: 'An admin will review the details and notify you of the final cost.'
            });
            await createNotificationForAdmins(
                'New Variable-Rate Task',
                `A task for '${service.name}' requires a price to be set.`,
                `/dashboard/task/${taskId}`
            );
        } else {
            const rate = taskWithDocs.totalPaid;
            const adminsQuery = query(collection(db, "vles"), where("isAdmin", "==", true), limit(1));
            const adminSnapshot = await getDocs(adminsQuery);
            if (adminSnapshot.empty) {
                throw new Error("No admin account configured to receive payments.");
            }
            const adminRef = adminSnapshot.docs[0].ref;
            
            await runTransaction(db, async (transaction) => {
                const creatorCollection = userProfile.role === 'vle' ? 'vles' : 'users';
                const creatorRef = doc(db, creatorCollection, user.uid);
                const creatorDoc = await transaction.get(creatorRef);
                const adminDoc = await transaction.get(adminRef);

                if (!creatorDoc.exists()) throw new Error("Could not find your user profile to process payment.");
                if (!adminDoc.exists()) throw new Error("Could not find the admin profile to process payment.");
                
                const creatorBalance = creatorDoc.data().walletBalance || 0;
                if (creatorBalance < rate) throw new Error("Insufficient wallet balance.");
                
                const adminBalance = adminDoc.data().walletBalance || 0;

                const newCreatorBalance = creatorBalance - rate;
                const newAdminBalance = adminBalance + rate;

                transaction.update(creatorRef, { walletBalance: newCreatorBalance });
                transaction.update(adminRef, { walletBalance: newAdminBalance });

                const taskWithStatus = { ...taskWithDocs, status: 'Unassigned' };
                transaction.set(doc(db, "tasks", taskId), taskWithStatus);
            });

            toast({
                title: 'Task Created & Paid!',
                description: `₹${rate.toFixed(2)} has been deducted from your wallet.`,
            });
            await createNotificationForAdmins(
                'New Task Ready for Assignment',
                `A new task '${newTaskData.service}' by ${newTaskData.customer} is paid and ready for assignment.`,
                `/dashboard`
            );
        }
    }


    const handleComplaintSubmit = async (taskId: string, complaint: any) => {
        const taskRef = doc(db, "tasks", taskId);
        await updateDoc(taskRef, { complaint: complaint, status: 'Complaint Raised' });
        const taskSnap = await getDoc(taskRef);
        const taskData = taskSnap.data();
        await createNotificationForAdmins(
            'New Complaint Raised',
            `A complaint was raised for task ${taskId.slice(-6).toUpperCase()} by ${taskData?.customer}.`,
            `/dashboard/task/${taskId}`
        );
    }
    
    const handleFeedbackSubmit = async (taskId: string, feedback: any) => {
        const taskRef = doc(db, "tasks", taskId);
        await updateDoc(taskRef, { feedback: feedback });
    }

    const handleComplaintResponse = async (taskId: string, customerId: string, response: any) => {
        const taskRef = doc(db, "tasks", taskId);
        const taskSnap = await getDoc(taskRef);
        if (taskSnap.exists()) {
            const taskData = taskSnap.data() as Task;
            const updatedComplaint = { ...taskData.complaint, response, status: 'Responded' };
            await updateDoc(taskRef, { complaint: updatedComplaint });
            await createNotification(
                customerId,
                'Response to your Complaint',
                `An admin has responded to your complaint for task ${taskId.slice(-6).toUpperCase()}.`,
                `/dashboard/task/${taskId}`
            );
        }
    }
    
    const handleVleApprove = async (vleId: string) => {
        const vleRef = doc(db, "vles", vleId);
        await updateDoc(vleRef, { status: 'Approved' });
        await createNotification(
            vleId,
            'Account Approved',
            'Congratulations! Your VLE account has been approved by an admin.'
        );
        toast({ title: 'VLE Approved', description: 'The VLE has been approved and can now take tasks.'});
    }

    const handleVleAvailabilityChange = async (vleId: string, available: boolean) => {
        const vleRef = doc(db, "vles", vleId);
        await updateDoc(vleRef, { available: available });
        toast({ title: 'Availability Updated', description: `This VLE is now ${available ? 'available' : 'unavailable'} for tasks.`});
    }

    const handleAssignVle = async (taskId: string, vleId: string, vleName: string) => {
        if (!user || !userProfile?.isAdmin) {
            toast({ title: 'Permission Denied', description: 'Only admins can assign tasks.', variant: 'destructive' });
            return;
        }

        const taskRef = doc(db, "tasks", taskId);
        const historyEntry = {
            timestamp: new Date().toISOString(),
            actorId: user.uid,
            actorRole: 'Admin',
            action: 'Task Assigned to VLE',
            details: `Task assigned to VLE ${vleName} for acceptance.`
        };

        try {
            await updateDoc(taskRef, { 
                status: 'Pending VLE Acceptance', 
                assignedVleId: vleId, 
                assignedVleName: vleName,
                history: arrayUnion(historyEntry)
            });

            await createNotification(
                vleId,
                'New Task Invitation',
                `You have been invited to work on task: ${taskId.slice(-6).toUpperCase()}.`,
                `/dashboard`
            );
        } catch (error: any) {
            console.error("Task assignment failed:", error);
            toast({
                title: 'Assignment Failed',
                description: error.message || 'Could not assign the task.',
                variant: 'destructive',
            });
            throw error; 
        }
    }

    const handleTaskAccept = async (taskId: string) => {
        if (!user) return;
        const taskRef = doc(db, "tasks", taskId);
        
        try {
            await runTransaction(db, async (transaction) => {
                const taskDoc = await transaction.get(taskRef);
                if (!taskDoc.exists() || taskDoc.data().status !== 'Pending VLE Acceptance') {
                    throw new Error("Task is no longer available for acceptance.");
                }
                
                const historyEntry = {
                    timestamp: new Date().toISOString(),
                    actorId: user.uid,
                    actorRole: 'VLE',
                    action: 'Task Accepted',
                    details: `VLE has accepted the task.`
                };
    
                transaction.update(taskRef, { 
                    status: 'Assigned',
                    history: arrayUnion(historyEntry)
                });
            });
    
            toast({ title: 'Task Accepted', description: 'You can now begin work on this task.' });
            await createNotificationForAdmins('Task Accepted by VLE', `VLE ${userProfile?.name} has accepted task ${taskId.slice(-6).toUpperCase()}.`);
            
        } catch (error: any) {
            console.error("Task acceptance failed:", error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    }

    const handleTaskReject = async (taskId: string) => {
        if (!user) return;
        const taskRef = doc(db, "tasks", taskId);

        try {
            const historyEntry = {
                timestamp: new Date().toISOString(),
                actorId: user.uid,
                actorRole: 'VLE',
                action: 'Task Rejected',
                details: `VLE has rejected the task. It has been returned to the assignment queue.`
            };
            
            await updateDoc(taskRef, {
                status: 'Unassigned',
                assignedVleId: null,
                assignedVleName: null,
                history: arrayUnion(historyEntry)
            });

            toast({ title: 'Task Rejected', description: 'The task has been returned to the admin.' });
            await createNotificationForAdmins(
                'Task Rejected by VLE',
                `Task ${taskId.slice(-6).toUpperCase()} was rejected and needs to be reassigned.`
            );
        } catch (error: any) {
            console.error("Task rejection failed:", error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };
    
    const handleUpdateVleBalance = async (vleId: string, amountToAdd: number) => {
        const vleRef = doc(db, "vles", vleId);
        try {
            await runTransaction(db, async (transaction) => {
                const vleDoc = await transaction.get(vleRef);
                if (!vleDoc.exists()) {
                    throw "Document does not exist!";
                }
                const currentBalance = vleDoc.data().walletBalance || 0;
                const newBalance = currentBalance + amountToAdd;
                transaction.update(vleRef, { walletBalance: newBalance });
            });

            await createNotification(
                vleId,
                'Wallet Balance Updated',
                `An admin has added ₹${amountToAdd.toFixed(2)} to your wallet.`
            );
        } catch (e) {
            console.error("Transaction failed: ", e);
            toast({ title: "Error", description: "Failed to update balance.", variant: "destructive" });
        }
    };
    
    const handleBalanceRequest = async (amount: number) => {
        if (!user || !userProfile) return;
        
        await addDoc(collection(db, "paymentRequests"), {
            userId: user.uid,
            userName: userProfile.name,
            userRole: userProfile.role || 'customer',
            amount,
            status: 'pending',
            date: new Date().toISOString()
        });
        
        toast({ title: 'Request Submitted', description: 'Your request to add balance has been sent to an admin for verification.' });
        
        await createNotificationForAdmins('New Balance Request', `${userProfile.name} has requested to add ₹${amount.toFixed(2)} to their wallet.`);
    };
    
     const handleApproveBalanceRequest = async (req: PaymentRequest) => {
        const userRef = doc(db, req.userRole === 'vle' ? 'vles' : 'users', req.userId);
        const reqRef = doc(db, 'paymentRequests', req.id);

        try {
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw new Error("User document not found.");

                const currentBalance = userDoc.data().walletBalance || 0;
                const newBalance = currentBalance + req.amount;
                
                transaction.update(userRef, { walletBalance: newBalance });
                transaction.update(reqRef, { status: 'approved', approvedBy: user?.uid, approvedAt: new Date().toISOString() });
            });

            toast({ title: 'Balance Added', description: `Successfully added ₹${req.amount.toFixed(2)} to ${req.userName}'s wallet.` });
            await createNotification(req.userId, 'Wallet Balance Updated', `An admin has approved your request and added ₹${req.amount.toFixed(2)} to your wallet.`);
        } catch (error: any) {
            console.error("Failed to approve balance request:", error);
            toast({ title: "Approval Failed", description: error.message || "Could not update the user's balance.", variant: 'destructive' });
        }
    };

    const handleResetData = async () => {
        toast({ title: 'Resetting Data...', description: 'Please wait, this may take a moment.' });
        
        const processInBatches = async (
            collectionRef: any,
            operation: 'delete' | 'update',
            updateData?: object
        ) => {
            const BATCH_SIZE = 499;
            const snapshot = await getDocs(query(collectionRef));
            if (snapshot.size === 0) return;

            let batch = writeBatch(db);
            let count = 0;

            for (const doc of snapshot.docs) {
                if (operation === 'delete') {
                    batch.delete(doc.ref);
                } else if (operation === 'update' && updateData) {
                    batch.update(doc.ref, updateData);
                }
                count++;
                if (count === BATCH_SIZE) {
                    await batch.commit();
                    batch = writeBatch(db);
                    count = 0;
                }
            }
            if (count > 0) {
                await batch.commit();
            }
        };

        try {
            const collectionsToClear = ['tasks', 'camps', 'notifications', 'paymentRequests', 'services', 'campSuggestions', 'taskChats'];
            for (const collectionName of collectionsToClear) {
                await processInBatches(collection(db, collectionName), 'delete');
            }

            await processInBatches(collection(db, 'users'), 'update', { walletBalance: 0 });
            await processInBatches(query(collection(db, 'vles'), where('isAdmin', '==', false)), 'update', { walletBalance: 0 });

            let seedBatch = writeBatch(db);
            seedServices.forEach(service => {
                const docRef = service.id ? doc(db, "services", service.id) : doc(collection(db, "services"));
                const { id, ...serviceData } = service;
                seedBatch.set(docRef, serviceData);
            });
            await seedBatch.commit();

            toast({ title: 'Application Reset', description: 'All data has been cleared and default services have been seeded.' });
        } catch (error: any) {
            console.error("Error resetting data:", error);
            toast({ title: 'Reset Failed', description: error.message || 'Could not reset the application data.', variant: 'destructive' });
        }
    };

    const handleApprovePayout = async (task: Task) => {
        if (!user || !userProfile?.isAdmin) {
            toast({ title: 'Error', description: 'Permission denied.', variant: 'destructive' });
            return { success: false };
        }

        const result = await processPayout(task, user.uid);

        if (result.success) {
            toast({ title: 'Payout Approved!', description: result.message });
        } else {
            toast({ title: 'Payout Failed', description: result.error, variant: 'destructive' });
        }
        return { success: result.success };
    };

    if (loading || !user || !userProfile) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        )
    }

    const renderContent = () => {
        if (activeTab === 'profile') {
            return <ProfileView userType={userProfile.role === 'vle' ? 'VLE' : 'Customer'} userId={user!.uid} profileData={userProfile} onBalanceRequest={handleBalanceRequest} services={services} />
        }

        switch (userProfile.role) {
            case 'admin':
                return <AdminDashboard allTasks={allTasks} allUsers={allUsers} paymentRequests={paymentRequests} onComplaintResponse={handleComplaintResponse} onVleApprove={handleVleApprove} onVleAssign={handleAssignVle} onUpdateVleBalance={handleUpdateVleBalance} onApproveBalanceRequest={handleApproveBalanceRequest} onResetData={handleResetData} onApprovePayout={handleApprovePayout} onVleAvailabilityChange={handleVleAvailabilityChange} />;
            case 'vle':
                const assignedTasks = allTasks.filter(t => t.assignedVleId === user.uid);
                const myLeads = allTasks.filter(t => t.creatorId === user.uid);
                return <VleDashboard assignedTasks={assignedTasks} myLeads={myLeads} userId={user!.uid} userProfile={userProfile} services={services} onTaskCreated={handleCreateTask} onVleAvailabilityChange={handleVleAvailabilityChange} onTaskAccept={handleTaskAccept} onTaskReject={handleTaskReject} />;
            case 'customer':
                const customerTasks = allTasks.filter(t => t.creatorId === user.uid);
                return <CustomerDashboard tasks={customerTasks} userId={user!.uid} userProfile={userProfile} services={services} onTaskCreated={handleCreateTask} onComplaintSubmit={handleComplaintSubmit} onFeedbackSubmit={handleFeedbackSubmit} />;
            case 'government':
                return <GovernmentDashboard />;
            default:
                 return (
                    <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                )
        }
    }

    return renderContent();
}
