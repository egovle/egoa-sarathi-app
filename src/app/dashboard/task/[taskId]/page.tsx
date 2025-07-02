
'use client';

import { useEffect, useState, type FormEvent, useRef, type ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc, arrayUnion, addDoc, collection, runTransaction, query, where, limit, getDocs, getDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { createNotification, createNotificationForAdmins } from '@/app/dashboard/page';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, FileText, History, MessageSquarePlus, CheckCircle, Send, UploadCloud, Camera, FileUp, PenSquare, Wallet, CheckCircle2, XCircle, KeyRound, Phone, CircleDollarSign, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

// --- FILE VALIDATION ---
const fileValidationConfig = {
    allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'],
    maxSize: 1 * 1024 * 1024, // 1 MB
};

const validateFiles = (files: File[]): { isValid: boolean, message?: string } => {
    for (const file of files) {
        if (!fileValidationConfig.allowedTypes.includes(file.type)) {
            return { isValid: false, message: `Invalid file type: ${file.name}. Only PNG, JPG, JPEG, and PDF are allowed.` };
        }
        if (file.size > fileValidationConfig.maxSize) {
            return { isValid: false, message: `File is too large: ${file.name}. Maximum size is 1MB.` };
        }
    }
    return { isValid: true };
};


// --- TASK DETAIL PAGE DIALOGS ---

const RequestOtpDialog = ({ taskId, vleId, customerId }: { taskId: string, vleId: string, customerId: string }) => {
    const [open, setOpen] = useState(false);
    const [otpType, setOtpType] = useState<'mobile' | 'email' | ''>('');
    const { toast } = useToast();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!otpType) {
            toast({ title: "Selection Required", description: "Please select OTP type (Mobile or Email).", variant: "destructive" });
            return;
        }

        const taskRef = doc(db, "tasks", taskId);
        const historyEntry = {
            timestamp: new Date().toISOString(),
            actorId: vleId,
            actorRole: 'VLE',
            action: 'OTP Requested',
            details: `VLE requested ${otpType} OTP from the customer.`,
        };

        try {
            await updateDoc(taskRef, {
                otpRequest: {
                    type: otpType,
                    status: 'pending',
                    requestedAt: new Date().toISOString()
                },
                history: arrayUnion(historyEntry)
            });
            await createNotification(
                customerId,
                'OTP Required for Your Task',
                `The VLE working on task ${taskId.slice(-6).toUpperCase()} needs an OTP to proceed.`,
                `/dashboard/task/${taskId}`
            );
            toast({ title: 'OTP Request Sent', description: 'The customer has been notified.' });
            setOpen(false);
        } catch (error) {
            console.error("Error requesting OTP:", error);
            toast({ title: "Error", description: "Failed to send OTP request.", variant: "destructive" });
        }
    };
    
    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setOtpType('');
        }
        setOpen(isOpen);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline"><KeyRound />Request OTP</Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Request OTP</DialogTitle>
                        <DialogDescription>
                            The portal will notify the customer that you need an OTP. They will contact you directly to provide it. This request will be logged.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>What type of OTP do you need?</Label>
                        <RadioGroup value={otpType} onValueChange={(value) => setOtpType(value as 'mobile' | 'email')} className="mt-2">
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="mobile" id="otp-mobile" />
                                <Label htmlFor="otp-mobile">Mobile OTP</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="email" id="otp-email" />
                                <Label htmlFor="otp-email">Email OTP</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <DialogFooter>
                        <Button type="submit"><Send /> Send Request</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};


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
                totalPaid: finalRate, // Use totalPaid to align with new model
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
                <Button><PenSquare />Set Final Price</Button>
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
                <Button variant="outline"><MessageSquarePlus />Request More Information</Button>
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
                        <Button type="submit"><Send /> Send Request</Button>
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
            console.error("Error submitting acknowledgement:", error);
            toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><CheckCircle />Submit Acknowledgement</Button>
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

const UploadCertificateDialog = ({ taskId, vleId, customerId, onUploadComplete }: { taskId: string, vleId: string, customerId: string, onUploadComplete: () => void }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState<File | null>(null);
    const [isCertUploading, setIsCertUploading] = useState(false);
    const vleFileInputRef = useRef<HTMLInputElement>(null);

    const handleVleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const validation = validateFiles([file]);
            if (!validation.isValid) {
                toast({ title: 'Validation Error', description: validation.message, variant: 'destructive' });
                return;
            }
            setSelectedCertificate(file);
        }
    };

    const handleCertificateUpload = async () => {
        if (!selectedCertificate || !vleId) {
            toast({ title: "Cannot Upload", description: "Please select a certificate file.", variant: "destructive" });
            return;
        }
        setIsCertUploading(true);
        
        try {
            const storageRef = ref(storage, `tasks/${taskId}/certificate/${selectedCertificate.name}`);
            const metadata = { customMetadata: { uploaderId: vleId } };
            await uploadBytes(storageRef, selectedCertificate, metadata);
            const downloadURL = await getDownloadURL(storageRef);
            const finalCertificate = { name: selectedCertificate.name, url: downloadURL };

            const taskRef = doc(db, 'tasks', taskId as string);
            const historyEntry = {
                timestamp: new Date().toISOString(),
                actorId: vleId,
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
                customerId,
                'Your Certificate is Ready!',
                `The final certificate for task ${String(taskId).slice(-6).toUpperCase()} is available.`,
                `/dashboard/task/${taskId}`
            );
            
            toast({ title: "Certificate Uploaded", description: "The customer has been notified and the task is now complete." });
            setOpen(false);
            onUploadComplete();
        } catch (error: any) {
            console.error("Error uploading certificate:", error);
            toast({ title: "Upload Failed", description: "There was an error uploading the certificate.", variant: "destructive" });
        } finally {
            setIsCertUploading(false);
        }
    };
    
    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setSelectedCertificate(null);
            setIsCertUploading(false);
        }
        setOpen(isOpen);
    }
    
    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button><UploadCloud /> Upload Final Certificate</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upload Final Certificate</DialogTitle>
                    <DialogDescription>Upload the final document for the customer. This will mark the task as "Completed".</DialogDescription>
                </DialogHeader>
                 <div className="py-4 space-y-2">
                    <Button type="button" onClick={() => vleFileInputRef.current?.click()} size="sm" variant="secondary" className='w-full'>
                        <FileUp /> Choose File
                    </Button>
                    <Input id="vle-documents" type="file" onChange={handleVleFileChange} ref={vleFileInputRef} className="hidden" />
                    {selectedCertificate && (
                        <div className="text-xs text-muted-foreground space-y-1 pt-1">
                            <p className='font-medium'>Selected file:</p>
                            <div className="flex items-center gap-2"><FileText className="h-3 w-3" /><span>{selectedCertificate.name}</span></div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={handleCertificateUpload} disabled={isCertUploading || !selectedCertificate} className='w-full'>
                        {isCertUploading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
                        Upload & Complete Task
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- REAL-TIME CHAT COMPONENT ---
const TaskChat = ({ taskId, task, user, userProfile }: { taskId: string, task: any, user: any, userProfile: any }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const messagesRef = collection(db, `taskChats/${taskId}/messages`);
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(newMessages);
        });

        return () => unsubscribe();
    }, [taskId]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;
        setIsSending(true);

        const messageData = {
            text: newMessage.trim(),
            senderId: user.uid,
            senderName: userProfile.name,
            senderRole: userProfile.isAdmin ? 'Admin' : userProfile.role,
            timestamp: serverTimestamp(),
        };

        try {
            await addDoc(collection(db, `taskChats/${taskId}/messages`), messageData);
            setNewMessage('');
            
            // Send notifications to other participants
            const adminsQuery = query(collection(db, "vles"), where("isAdmin", "==", true));
            const adminSnapshot = await getDocs(adminsQuery);
            const adminIds = adminSnapshot.docs.map(doc => doc.id);
            const participantIds = new Set([task.creatorId, task.assignedVleId, ...adminIds].filter(id => id && id !== user.uid));

            for (const id of participantIds) {
                await createNotification(
                    id,
                    `New message in Task #${taskId.slice(-6).toUpperCase()}`,
                    `${userProfile.name}: "${newMessage.trim()}"`,
                    `/dashboard/task/${taskId}`
                );
            }
        } catch (error) {
            console.error("Error sending message:", error);
            toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Task Chat</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-64 overflow-y-auto space-y-4 pr-2 flex flex-col">
                    {messages.length > 0 ? (
                        messages.map(msg => (
                            <div key={msg.id} className={cn("flex flex-col", msg.senderId === user.uid ? "items-end" : "items-start")}>
                                <div className={cn("p-2 rounded-lg max-w-xs md:max-w-md", msg.senderId === user.uid ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                    <p className="font-bold text-xs">{msg.senderName}</p>
                                    <p className="text-sm break-words">{msg.text}</p>
                                    {msg.timestamp && (
                                        <p className="text-xs opacity-70 mt-1 text-right">
                                            {formatDistanceToNow(msg.timestamp.toDate(), { addSuffix: true })}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                            No messages yet. Start the conversation!
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </CardContent>
            <CardFooter>
                <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
                    <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        rows={1}
                        className="flex-1 resize-none"
                        disabled={isSending}
                    />
                    <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                        {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                    </Button>
                </form>
            </CardFooter>
        </Card>
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
    const [vleContact, setVleContact] = useState<string | null>(null);
    
    // State for additional document uploads
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    const isTaskCreator = user?.uid === task?.creatorId;
    const isAssignedVle = user?.uid === task?.assignedVleId;
    const isAdmin = userProfile?.isAdmin;

     useEffect(() => {
        if (task?.assignedVleId && (isTaskCreator || isAdmin)) {
            const getVleContact = async () => {
                const vleDocRef = doc(db, 'vles', task.assignedVleId);
                const vleDocSnap = await getDoc(vleDocRef);
                if (vleDocSnap.exists()) {
                    setVleContact(vleDocSnap.data().mobile);
                }
            };
            getVleContact();
        }
    }, [task, isTaskCreator, isAdmin]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const validation = validateFiles(files);
            if (!validation.isValid) {
                toast({ title: 'Validation Error', description: validation.message, variant: 'destructive' });
                return;
            }
            setSelectedFiles((prev) => [...prev, ...files]);
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0 || !user || !userProfile || !task) {
            toast({ 
                title: "Cannot Upload", 
                description: selectedFiles.length === 0 ? "Please select at least one file." : "User or task data not loaded.",
                variant: "destructive"
            });
            return;
        }
        setIsUploading(true);
    
        try {
            const uploadPromises = selectedFiles.map(async (file) => {
                const storageRef = ref(storage, `tasks/${taskId}/${Date.now()}_${file.name}`);
                const metadata = { customMetadata: { uploaderId: user.uid } };
                await uploadBytes(storageRef, file, metadata);
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
                details: `${newDocuments.length} new document(s) uploaded.`,
            };
            
            // This needs to be updated for the new map structure. For now, we are disabling this feature.
            // await updateDoc(taskRef, {
            //     status: 'Assigned', 
            //     documents: arrayUnion(...newDocuments),
            //     history: arrayUnion(historyEntry),
            // });
    
            if (task.assignedVleId) {
                 await createNotification(
                    task.assignedVleId,
                    'Documents Uploaded by Customer',
                    `The customer has uploaded the requested documents for task ${String(taskId).slice(-6).toUpperCase()}.`,
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
    
    const handlePayment = async () => {
        if (!userProfile || !user || !task) {
            toast({ title: 'Error', description: 'User profile not loaded. Please try again.', variant: 'destructive' });
            setIsPaying(false);
            return;
        }
        setIsPaying(true);

        const adminsQuery = query(collection(db, "vles"), where("isAdmin", "==", true), limit(1));
        const adminSnapshot = await getDocs(adminsQuery);
        if (adminSnapshot.empty) {
            toast({ title: "System Error", description: "No admin account configured to receive payments.", variant: "destructive"});
            setIsPaying(false);
            return;
        }
        const adminRef = adminSnapshot.docs[0].ref;

        try {
            await runTransaction(db, async (transaction) => {
                const customerCollection = userProfile.role === 'vle' ? 'vles' : 'users';
                const customerRef = doc(db, customerCollection, user.uid);
                const taskRef = doc(db, 'tasks', taskId as string);

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
                    actorId: user.uid,
                    actorRole: userProfile.role === 'vle' ? 'VLE' : 'Customer',
                    action: 'Payment Completed',
                    details: `Paid ₹${task.totalPaid.toFixed(2)}.`,
                };
                transaction.update(taskRef, {
                    status: 'Unassigned',
                    history: arrayUnion(historyEntry)
                });
            });

            toast({ title: 'Payment Successful!', description: `₹${task.totalPaid.toFixed(2)} has been deducted from your wallet.` });
            
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
    
    const handleFulfillOtp = async () => {
        if (!user || !task) return;
        const taskRef = doc(db, "tasks", taskId as string);

        const historyEntry = {
            timestamp: new Date().toISOString(),
            actorId: user.uid,
            actorRole: 'VLE',
            action: 'OTP Request Fulfilled',
            details: 'VLE confirmed receipt of OTP.',
        };

        try {
            await updateDoc(taskRef, {
                otpRequest: null,
                history: arrayUnion(historyEntry)
            });
            toast({ title: 'OTP Confirmed', description: 'You can now proceed with the task.' });
        } catch (error) {
            console.error("Error fulfilling OTP:", error);
            toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
        }
    }

    const handleApprovePayout = async (task: any) => {
        if (!user || !userProfile?.isAdmin || !task.assignedVleId || !task.totalPaid) {
            toast({ title: 'Error', description: 'Cannot process payout. Missing required information.', variant: 'destructive' });
            return;
        }
    
        const adminRef = doc(db, "vles", user.uid);
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
                    actorId: user.uid,
                    actorRole: 'Admin',
                    action: 'Payout Approved',
                    details: historyDetails
                };
    
                transaction.update(taskRef, {
                    status: 'Paid Out',
                    history: arrayUnion(historyEntry)
                });
            });
    
            toast({ title: 'Payout Approved!', description: payoutDetailsToast });
            await createNotification(task.assignedVleId, 'Payment Received', `You have received a payment for task ${task.id.slice(-6).toUpperCase()}.`);
    
        } catch (error: any) {
            console.error("Payout transaction failed:", error);
            toast({ title: 'Payout Failed', description: error.message || 'An unknown error occurred.', variant: 'destructive' });
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

    const canSeeFullHistory = isAdmin || isAssignedVle;

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
    const canAdminApprovePayout = isAdmin && task.status === 'Completed';
    const canCustomerPay = isTaskCreator && task.status === 'Awaiting Payment';
    const canUploadMoreDocs = (isTaskCreator || isAdmin) && task.status === 'Awaiting Documents' && false; // Temporarily disabled
    
    const isOtpRequestPending = task.otpRequest?.status === 'pending';

    const displayStatus = task.status === 'Paid Out' && isTaskCreator ? 'Completed' : task.status;
    
    const getEarningsDetails = () => {
        const governmentFee = task.governmentFeeApplicable || 0;
        const serviceProfit = (task.totalPaid || 0) - governmentFee;
        const vleCommission = serviceProfit * 0.8;
        return { governmentFee, vleCommission };
    };

    return (
        <div className="w-full space-y-6">
            {isTaskCreator && isOtpRequestPending && (
                <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10 text-yellow-800">
                    <KeyRound className="h-4 w-4 !text-yellow-600" />
                    <AlertTitle className="font-bold">Action Required: OTP Needed by VLE</AlertTitle>
                    <AlertDescription>
                        <p className="mb-2">The VLE needs an OTP to proceed with your request. Please contact them directly to provide the code.</p>
                        {vleContact && (
                            <div className="flex items-center gap-2 font-medium">
                                <p>VLE: {task.assignedVleName}</p>
                                <a href={`tel:${vleContact}`} className="flex items-center gap-1.5 text-primary hover:underline"><Phone className="h-3 w-3" />{vleContact}</a>
                            </div>
                        )}
                    </AlertDescription>
                </Alert>
            )}
             <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">Task ID: {task.id.slice(-6).toUpperCase()}</p>
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Task Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="grid sm:grid-cols-2 gap-4">
                            <div><Label>Service</Label><p>{task.service}</p></div>
                            <div><Label>Status</Label><div><Badge variant="outline">{displayStatus}</Badge></div></div>
                            <div><Label>Customer</Label><p>{task.customer}</p></div>
                             <div>
                                <Label>Assigned VLE</Label>
                                <p>
                                    {canSeeFullHistory && task.assignedVleName 
                                        ? `${task.assignedVleName} (ID: ${task.assignedVleId ? task.assignedVleId.slice(-6).toUpperCase() : 'N/A'})` 
                                        : (task.assignedVleName ? 'Assigned' : 'N/A')
                                    }
                                </p>
                            </div>
                             {task.status !== 'Pending Price Approval' && <div><Label>Service Fee</Label><p>₹{task.totalPaid?.toFixed(2)}</p></div>}
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
                                <p className="mb-4">The final price for this service has been set to <strong>₹{task.totalPaid.toFixed(2)}</strong>. Please approve and pay to proceed.</p>
                                 <Button onClick={handlePayment} disabled={isPaying}>
                                    {isPaying ? <Loader2 className="animate-spin" /> : <Wallet />}
                                    Approve & Pay ₹{task.totalPaid.toFixed(2)}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {user && userProfile && (
                        <TaskChat taskId={taskId as string} task={task} user={user} userProfile={userProfile} />
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
                                        <p className="text-sm text-muted-foreground">
                                             {
                                                canSeeFullHistory || entry.actorRole === 'Customer' || entry.actorRole === 'Admin'
                                                ? `by ${entry.actorRole} (${entry.actorId ? `ID: ${entry.actorId.slice(-6).toUpperCase()}` : 'System'})`
                                                : `by VLE`
                                            }
                                        </p>
                                        <p className="text-sm mt-1">
                                            {
                                                canSeeFullHistory || entry.action !== 'Task Assigned'
                                                ? entry.details
                                                : `Task has been assigned for processing. Fee of ₹${task.totalPaid?.toFixed(2) || '0.00'} processed.`
                                            }
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(entry.timestamp), "dd/MM/yyyy, p")}</p>
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
                           
                           {isOtpRequestPending && isAssignedVle && (
                                <Button onClick={handleFulfillOtp} className="w-full">
                                    <CheckCircle /> Mark OTP as Received
                                </Button>
                           )}

                           {!isOtpRequestPending && canVleTakeAction && user ? (
                                <div className='flex flex-col gap-2'>
                                    <RequestInfoDialog taskId={task.id} vleId={user.uid} customerId={task.creatorId} />
                                    <SubmitAcknowledgementDialog taskId={task.id} vleId={user.uid} customerId={task.creatorId} />
                                    <RequestOtpDialog taskId={task.id} vleId={user.uid} customerId={task.creatorId} />
                                </div>
                           ) : null }
                           
                           {!isOtpRequestPending && isVleInProgress && user ? (
                               <div className='flex flex-col gap-2'>
                                   <RequestInfoDialog taskId={task.id} vleId={user.uid} customerId={task.creatorId} />
                                   <UploadCertificateDialog taskId={task.id} vleId={user.uid} customerId={task.creatorId} onUploadComplete={() => {}} />
                                    <RequestOtpDialog taskId={task.id} vleId={user.uid} customerId={task.creatorId} />
                               </div>
                           ) : null }
                           
                           {canAdminApprovePayout && (
                               <Button onClick={() => handleApprovePayout(task)}>
                                   <CircleDollarSign className="mr-2 h-4 w-4" /> Approve Payout
                               </Button>
                           )}
                           
                           {(!isAssignedVle && !isAdmin && !isTaskCreator && !canUploadMoreDocs && !canVleTakeAction && !isVleInProgress && !canAdminSetPrice && !canAdminApprovePayout) && task.status !== 'Completed' && task.status !== 'Pending VLE Acceptance' && task.status !== 'Awaiting Payment' && task.status !== 'Paid Out' &&(
                             <p className="text-sm text-muted-foreground">There are no actions for you at this stage.</p>
                           )}
                        </CardContent>
                    </Card>

                    {isAssignedVle && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5"/>Your Earnings</CardTitle>
                                <CardDescription>This is a breakdown of what you will receive upon task completion.</CardDescription>
                            </CardHeader>
                             <CardContent className="text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Govt. Fee (if any)</span>
                                    <span>+ ₹{getEarningsDetails().governmentFee.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Your Commission (80%)</span>
                                    <span>+ ₹{getEarningsDetails().vleCommission.toFixed(2)}</span>
                                </div>
                                <Separator className="my-2"/>
                                 <div className="flex justify-between font-bold">
                                    <span>Total Payout</span>
                                    <span>₹{(getEarningsDetails().governmentFee + getEarningsDetails().vleCommission).toFixed(2)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    
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
                                        <FileUp /> Choose Files
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
                                    {isUploading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
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
                            <ul className="space-y-3 text-sm">
                                {task.documents && Object.entries(task.documents).map(([key, doc]: [string, any]) => (
                                    <li key={key}>
                                        <p className="font-semibold capitalize text-muted-foreground">{key.replace(/_/g, ' ')}</p>
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline break-words">
                                           <FileText className="h-4 w-4 mt-0.5 shrink-0" /> <span className="break-all">{doc.name}</span>
                                        </a>
                                    </li>
                                ))}
                                {(!task.documents || Object.keys(task.documents).length === 0) && (
                                    <p className="text-xs text-muted-foreground">No documents uploaded for this task yet.</p>
                                )}
                            </ul>
                        </CardContent>
                    </Card>
                    
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

                </div>
            </div>
        </div>
    );
}
