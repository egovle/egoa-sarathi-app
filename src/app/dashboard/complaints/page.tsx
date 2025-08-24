
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { createNotification } from '@/app/actions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, FileText, Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComplaintResponseDialog } from '@/components/dashboard/dialogs/ComplaintResponseDialog';

import type { Task } from '@/lib/types';


export default function ComplaintsPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [tasksWithComplaints, setTasksWithComplaints] = useState<Task[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!authLoading && !userProfile?.isAdmin) {
            router.push('/dashboard');
        }
    }, [userProfile, authLoading, router]);

    useEffect(() => {
        if (!userProfile?.isAdmin) return;

        setLoadingData(true);
        const complaintsQuery = query(collection(db, "tasks"), where('complaint', '!=', null));
        
        const unsubscribe = onSnapshot(complaintsQuery, (snapshot) => {
            const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
            // Sort by complaint date, open complaints first
            tasks.sort((a, b) => {
                if (a.complaint!.status === 'Open' && b.complaint!.status !== 'Open') return -1;
                if (a.complaint!.status !== 'Open' && b.complaint!.status === 'Open') return 1;
                return new Date(b.complaint!.date).getTime() - new Date(a.complaint!.date).getTime();
            });
            setTasksWithComplaints(tasks);
            setLoadingData(false);
        });

        return () => unsubscribe();
    }, [userProfile]);

    const handleResponseSubmit = async (taskId: string, customerId: string, response: any) => {
        const taskRef = doc(db, 'tasks', taskId);
        try {
            const taskDoc = await updateDoc(taskRef, {
                'complaint.status': 'Responded',
                'complaint.response': response
            });

            await createNotification(
                customerId,
                'Response to Your Complaint',
                `An admin has responded to your complaint for task ${taskId.slice(-6).toUpperCase()}.`,
                `/dashboard`
            );
        } catch (error) {
            console.error("Failed to submit response", error);
            toast({
                title: "Error",
                description: "Failed to submit response.",
                variant: "destructive"
            });
        }
    };


    if (authLoading || loadingData) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Complaint Management</CardTitle>
                <CardDescription>Review and respond to all customer complaints.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Task ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Complaint</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tasksWithComplaints.length > 0 ? (
                            tasksWithComplaints.map(task => (
                                <TableRow key={task.id}>
                                    <TableCell className="font-medium">
                                        <Link href={`/dashboard/task/${task.id}`} className="text-primary hover:underline">
                                            {task.id.slice(-6).toUpperCase()}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{task.customer}</TableCell>
                                    <TableCell className="max-w-sm">
                                        <p className="truncate">{task.complaint?.text}</p>
                                        {task.complaint?.documents && task.complaint.documents.length > 0 && (
                                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                <FileText className="h-3 w-3" /> {task.complaint.documents.length} attachment(s)
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={task.complaint?.status === 'Open' ? 'destructive' : 'default'}>
                                            {task.complaint?.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {task.complaint?.status === 'Open' ? (
                                            <ComplaintResponseDialog 
                                                trigger={<Button size="sm"><MessageSquare className="mr-2 h-4 w-4"/>Respond</Button>}
                                                complaint={task.complaint}
                                                taskId={task.id}
                                                customerId={task.creatorId}
                                                onResponseSubmit={handleResponseSubmit}
                                            />
                                        ) : (
                                            <Button size="sm" variant="outline" asChild>
                                                <Link href={`/dashboard/task/${task.id}`}>View Details</Link>
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No complaints found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

