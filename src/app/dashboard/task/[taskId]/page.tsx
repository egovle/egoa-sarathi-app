
'use client';

import { useEffect, useState, type FormEvent, useRef, type ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc, arrayUnion, addDoc, collection, runTransaction, query, where, limit, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, FileText, History, MessageSquarePlus, CheckCircle, Send, UploadCloud, Camera, FileUp, PenSquare, Wallet } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// --- NOTIFICATION HELPERS ---
async function createNotification(userId: string, title: string, description: string, link?: string) {
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

async function createNotificationForAdmins(title: string, description: string, link?: string) {
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


// --- TASK DETAIL PAGE DIALOGS ---

const SetPriceDialog = ({ taskId, customerId, onPriceSet, adminId }: { taskId: string, customerId: string, onPriceSet: () => void, adminId: string }) => {
    const [open, setOpen] = useState(false);
    const [price, setPrice] = useState('');
    const { toast } = useToast();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const finalRate = parseFloat(price);
        if (isNaN(finalRate) || finalRate <= 0) {
            toast({ title: "Invalid Price", description: "Please enter a valid positive number.", variant: "destructive" });
            return;
        }

        const taskRef = doc(db, "tasks", taskId);
        const historyEntry = {
            timestamp: new Date().toISOString(),
            actorId: adminId,
            actorRole: 'Admin',
            action: 'Final Price Set',
            details: `Final price set to ₹${finalRate.toFixed(2)}.`,
        };

        try {
            await updateDoc(taskRef, {
                status: 'Awaiting Payment',
                rate: finalRate,
                history: arrayUnion(historyEntry)
            });
            await createNotification(
                customerId,
                'Final Price Set for Your Task',
                `The final price for task ${taskId.slice(-6).toUpperCase()} is ₹${finalRate.toFixed(2)}. Please complete the payment.`,
                `/dashboard/task/${taskId}`
            );
            toast({ title: 'Price Set Successfully', description: 'The customer has been notified.' });
            onPriceSet();
            setPrice('');
            setOpen(false);
        } catch (error) {
            console.error("Error setting price:", error);
            toast({ title: "Error", description: "Failed to set price.", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><PenSquare className="mr-2 h-4 w-4" />Set Final Price</Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Set Final Price</DialogTitle>
                        <DialogDescription>
                            Enter the final calculated price for this service. The customer will be notified to make the payment.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="final-price">Final Price (₹)</Label>
                        <Input
                            id="final-price"
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="e.g., 2500"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit">Notify Customer</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const RequestInfoDialog = ({ taskId, vleId, customerId }: { taskId:string, vleId: string, customerId: string }) => {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const { toast } = useToast();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!message.trim()) {
            toast({ title: "Message required", description: "Please enter the details of what you need.", variant: "destructive" });
            return;
        }

        const taskRef = doc(db, "tasks", taskId);
        const historyEntry = {
            timestamp: new Date().toISOString(),
            actorId: vleId,
            actorRole: 'VLE',
            action: 'Information Requested',
            details: message,
        };

        try {
            await updateDoc(taskRef, {
                status: 'Awaiting Documents',
                history: arrayUnion(historyEntry)
            });
            await createNotification(
                customerId,
                'Action Required on Your Task',
                `More information has been requested for task ${taskId.slice(-6).toUpperCase()}.`,
                `/dashboard/task/${taskId}`
            );
            toast({ title: 'Request Sent', description: 'The customer has been notified.' });
            setMessage('');
            setOpen(false);
        } catch (error) {
            console.error("Error requesting info:", error);
            toast({ title: "Error", description: "Failed to send request.", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><MessageSquarePlus className="mr-2 h-4 w-4" />Request More Information</Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Request Additional Information</DialogTitle>
                        <DialogDescription>
                            Specify what additional documents or information are required from the customer.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="request-message" className="sr-only">Message</Label>
                        <Textarea
                            id="request-message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="e.g., 'Please upload a clearer copy of your Aadhar card and the electricity bill for the current address.'"
                            rows={5}
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit"><Send className="mr-2 h-4 w-4" /> Send Request</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const SubmitAcknowledgementDialog = ({ taskId, vleId, customerId }: { taskId: string, vleId: string, customerId: string }) => {
    const [open, setOpen] = useState(false);
    const [ackNumber, setAckNumber] = useState('');
    const { toast } = useToast();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!ackNumber.trim()) {
            toast({ title: "Acknowledgement number required", variant: "destructive" });
            return;
        }

        const taskRef = doc(db, "tasks", taskId);
        const historyEntry = {
            timestamp: new Date().toISOString(),
            actorId: vleId,
            actorRole: 'VLE',
            action: 'Acknowledgement Submitted',
            details: `Acknowledgement No: ${ackNumber}`,
        };

        try {
            await updateDoc(taskRef, {
                status: 'In Progress',
                acknowledgementNumber: ackNumber,
                history: arrayUnion(historyEntry)
            });
             await createNotification(
                customerId,
                'Your Task is In Progress',
                `An acknowledgement number has been submitted for task ${taskId.slice(-6).toUpperCase()}.`,
                `/dashboard/task/${taskId}`
            );
            toast({ title: 'Acknowledgement Submitted', description: 'The task is now in progress.' });
            setAckNumber('');
            setOpen(false);
        } catch (error) {
            console.error("Error completing task:", error);
            toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><CheckCircle className="mr-2 h-4 w-4" />Submit Acknowledgement</Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Submit Acknowledgement</DialogTitle>
                        <DialogDescription>
                            Enter the acknowledgement number from the government portal. This will mark the task as 'In Progress'.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="ack-number">Acknowledgement Number / Details</Label>
                        <Input
                            id="ack-number"
                            value={ackNumber}
                            onChange={(e) => setAckNumber(e.target.value)}
                            placeholder="e.g., AKN123456789"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit">Submit</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default function TaskDetailPage() {
    const { taskId } = useParams();
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [task, setTask] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPaying, setIsPaying] = useState(false);
    
    // State for additional document uploads
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // State for VLE final certificate upload
    const [selectedCertificate, setSelectedCertificate] = useState<File | null>(null);
    const [isCertUploading, setIsCertUploading] = useState(false);
    const vleFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!taskId) return;
        const taskRef = doc(db, 'tasks', taskId as string);
        const unsubscribe = onSnapshot(taskRef, (docSnap) => {
            if (docSnap.exists()) {
                setTask({ id: docSnap.id, ...docSnap.data() });
            } else {
                console.error("Task not found");
                setTask(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching task:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [taskId]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files as FileList)]);
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0 || !user || !userProfile || !task) {
            if (selectedFiles.length === 0) toast({ title: "No files selected", variant: "destructive" });
            else toast({ title: "User or task data not loaded", description: "Please wait a moment and try again.", variant: "destructive" });
            return;
        }
        setIsUploading(true);
    
        try {
            const uploadPromises = selectedFiles.map(async (file) => {
                const storageRef = ref(storage, `tasks/${taskId}/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                return getDownloadURL(storageRef);
            });
    
            const downloadURLs = await Promise.all(uploadPromises);
            const newDocuments = selectedFiles.map((file, index) => ({ name: file.name, url: downloadURLs[index] }));
    
            const taskRef = doc(db, 'tasks', taskId as string);
            
            const historyEntry = {
                timestamp: new Date().toISOString(),
                actorId: user.uid,
                actorRole: userProfile.isAdmin ? 'Admin' : (userProfile.role === 'vle' ? 'VLE' : 'Customer'),
                action: 'Additional Documents Uploaded',
                details: `${newDocuments.length} new document(s) uploaded as requested.`,
            };
            
            // Revert status to 'Assigned' so the VLE can continue working.
            await updateDoc(taskRef, {
                status: 'Assigned', 
                documents: arrayUnion(...newDocuments),
                history: arrayUnion(historyEntry),
            });
    
            // Notify the assigned VLE that the documents are ready.
            if (task.assignedVleId) {
                 await createNotification(
                    task.assignedVleId,
                    'Documents Uploaded by Customer',
                    `The customer has uploaded the requested documents for task ${taskId.slice(-6).toUpperCase()}.`,
                    `/dashboard/task/${taskId}`
                );
            }
           
            toast({ title: "Upload Complete", description: "The VLE has been notified." });
            setSelectedFiles([]);
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (error) {
            console.error("Error uploading files:", error);
            toast({ title: "Upload Failed", description: "Could not upload documents. Please check permissions and try again.", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleVleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedCertificate(e.target.files[0]);
        }
    };

    const handleCertificateUpload = async () => {
        if (!selectedCertificate) {
            toast({ title: "No file selected", description: "Please choose a certificate to upload.", variant: "destructive" });
            return;
        }
        if (!userProfile || !user) {
            toast({ title: "Profile not loaded", description: "Please wait a moment and try again.", variant: "destructive" });
            return;
        }
        setIsCertUploading(true);
        
        try {
            const storageRef = ref(storage, `tasks/${taskId}/certificate/${selectedCertificate.name}`);
            await uploadBytes(storageRef, selectedCertificate);
            const downloadURL = await getDownloadURL(storageRef);
            const finalCertificate = { name: selectedCertificate.name, url: downloadURL };

            const taskRef = doc(db, 'tasks', taskId as string);
            const historyEntry = {
                timestamp: new Date().toISOString(),
                actorId: user.uid,
                actorRole: 'VLE',
                action: 'Task Completed & Certificate Uploaded',
                details: `Uploaded: ${finalCertificate.name}`,
            };
            
            await updateDoc(taskRef, {
                finalCertificate: finalCertificate,
                status: 'Completed',
                history: arrayUnion(historyEntry),
            });

            await createNotification(
                task.creatorId,
                'Your Certificate is Ready!',
                `The final certificate for task ${taskId.slice(-6).toUpperCase()} is available.`,
                `/dashboard/task/${taskId}`
            );
            
            toast({ title: "Certificate Uploaded", description: "The customer has been notified." });
            setSelectedCertificate(null);

        } catch (error) {
            console.error("Error uploading certificate:", error);
            toast({ title: "Upload Failed", description: "There was an error uploading the certificate.", variant: "destructive" });
        } finally {
            setIsCertUploading(false);
        }
    };
    
    const handlePayment = async () => {
        if (!userProfile || !user) {
            toast({ title: 'Error', description: 'User profile not loaded. Please try again.', variant: 'destructive' });
            setIsPaying(false);
            return;
        }
        setIsPaying(true);

        try {
            await runTransaction(db, async (transaction) => {
                const customerCollection = userProfile.role === 'vle' ? 'vles' : 'users';
                const customerRef = doc(db, customerCollection, user.uid);
                const taskRef = doc(db, 'tasks', taskId as string);

                const customerDoc = await transaction.get(customerRef);

                if (!customerDoc.exists()) {
                    throw new Error("User profile not found.");
                }

                const customerBalance = customerDoc.data().walletBalance || 0;
                if (customerBalance < task.rate) {
                    throw new Error("Insufficient wallet balance.");
                }

                // 1. Debit customer's wallet
                const newCustomerBalance = customerBalance - task.rate;
                transaction.update(customerRef, { walletBalance: newCustomerBalance });

                // 2. Update task status, ready for assignment
                const historyEntry = {
                    timestamp: new Date().toISOString(),
                    actorId: user.uid,
                    actorRole: userProfile.role === 'vle' ? 'VLE' : 'Customer',
                    action: 'Payment Completed',
                    details: `Paid ₹${task.rate.toFixed(2)}.`,
                };
                transaction.update(taskRef, {
                    status: 'Unassigned', // Task is now paid and ready for assignment
                    history: arrayUnion(historyEntry)
                });
            });

            toast({ title: 'Payment Successful!', description: `₹${task.rate.toFixed(2)} has been deducted from your wallet.` });
            
            await createNotificationForAdmins(
                'Task Paid & Ready for Assignment',
                `Task ${task.id.slice(-6).toUpperCase()} is now paid and awaits assignment.`,
                `/dashboard`
            );

        } catch (error: any) {
            console.error("Payment transaction failed: ", error);
            toast({ title: 'Payment Failed', description: error.message || "An unknown error occurred.", variant: 'destructive' });
        } finally {
            setIsPaying(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!task) {
        return (
            <div className="text-center">
                 <h1 className="text-2xl font-bold mb-4">Task Not Found</h1>
                 <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            </div>
        )
    }

    const isTaskCreator = user?.uid === task.creatorId;
    const isAssignedVle = user?.uid === task.assignedVleId;
    const isAdmin = userProfile?.isAdmin;

    if (!isTaskCreator && !isAssignedVle && !isAdmin) {
         return (
            <div className="text-center">
                 <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
                 <p className="mb-4">You do not have permission to view this task.</p>
                 <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            </div>
        )
    }

    const canVleTakeAction = isAssignedVle && (task.status === 'Assigned');
    const isVleInProgress = isAssignedVle && task.status === 'In Progress';
    const canAdminSetPrice = isAdmin && task.status === 'Pending Price Approval';
    const canCustomerPay = isTaskCreator && task.status === 'Awaiting Payment';
    const canUploadMoreDocs = (isTaskCreator || isAdmin) && task.status === 'Awaiting Documents';


    return (
        <div className="w-full space-y-6">
             <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">Task ID: {task.id.slice(-6).toUpperCase()}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Task Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="grid sm:grid-cols-2 gap-4">
                            <div><Label>Service</Label><p>{task.service}</p></div>
                            <div><Label>Status</Label><div><Badge variant="outline">{task.status}</Badge></div></div>
                            <div><Label>Customer</Label><p>{task.customer}</p></div>
                             <div>
                                <Label>Assigned VLE</Label>
                                <p>
                                    {task.assignedVleName ? `${task.assignedVleName} (ID: ${task.assignedVleId.slice(-6).toUpperCase()})` : 'N/A'}
                                </p>
                            </div>
                             {task.status !== 'Pending Price Approval' && <div><Label>Service Fee</Label><p>₹{task.rate?.toFixed(2)}</p></div>}
                            {task.acknowledgementNumber && (
                                <div className="sm:col-span-2"><Label>Acknowledgement #</Label><p>{task.acknowledgementNumber}</p></div>
                            )}
                        </CardContent>
                    </Card>

                    {canCustomerPay && (
                        <Card className="border-primary bg-primary/5">
                            <CardHeader>
                                <CardTitle>Action Required: Complete Payment</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="mb-4">The final price for this service has been set to <strong>₹{task.rate.toFixed(2)}</strong>. Please approve and pay to proceed.</p>
                                 <Button onClick={handlePayment} disabled={isPaying}>
                                    {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    Approve & Pay ₹{task.rate.toFixed(2)}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {task.finalCertificate && (
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" />Final Document</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <a href={task.finalCertificate.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                                    <FileText className="h-4 w-4" /> {task.finalCertificate.name}
                                </a>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Task History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative pl-6">
                                <div className="absolute left-0 top-0 h-full w-0.5 bg-border -translate-x-1/2 ml-3"></div>
                                {task.history?.sort((a:any, b:any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((entry: any, index: number) => (
                                    <div key={index} className="relative mb-6">
                                        <div className="absolute -left-[30px] top-1.5 h-3 w-3 rounded-full bg-primary border-2 border-background"></div>
                                        <p className="font-semibold">{entry.action}</p>
                                        <p className="text-sm text-muted-foreground">by {entry.actorRole} ({entry.actorId ? `ID: ${entry.actorId.slice(-6).toUpperCase()}` : 'System'})</p>
                                        <p className="text-sm mt-1">{entry.details}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(entry.timestamp), "PPp")}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                </div>

                <div className="space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {canAdminSetPrice && user && (
                                <SetPriceDialog taskId={task.id} customerId={task.creatorId} onPriceSet={() => {}} adminId={user.uid} />
                           )}
                           {canVleTakeAction && user ? (
                                <div className='flex flex-col gap-2'>
                                    <RequestInfoDialog taskId={task.id} vleId={user.uid} customerId={task.creatorId} />
                                    <SubmitAcknowledgementDialog taskId={task.id} vleId={user.uid} customerId={task.creatorId} />
                                </div>
                           ) : null }
                           
                           {isVleInProgress && (
                                <Card className="bg-muted/50">
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-base">Upload Final Certificate</CardTitle>
                                        <CardDescription className="text-xs">Upload the final document for the customer.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="flex gap-2">
                                            <Button type="button" onClick={() => vleFileInputRef.current?.click()} size="sm" variant="secondary">
                                                <FileUp className="mr-2 h-4 w-4"/> Choose File
                                            </Button>
                                        </div>
                                        <Input id="vle-documents" type="file" onChange={handleVleFileChange} ref={vleFileInputRef} className="hidden" />
                                        {selectedCertificate && (
                                            <div className="text-xs text-muted-foreground space-y-1 mt-2">
                                                <p className='font-medium'>Selected file:</p>
                                                <div className="flex items-center gap-2"><FileText className="h-3 w-3" /><span>{selectedCertificate.name}</span></div>
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className="p-4 pt-0">
                                        <Button onClick={handleCertificateUpload} disabled={isCertUploading || !selectedCertificate}>
                                            {isCertUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                                            Upload & Complete Task
                                        </Button>
                                    </CardFooter>
                                </Card>
                           )}
                           
                           {(!isAssignedVle && !isAdmin && !isTaskCreator && !canUploadMoreDocs && !canVleTakeAction && !isVleInProgress) && task.status !== 'Completed' && task.status !== 'Pending Price Approval' && task.status !== 'Awaiting Payment' && (
                             <p className="text-sm text-muted-foreground">There are no actions for you at this stage.</p>
                           )}
                        </CardContent>
                    </Card>
                    
                     {canUploadMoreDocs && userProfile && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Upload More Documents</CardTitle>
                                <CardDescription>The VLE has requested additional documents. Please upload them here.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        variant="secondary"
                                        className="bg-primary/20 text-primary hover:bg-primary/30"
                                    >
                                        <FileUp className="mr-2 h-4 w-4" /> Choose Files
                                    </Button>
                                </div>
                                <Input
                                    id="customer-documents"
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    ref={fileInputRef}
                                    className="hidden"
                                />
                                {selectedFiles.length > 0 && (
                                    <div className="text-xs text-muted-foreground space-y-1 mt-2">
                                        <p className="font-medium">Selected files:</p>
                                        {selectedFiles.map((file, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <FileText className="h-3 w-3" />
                                                <span>{file.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleUpload} disabled={isUploading || selectedFiles.length === 0}>
                                    {isUploading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <UploadCloud className="mr-2 h-4 w-4" />
                                    )}
                                    Upload Documents
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Uploaded Documents</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm">
                                {task.documents.map((doc: any, i: number) => (
                                    <li key={i}>
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-primary hover:underline break-words">
                                           <FileText className="h-4 w-4 mt-0.5 shrink-0" /> <span className="break-all">{doc.name}</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
