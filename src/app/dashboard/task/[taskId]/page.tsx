
'use client';

import { useEffect, useState, useRef, type ChangeEvent, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { createNotification, processPayout, payForVariablePriceTask, createNotificationForAdmins } from '@/app/actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, History, CheckCircle, Wallet, Phone, CircleDollarSign, User, Mail, FileUp, Info, ListChecks } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn, validateFiles, calculateVleEarnings } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { TaskChat } from '@/components/dashboard/task/TaskChat';
import { SetPriceDialog, RequestInfoDialog, SubmitAcknowledgementDialog, UploadCertificateDialog } from '@/components/dashboard/task/TaskDialogs';
import type { Task, HistoryEntry } from '@/lib/types';


export default function TaskDetailPage() {
    const { taskId } = useParams();
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPaying, setIsPaying] = useState(false);
    const [vleContact, setVleContact] = useState<string | null>(null);
    const [isPayoutProcessing, setIsPayoutProcessing] = useState(false);
    const [informationRequest, setInformationRequest] = useState<string | null>(null);
    
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!taskId) return;
        const taskRef = doc(db, 'tasks', taskId as string);
        const unsubscribe = onSnapshot(taskRef, (docSnap) => {
            if (docSnap.exists()) {
                const taskData = { id: docSnap.id, ...docSnap.data() } as Task;
                setTask(taskData);
                
                if (taskData.status === 'Awaiting Documents') {
                    const lastRequest = taskData.history?.slice().reverse().find((h: HistoryEntry) => h.action === 'Information Requested');
                    if (lastRequest) {
                        setInformationRequest(lastRequest.details);
                    }
                } else {
                    setInformationRequest(null);
                }

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
                const vleDocRef = doc(db, 'vles', task.assignedVleId as string);
                const vleDocSnap = await getDoc(vleDocRef);
                if (vleDocSnap.exists()) {
                    setVleContact(vleDocSnap.data().mobile);
                }
            };
            getVleContact();
        }
    }, [task, isTaskCreator, isAdmin]);

    const groupedDocuments = useMemo(() => {
        if (!task?.documents) return {};
        
        return task.documents.reduce((acc: Record<string, any[]>, doc: any) => {
            const groupKey = doc.groupKey || 'additional_documents';
            if (!acc[groupKey]) {
                acc[groupKey] = [];
            }
            acc[groupKey].push(doc);
            return acc;
        }, {});
    }, [task?.documents]);

    const documentGroupsToRender = useMemo(() => {
        return Object.keys(groupedDocuments).reduce((acc, key) => {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            acc[key] = { label, docs: groupedDocuments[key] };
            return acc;
        }, {} as Record<string, {label: string, docs: any[]}>);
    }, [groupedDocuments]);

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
                const metadata = { customMetadata: { uploaderId: user.uid, groupKey: 'additional_documents', optionKey: 'user_upload' } };
                const snapshot = await uploadBytes(storageRef, file, metadata);
                const downloadURL = await getDownloadURL(snapshot.ref);
                return { name: file.name, url: downloadURL, groupKey: 'additional_documents', optionKey: 'user_upload' };
            });
    
            const newDocuments = await Promise.all(uploadPromises);
    
            const taskRef = doc(db, 'tasks', taskId as string);
            
            const actorRole = userProfile.isAdmin ? 'Admin' : (userProfile.role === 'vle' ? 'VLE' : 'Customer');

            const historyEntry: HistoryEntry = {
                timestamp: new Date().toISOString(),
                actorId: user.uid,
                actorRole: actorRole,
                action: 'Additional Documents Uploaded',
                details: `${newDocuments.length} new document(s) uploaded.`,
            };

            const updateData: any = {
                documents: arrayUnion(...newDocuments),
                history: arrayUnion(historyEntry),
            };

            if (task.status === 'Awaiting Documents') {
                updateData.status = task.acknowledgementNumber ? 'In Progress' : 'Assigned';
            }
            
            await updateDoc(taskRef, updateData);

            const taskIdentifier = `task ${String(taskId).slice(-6).toUpperCase()}`;

            if (task.assignedVleId && task.assignedVleId !== user.uid) {
                 await createNotification(
                    task.assignedVleId,
                    `Documents Uploaded for ${taskIdentifier}`,
                    `${actorRole} has uploaded new documents.`,
                    `/dashboard/task/${taskId}`
                );
            }

            if (task.creatorId && task.creatorId !== user.uid) {
                 await createNotification(
                    task.creatorId,
                    `Documents Uploaded for Your Task`,
                    `${actorRole} has uploaded documents for ${taskIdentifier}.`,
                    `/dashboard/task/${taskId}`
                );
            }

            if (!userProfile.isAdmin) {
                await createNotificationForAdmins(
                    `Docs Uploaded for Task #${String(taskId).slice(-6).toUpperCase()}`,
                    `${actorRole} has uploaded additional documents.`,
                    `/dashboard/task/${taskId}`
                );
            }
           
            toast({ title: "Upload Complete", description: "The relevant parties have been notified." });
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
            return;
        }
        setIsPaying(true);
    
        try {
            const result = await payForVariablePriceTask(task, userProfile);
    
            if (result.success) {
                toast({ title: 'Payment Successful!', description: `₹${task.totalPaid.toFixed(2)} has been deducted from your wallet.` });
            } else {
                throw new Error(result.error || "An unknown error occurred during payment.");
            }
        } catch (error: any) {
            console.error("Payment transaction failed: ", error);
            toast({ title: 'Payment Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsPaying(false);
        }
    };
    
    const handleApprovePayout = async (task: Task) => {
        if (!user || !userProfile?.isAdmin) {
            toast({ title: 'Error', description: 'Permission denied.', variant: 'destructive' });
            return;
        }
        
        setIsPayoutProcessing(true);
        try {
            const result = await processPayout(task, user.uid);
            if (result.success) {
                toast({ title: 'Payout Approved!', description: result.message });
            } else {
                toast({ title: 'Payout Failed', description: result.error, variant: 'destructive' });
            }
        } finally {
            setIsPayoutProcessing(false);
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
    
    const canVleTakeAction = isAssignedVle && task.status === 'Assigned' && !task.acknowledgementNumber;
    const canVleWorkOnTask = isAssignedVle && (task.status === 'In Progress' || (task.status === 'Assigned' && task.acknowledgementNumber));
    const canAdminSetPrice = isAdmin && task.status === 'Pending Price Approval';
    const canAdminApprovePayout = isAdmin && task.status === 'Completed';
    const canCustomerPay = isTaskCreator && task.status === 'Awaiting Payment';
    const canUploadMoreDocs = (isTaskCreator || isAdmin || isAssignedVle) && task.status === 'Awaiting Documents';

    const displayStatus = task.status === 'Paid Out' && isTaskCreator ? 'Completed' : task.status;
    
    const earnings = calculateVleEarnings(task);
    const formDataEntries = Object.entries(task.formData || {});

    return (
        <div className="w-full space-y-6">
            {(isTaskCreator || isAdmin) && informationRequest && (
                 <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10 text-yellow-800">
                    <Info className="h-4 w-4 !text-yellow-800" />
                    <AlertTitle className="font-bold">Action Required: More Information Needed</AlertTitle>
                    <AlertDescription>
                        <p className="mb-2">The VLE has requested the following to proceed with your request:</p>
                        <p className="font-semibold italic">"{informationRequest}"</p>
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
                            <div>
                                <Label>Total Service Fee</Label>
                                {task.status === 'Pending Price Approval' 
                                    ? <p className="text-muted-foreground">To be determined</p>
                                    : <p>₹{task.totalPaid?.toFixed(2)}</p>
                                }
                            </div>
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
                        <div className="h-[600px] flex flex-col">
                            <TaskChat taskId={taskId as string} task={task} user={user} userProfile={userProfile} />
                        </div>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Task History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative pl-6">
                                <div className="absolute left-0 top-0 h-full w-0.5 bg-border -translate-x-1/2 ml-3"></div>
                                {task.history?.sort((a: HistoryEntry, b: HistoryEntry) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((entry: HistoryEntry, index: number) => (
                                    <div key={index} className="relative mb-6">
                                        <div className="absolute -left-[30px] top-1.5 h-3 w-3 rounded-full bg-primary border-2 border-background"></div>
                                        <p className="font-semibold">{entry.action}</p>
                                        <p className="text-sm text-muted-foreground">
                                             {
                                                (isAssignedVle && task.type === 'VLE Lead' && entry.actorId === task.creatorId)
                                                    ? 'by VLE'
                                                    : (canSeeFullHistory || entry.actorRole === 'Customer' || entry.actorRole === 'Admin')
                                                        ? `by ${entry.actorRole} (${entry.actorId ? `ID: ${entry.actorId.slice(-6).toUpperCase()}` : 'System'})`
                                                        : `by VLE`
                                            }
                                        </p>
                                        <p className="text-sm mt-1">
                                            {
                                                canSeeFullHistory || entry.action !== 'Task Assigned to VLE'
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

                           {canVleTakeAction && user ? (
                                <div className='flex flex-col gap-2'>
                                    <RequestInfoDialog taskId={task.id} vleId={user.uid} customerId={task.creatorId} />
                                    <SubmitAcknowledgementDialog taskId={task.id} vleId={user.uid} customerId={task.creatorId} />
                                </div>
                           ) : null }
                           
                           {canVleWorkOnTask && user ? (
                               <div className='flex flex-col gap-2'>
                                   <RequestInfoDialog taskId={task.id} vleId={user.uid} customerId={task.creatorId} />
                                   <UploadCertificateDialog taskId={task.id} vleId={user.uid} customerId={task.creatorId} onUploadComplete={() => {}} />
                               </div>
                           ) : null }
                           
                           {canAdminApprovePayout && (
                               <Button onClick={() => handleApprovePayout(task)} disabled={isPayoutProcessing}>
                                   {isPayoutProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CircleDollarSign className="mr-2 h-4 w-4" />}
                                   Approve Payout
                               </Button>
                           )}
                           
                           {(!canVleTakeAction && !canVleWorkOnTask && !canAdminSetPrice && !canAdminApprovePayout && !canCustomerPay && !canUploadMoreDocs) && (
                             <p className="text-sm text-muted-foreground">There are no actions for you at this stage.</p>
                           )}
                        </CardContent>
                    </Card>

                     {(isAdmin || isAssignedVle) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className='flex items-center gap-2'>Customer Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex items-center gap-3">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span>{task.customer}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <a href={`tel:${task.customerMobile}`} className="text-primary hover:underline">{task.customerMobile}</a>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    {task.customerEmail ? <a href={`mailto:${task.customerEmail}`} className="text-primary hover:underline break-all">{task.customerEmail}</a> : <span className="text-muted-foreground">Not provided</span>}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {isAssignedVle && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5"/>Your Earnings</CardTitle>
                                <CardDescription>This is a breakdown of what you will receive upon task completion.</CardDescription>
                            </CardHeader>
                             <CardContent className="text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Govt. Fee (if any)</span>
                                    <span>+ ₹{earnings.governmentFee.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Your Commission ({earnings.commissionRate * 100}%)</span>
                                    <span>+ ₹{earnings.vleCommission.toFixed(2)}</span>
                                </div>
                                <Separator className="my-2"/>
                                 <div className="flex justify-between font-bold">
                                    <span>Total Payout</span>
                                    <span>₹{(earnings.governmentFee + earnings.vleCommission).toFixed(2)}</span>
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
                                    {isUploading ? <Loader2 className="animate-spin" /> : <FileUp />}
                                    Upload Documents
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                     {formDataEntries.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5" />Submitted Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {formDataEntries.map(([key, value]) => {
                                    const formattedKey = key.split(':').pop()?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                    return (
                                        <div key={key}>
                                            <Label className="text-muted-foreground">{formattedKey}</Label>
                                            <p className="text-sm font-medium">{value as string}</p>
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Uploaded Documents</CardTitle>
                        </CardHeader>
                        <CardContent>
                             {Object.keys(documentGroupsToRender).length > 0 ? (
                                <div className="space-y-4">
                                    {Object.entries(documentGroupsToRender).map(([key, group]) => (
                                        <div key={key}>
                                            <h4 className="font-semibold text-sm mb-2">{group.label}</h4>
                                            <ul className="space-y-3 text-sm pl-4 border-l">
                                                {group.docs.map((doc: any, index: number) => (
                                                    <li key={index}>
                                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline break-words">
                                                            <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                                                            <span className="break-all">{doc.name}</span>
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">No documents uploaded for this task yet.</p>
                            )}
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
