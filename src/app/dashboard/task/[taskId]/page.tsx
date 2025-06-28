
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

// --- NOTIFICATION HELPER ---
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


// --- TASK DETAIL PAGE DIALOGS ---

const SetPriceDialog = ({ taskId, customerId, onPriceSet }: { taskId: string, customerId: string, onPriceSet: () => void }) => {
    const [open, setOpen] = useState(false);
    const [price, setPrice] = useState('');
    const { toast } = useToast();
    const { userProfile } = useAuth();

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
            actorName: userProfile?.name || 'Admin',
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

const RequestInfoDialog = ({ taskId, vleName, customerId }: { taskId:string, vleName: string, customerId: string }) => {
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
            actorName: vleName,
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

const CompleteTaskDialog = ({ taskId, vleName, customerId }: { taskId: string, vleName: string, customerId: string }) => {
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
            actorName: vleName,
            actorRole: 'VLE',
            action: 'Task Completed',
            details: `Acknowledgement No: ${ackNumber}`,
        };

        try {
            await updateDoc(taskRef, {
                status: 'Completed',
                acknowledgementNumber: ackNumber,
                history: arrayUnion(historyEntry)
            });
             await createNotification(
                customerId,
                'Your Task is Complete!',
                `Task ${taskId.slice(-6).toUpperCase()} has been marked as complete.`,
                `/dashboard/task/${taskId}`
            );
            toast({ title: 'Task Marked as Complete', description: 'The customer has been notified.' });
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
                <Button><CheckCircle className="mr-2 h-4 w-4" />Mark as Complete</Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Complete Task</DialogTitle>
                        <DialogDescription>
                            Enter the acknowledgement number from the government portal. This will mark the task as complete.
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

    // State for customer uploads
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const customerFileInputRef = useRef<HTMLInputElement>(null);

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

    const handleCustomerFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
        }
    };

    const handleVleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedCertificate(e.target.files[0]);
        }
    };

    const handleCustomerUpload = async () => {
        if (selectedFiles.length === 0) {
            toast({ title: "No files selected", description: "Please choose files to upload.", variant: "destructive" });
            return;
        }
        setIsUploading(true);

        const uploadPromises = selectedFiles.map(async (file) => {
            const storageRef = ref(storage, `tasks/${taskId}/${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            return { name: file.name, url: downloadURL };
        });

        try {
            const newDocuments = await Promise.all(uploadPromises);
            const taskRef = doc(db, 'tasks', taskId as string);
            const historyEntry = {
                timestamp: new Date().toISOString(),
                actorName: userProfile?.name || 'Customer',
                actorRole: 'Customer',
                action: 'Documents Uploaded',
                details: `${newDocuments.length} new document(s) were uploaded.`,
            };
            
            await updateDoc(taskRef, {
                status: 'Assigned', // Revert status so VLE can review again
                documents: arrayUnion(...newDocuments),
                history: arrayUnion(historyEntry),
            });

            await createNotification(
                task.assignedVleId,
                'New Documents Uploaded',
                `The customer has uploaded new documents for task ${taskId.slice(-6).toUpperCase()}.`,
                `/dashboard/task/${taskId}`
            );
            
            toast({ title: "Upload Complete", description: "The VLE has been notified." });
            setSelectedFiles([]);

        } catch (error) {
            console.error("Error uploading files:", error);
            toast({ title: "Upload Failed", description: "There was an error uploading your files.", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleCertificateUpload = async () => {
        if (!selectedCertificate) {
            toast({ title: "No file selected", description: "Please choose a certificate to upload.", variant: "destructive" });
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
                actorName: userProfile?.name || 'VLE',
                actorRole: 'VLE',
                action: 'Final Certificate Uploaded',
                details: `Uploaded: ${finalCertificate.name}`,
            };
            
            await updateDoc(taskRef, {
                finalCertificate: finalCertificate,
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
        if (!userProfile) {
            toast({ title: 'Error', description: 'User profile not loaded. Please try again.', variant: 'destructive' });
            setIsPaying(false);
            return;
        }
        setIsPaying(true);

        const adminQuery = query(collection(db, 'vles'), where('isAdmin', '==', true), limit(1));
        const adminSnapshot = await getDocs(adminQuery);
        if (adminSnapshot.empty) {
            toast({ title: 'Error', description: 'Could not find an admin account to process payment.', variant: 'destructive' });
            setIsPaying(false);
            return;
        }
        const adminUser = { id: adminSnapshot.docs[0].id, ...adminSnapshot.docs[0].data() };

        try {
            await runTransaction(db, async (transaction) => {
                const customerRef = doc(db, userProfile.role === 'vle' ? 'vles' : 'users', user!.uid);
                const adminRef = doc(db, 'vles', adminUser.id);
                const taskRef = doc(db, 'tasks', taskId as string);

                const [customerDoc, adminDoc] = await Promise.all([transaction.get(customerRef), transaction.get(adminRef)]);

                if (!customerDoc.exists() || !adminDoc.exists()) throw new Error("User or admin not found.");

                const customerBalance = customerDoc.data().walletBalance || 0;
                if (customerBalance < task.rate) throw new Error("Insufficient wallet balance.");

                const newCustomerBalance = customerBalance - task.rate;
                const newAdminBalance = (adminDoc.data().walletBalance || 0) + task.rate;

                transaction.update(customerRef, { walletBalance: newCustomerBalance });
                transaction.update(adminRef, { walletBalance: newAdminBalance });

                const historyEntry = {
                    timestamp: new Date().toISOString(),
                    actorName: userProfile.name,
                    actorRole: userProfile.role,
                    action: 'Payment Completed',
                    details: `Paid ₹${task.rate.toFixed(2)}.`,
                };
                transaction.update(taskRef, {
                    status: 'Unassigned',
                    history: arrayUnion(historyEntry)
                });
            });

            toast({ title: 'Payment Successful!', description: `₹${task.rate.toFixed(2)} has been deducted from your wallet.` });

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
    const canAdminSetPrice = isAdmin && task.status === 'Pending Price Approval';
    const canCustomerPay = isTaskCreator && task.status === 'Awaiting Payment';


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
                            <div><Label>Status</Label><p><Badge variant="outline">{task.status}</Badge></p></div>
                            <div><Label>Customer</Label><p>{task.customer}</p></div>
                            <div><Label>Assigned VLE</Label><p>{task.assignedVleName || 'N/A'}</p></div>
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
                                        <p className="text-sm text-muted-foreground">by {entry.actorName} ({entry.actorRole})</p>
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
                           {canAdminSetPrice && (
                                <SetPriceDialog taskId={task.id} customerId={task.creatorId} onPriceSet={() => {}} />
                           )}
                           {canVleTakeAction && userProfile ? (
                                <div className='flex flex-col gap-2'>
                                    <RequestInfoDialog taskId={task.id} vleName={userProfile.name} customerId={task.creatorId} />
                                    <CompleteTaskDialog taskId={task.id} vleName={userProfile.name} customerId={task.creatorId} />
                                </div>
                           ) : (
                                <p className="text-sm text-muted-foreground">
                                    {isAssignedVle ? "This task is not in a state where actions can be taken." : ""}
                                </p>
                           )}
                           {isAssignedVle && task.status === 'Completed' && (
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
                                            Upload Certificate
                                        </Button>
                                    </CardFooter>
                                </Card>
                           )}

                           {!isAssignedVle && !isAdmin && <p className="text-sm text-muted-foreground">You are viewing this task as the customer.</p>}
                           {isAdmin && !isAssignedVle && <p className="text-sm text-muted-foreground">You are viewing this task as an admin.</p>}
                        </CardContent>
                    </Card>
                    
                    {isTaskCreator && task.status === 'Awaiting Documents' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Upload More Documents</CardTitle>
                                <CardDescription>The VLE has requested additional documents. Please upload them here.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2">
                                    <Button type="button" onClick={() => customerFileInputRef.current?.click()} variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30">
                                        <FileUp className="mr-2 h-4 w-4"/> Choose Files
                                    </Button>
                                </div>
                                <Input id="customer-documents" type="file" multiple onChange={handleCustomerFileChange} ref={customerFileInputRef} className="hidden" />
                                {selectedFiles.length > 0 && (
                                    <div className="text-xs text-muted-foreground space-y-1 mt-2">
                                        <p className='font-medium'>Selected files:</p>
                                        {selectedFiles.map((file, i) => <div key={i} className="flex items-center gap-2"><FileText className="h-3 w-3" /><span>{file.name}</span></div>)}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleCustomerUpload} disabled={isUploading || selectedFiles.length === 0}>
                                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
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
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                                           <FileText className="h-4 w-4" /> {doc.name}
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
