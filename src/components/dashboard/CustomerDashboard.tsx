
'use client';

import { useState, useMemo, type FormEvent, type ChangeEvent, useRef } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { createNotificationForAdmins } from '@/app/actions';
import { cn } from '@/lib/utils';


import { PlusCircle, Search, MoreHorizontal, Eye, StarIcon, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { TaskCreatorDialog } from './shared';
import { ComplaintDialog } from './dialogs/ComplaintDialog';
import { FeedbackDialog } from './dialogs/FeedbackDialog';
import type { Task, Service, UserProfile, Complaint } from '@/lib/types';


export default function CustomerDashboard({ tasks, services }: { tasks: Task[], services: Service[] }) {
    const { toast } = useToast();
    const { user, userProfile } = useAuth();
    const customerComplaints = tasks.filter(t => t.complaint).map(t => ({...(t.complaint as Complaint), taskId: t.id, service: t.service}));
    const [searchQuery, setSearchQuery] = useState('');

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
             <TaskCreatorDialog services={services} creatorId={user.uid} creatorProfile={userProfile} type="Customer Request" buttonTrigger={<Button size="sm" className="h-8 gap-1"><PlusCircle className="h-3.5 w-3.5" />Create New Booking</Button>} />
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

    