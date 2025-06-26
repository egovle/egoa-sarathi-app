'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, FileText, History, MessageSquarePlus, CheckCircle, Send } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

// Dialog for VLE to request more info
const RequestInfoDialog = ({ taskId, vleName }: { taskId: string, vleName: string }) => {
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

// Dialog for VLE to complete a task
const CompleteTaskDialog = ({ taskId, vleName }: { taskId: string, vleName: string }) => {
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
            toast({ title: 'Task Marked as Complete', description: 'The customer and admin have been notified.' });
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
    const [task, setTask] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

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

    // Check if user has permission to view this page
    if (!isTaskCreator && !isAssignedVle && !isAdmin) {
         return (
            <div className="text-center">
                 <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
                 <p className="mb-4">You do not have permission to view this task.</p>
                 <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            </div>
        )
    }

    const canVleTakeAction = isAssignedVle && (task.status === 'Assigned' || task.status === 'Awaiting Documents');

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                    <Link href="/dashboard">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Link>
                </Button>
                <div>
                    <h1 className="font-semibold text-lg md:text-2xl">Task Details</h1>
                    <p className="text-sm text-muted-foreground">Task ID: {task.id.slice(-6).toUpperCase()}</p>
                </div>
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
                            {task.acknowledgementNumber && (
                                <div className="col-span-2"><Label>Acknowledgement #</Label><p>{task.acknowledgementNumber}</p></div>
                            )}
                        </CardContent>
                    </Card>

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
                            <CardTitle className="flex items-center gap-2">VLE Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {canVleTakeAction ? (
                                <div className='flex flex-col gap-2'>
                                    <RequestInfoDialog taskId={task.id} vleName={userProfile.name} />
                                    <CompleteTaskDialog taskId={task.id} vleName={userProfile.name} />
                                </div>
                           ) : (
                                <p className="text-sm text-muted-foreground">
                                    {isAssignedVle ? "This task is not in a state where actions can be taken." : "You are not the assigned VLE for this task."}
                                </p>
                           )}
                           {!isAssignedVle && !isAdmin && <p className="text-sm text-muted-foreground">You are viewing this task as the customer.</p>}
                           {isAdmin && !isAssignedVle && <p className="text-sm text-muted-foreground">You are viewing this task as an admin.</p>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Uploaded Documents</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm">
                                {task.documents.map((doc: any, i: number) => (
                                    <li key={i} className="flex items-center gap-2 hover:underline cursor-pointer">
                                        <FileText className="h-4 w-4" /> {doc.name}
                                    </li>
                                ))}
                            </ul>
                            {isTaskCreator && task.status === 'Awaiting Documents' && (
                                <div className="mt-4 pt-4 border-t">
                                     <h4 className="font-semibold text-base mb-2">Upload More Documents</h4>
                                     <p className="text-xs text-muted-foreground mb-4">The assigned VLE has requested additional documents. Please upload them here.</p>
                                     <Button disabled>Upload Files (coming soon)</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
