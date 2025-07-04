'use client';

import { useState, useMemo, useRef, type ChangeEvent } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, doc, addDoc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { createNotificationForAdmins, createFixedPriceTask } from '@/app/actions';
import { cn, validateFiles } from '@/lib/utils';


import { PlusCircle, Search, MoreHorizontal, Eye, StarIcon, ShieldAlert, Star, Camera, FileUp, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TaskCreatorDialog } from './shared';
import type { Task, Service, UserProfile, Complaint } from '@/lib/types';

// Dialogs moved here for encapsulation
const CameraUploadDialog = ({ open, onOpenChange, onCapture }: { open: boolean, onOpenChange: (open: boolean) => void, onCapture: (file: File) => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        let stream: MediaStream | null = null;
        const getCameraPermission = async () => {
            if (!open) return;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                setHasCameraPermission(true);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error('Error accessing camera:', error);
                setHasCameraPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Camera Access Denied',
                    description: 'Please enable camera permissions in your browser settings.',
                });
            }
        };

        getCameraPermission();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (videoRef.current) {
              videoRef.current.srcObject = null;
            }
        };
    }, [open, toast]);

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const fileName = `capture-${Date.now()}.jpg`;
                    const file = new File([blob], fileName, { type: 'image/jpeg' });
                    onCapture(file);
                    onOpenChange(false);
                }
            }, 'image/jpeg');
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Capture Document</DialogTitle>
                    <DialogDescription>Position your document in the frame and click capture.</DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    {hasCameraPermission === false && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                           <Alert variant="destructive" className="w-auto">
                              <AlertTitle>Camera Access Required</AlertTitle>
                              <AlertDescription>
                                Please allow camera access to use this feature.
                              </AlertDescription>
                          </Alert>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleCapture} disabled={!hasCameraPermission}>
                        <Camera className="mr-2 h-4 w-4" /> Capture
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ComplaintDialog = ({ trigger, taskId, onComplaintSubmit }: { trigger: React.ReactNode, taskId: string, onComplaintSubmit: (taskId: string, complaint: any, files: File[]) => void }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [complaintText, setComplaintText] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newComplaint = {
            text: complaintText,
            status: 'Open',
            response: null,
            date: new Date().toISOString(),
        };
        onComplaintSubmit(taskId, newComplaint, selectedFiles);
        setOpen(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const validation = validateFiles(files);
            if (!validation.isValid) {
                toast({ title: 'Validation Error', description: validation.message, variant: 'destructive' });
                return;
            }
            setSelectedFiles(prev => [...prev, ...files]);
        }
    };
    
    const handleCameraCapture = (file: File) => {
        const validation = validateFiles([file]);
        if (!validation.isValid) {
            toast({ title: 'Validation Error', description: validation.message, variant: 'destructive' });
            return;
        }
        setSelectedFiles(prevFiles => [...prevFiles, file]);
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setComplaintText('');
            setSelectedFiles([]);
            setIsCameraOpen(false);
        }
        setOpen(isOpen);
    }

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>{trigger}</DialogTrigger>
                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Raise a Complaint</DialogTitle>
                            <DialogDescription>Describe the issue you are facing and attach relevant documents if any.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 grid gap-4">
                            <Textarea id="complaint" value={complaintText} onChange={e => setComplaintText(e.target.value)} placeholder="Please provide details about your issue..." rows={4} required />
                             <div>
                                <Label>Attach Documents</Label>
                                <div className="flex gap-2 mt-2">
                                    <Button type="button" onClick={() => fileInputRef.current?.click()} size="sm" variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30">
                                        <FileUp className="mr-2 h-4 w-4"/> Choose Files
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => setIsCameraOpen(true)} size="sm">
                                        <Camera className="mr-2 h-4 w-4" /> Use Camera
                                    </Button>
                                </div>
                                <Input id="documents" type="file" multiple onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                                {selectedFiles.length > 0 && (
                                    <div className="text-xs text-muted-foreground space-y-1 mt-2">
                                        <p className='font-medium'>Selected files:</p>
                                        {selectedFiles.map((file, i) => <div key={i} className="flex items-center gap-2"><FileText className="h-3 w-3" /><span>{file.name}</span></div>)}
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Submit Complaint</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <CameraUploadDialog open={isCameraOpen} onOpenChange={setIsCameraOpen} onCapture={handleCameraCapture} />
        </>
    );
};

const StarRating = ({ rating, setRating, readOnly = false }: { rating: number; setRating?: (rating: number) => void; readOnly?: boolean }) => {
    const fullStars = Math.floor(rating);
    return (
        <div className={cn("flex items-center gap-1", readOnly && "justify-center")}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={`h-6 w-6 ${!readOnly ? 'cursor-pointer' : ''} ${fullStars >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
                    onClick={() => !readOnly && setRating && setRating(star)}
                />
            ))}
        </div>
    );
};

const FeedbackDialog = ({ trigger, taskId, onFeedbackSubmit }: { trigger: React.ReactNode, taskId: string, onFeedbackSubmit: (taskId: string, feedback: any) => void }) => {
    const { toast } = useToast();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [open, setOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newFeedback = {
            rating,
            comment,
            date: new Date().toISOString(),
        }
        onFeedbackSubmit(taskId, newFeedback);
        setOpen(false);
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setRating(0);
            setComment('');
        }
        setOpen(isOpen);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Provide Feedback</DialogTitle>
                        <DialogDescription>Rate your experience with this service request.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex justify-center">
                           <StarRating rating={rating} setRating={setRating} />
                        </div>
                        <Textarea id="feedback" value={comment} onChange={e => setComment(e.target.value)} placeholder="Any additional comments? (Optional)" rows={3} />
                    </div>
                    <DialogFooter>
                        <Button type="submit">Submit Feedback</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};


export default function CustomerDashboard({ tasks, services }: { tasks: Task[], services: Service[] }) {
    const { toast } = useToast();
    const { user, userProfile } = useAuth();
    const customerComplaints = tasks.filter(t => t.complaint).map(t => ({...(t.complaint as Complaint), taskId: t.id, service: t.service}));
    const [searchQuery, setSearchQuery] = useState('');

    // Logic handlers moved from parent page.tsx
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
            const result = await createFixedPriceTask(taskId, taskWithDocs, userProfile);
            if (result.success) {
                toast({
                    title: 'Task Created & Paid!',
                    description: `₹${taskWithDocs.totalPaid.toFixed(2)} has been deducted from your wallet.`,
                });
            } else {
                 throw new Error(result.error || "An unknown error occurred during task creation.");
            }
        }
    }

    const handleComplaintSubmit = async (taskId: string, complaint: any, filesToUpload: File[]) => {
        const taskRef = doc(db, "tasks", taskId);
        
        const uploadedDocuments: { name: string, url: string }[] = [];
        if (filesToUpload.length > 0) {
            for (const file of filesToUpload) {
                const storageRef = ref(storage, `tasks/${taskId}/complaints/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(storageRef);
                uploadedDocuments.push({ name: file.name, url: downloadURL });
            }
        }
        const complaintWithDocs = { ...complaint, documents: uploadedDocuments };

        await updateDoc(taskRef, { complaint: complaintWithDocs, status: 'Complaint Raised' });
        const taskSnap = await getDoc(taskRef);
        const taskData = taskSnap.data();
        await createNotificationForAdmins(
            'New Complaint Raised',
            `A complaint was raised for task ${taskId.slice(-6).toUpperCase()} by ${taskData?.customer}.`,
            `/dashboard/task/${taskId}`
        );
        toast({ title: 'Complaint Submitted', description: 'Your complaint has been registered. We will look into it shortly.' });
    }
    
    const handleFeedbackSubmit = async (taskId: string, feedback: any) => {
        const taskRef = doc(db, "tasks", taskId);
        await updateDoc(taskRef, { feedback: feedback });
        toast({ title: 'Feedback Submitted', description: 'Thank you for your valuable feedback!' });
    }

    const filteredTasks = useMemo(() => {
        if (!searchQuery) return tasks;
        return tasks.filter(task => 
            task.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.service.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [tasks, searchQuery]);
    
    if (!user || !userProfile) return null;

    return (
      <Tabs defaultValue="tasks" className="w-full">
          <div className='flex items-center justify-between'>
            <TabsList>
                <TabsTrigger value="tasks">My Bookings</TabsTrigger>
                <TabsTrigger value="complaints">My Complaints</TabsTrigger>
            </TabsList>
             <TaskCreatorDialog services={services} creatorId={user.uid} creatorProfile={userProfile} type="Customer Request" onTaskCreated={handleCreateTask} buttonTrigger={<Button size="sm" className="h-8 gap-1"><PlusCircle className="h-3.5 w-3.5" />Create New Booking</Button>} />
          </div>
            <TabsContent value="tasks" className="mt-4 space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>My Service Bookings</CardTitle>
                                <CardDescription>Track your ongoing and completed service bookings.</CardDescription>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search by ID or service..." 
                                    className="pl-8 w-64"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Task ID</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredTasks.map(task => {
                            const displayStatus = task.status === 'Paid Out' ? 'Completed' : task.status;
                            return (
                                <TableRow key={task.id}>
                                    <TableCell className="font-medium">{task.id.slice(-6).toUpperCase()}</TableCell>
                                    <TableCell>{task.service}</TableCell>
                                    <TableCell><Badge variant="outline">{displayStatus}</Badge></TableCell>
                                    <TableCell>{format(new Date(task.date), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild><Link href={`/dashboard/task/${task.id}`} className="flex items-center w-full"><Eye className="mr-2 h-4 w-4"/>View Details</Link></DropdownMenuItem>
                                                
                                                {displayStatus === 'Completed' && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        {!task.feedback && (
                                                            <FeedbackDialog taskId={task.id} onFeedbackSubmit={handleFeedbackSubmit} trigger={
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center w-full"><StarIcon className="mr-2 h-4 w-4"/>Give Feedback</DropdownMenuItem>
                                                            } />
                                                        )}
                                                        {!task.complaint && (
                                                            <ComplaintDialog taskId={task.id} onComplaintSubmit={handleComplaintSubmit} trigger={
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive flex items-center w-full"><ShieldAlert className="mr-2 h-4 w-4"/>Raise Complaint</DropdownMenuItem>
                                                            } />
                                                        )}
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        </TableBody>
                    </Table>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="complaints" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>My Complaints</CardTitle>
                        <CardDescription>View and track all your complaints.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Task ID</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Complaint</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Admin Response</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customerComplaints.length > 0 ? (
                                    customerComplaints.map(c => (
                                    <TableRow key={c.date}>
                                        <TableCell className="font-medium">{c.taskId.slice(-6).toUpperCase()}</TableCell>
                                        <TableCell>{c.service}</TableCell>
                                        <TableCell className="max-w-xs break-words">{c.text}</TableCell>
                                        <TableCell><Badge variant={c.status === 'Open' ? 'destructive' : 'default'}>{c.status}</Badge></TableCell>
                                        <TableCell className="max-w-xs break-words">
                                            {c.response ? c.response.text : 'No response yet.'}
                                        </TableCell>
                                    </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            You have not raised any complaints.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
