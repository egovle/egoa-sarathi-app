
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, runTransaction, getDoc } from 'firebase/firestore';
import { createNotificationForAdmins, createNotification } from '@/app/actions';

import { ToggleRight, CheckCircle2, XCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { calculateVleEarnings } from '@/lib/utils';
import type { Task, VLEProfile, Camp } from '@/lib/types';


const PendingApprovalView = () => (
    <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Account Pending Approval</AlertTitle>
        <AlertDescription>
            Your VLE account is currently under review by an administrator. You will be notified once it has been approved. Most features will be disabled until your account is approved.
        </AlertDescription>
    </Alert>
);

export default function VleDashboard({ allAssignedTasks, camps }: { allAssignedTasks: Task[], camps: Camp[] }) {
    const { toast } = useToast();
    const { user, userProfile } = useAuth();
    
    const taskInvitations = useMemo(() => 
        allAssignedTasks.filter(t => t.status === 'Pending VLE Acceptance' && t.assignedVleId === user?.uid),
    [allAssignedTasks, user]);
    
    const campInvitations = useMemo(() => {
        if (!userProfile || userProfile.role !== 'vle') return [];
        const todayStr = new Date().toLocaleDateString('en-CA');

        return camps.filter(camp => {
            if (new Date(camp.date).toISOString().substring(0, 10) < todayStr) return false;
            const myAssignment = camp.assignedVles?.find(vle => vle.vleId === userProfile.id);
            return myAssignment?.status === 'pending';
        });
    }, [camps, userProfile]);
    
    const onVleAvailabilityChange = async (vleId: string, available: boolean) => {
        const vleRef = doc(db, "vles", vleId);
        await updateDoc(vleRef, { available: available });
        toast({ title: 'Availability Updated', description: `You are now ${available ? 'available' : 'unavailable'} for tasks.`});
    }
    
    const onTaskAccept = async (taskId: string) => {
        if (!user || !userProfile) return;
        const taskRef = doc(db, "tasks", taskId);
        
        try {
            const taskDocBefore = await getDoc(taskRef);
            if (!taskDocBefore.exists()) {
                throw new Error("Task not found.");
            }
            const taskData = taskDocBefore.data() as Task;
            
            await runTransaction(db, async (transaction) => {
                const taskDoc = await transaction.get(taskRef);
                if (!taskDoc.exists() || taskDoc.data().status !== 'Pending VLE Acceptance') {
                    throw new Error("Task is no longer available for acceptance.");
                }
                
                const historyEntry = {
                    timestamp: new Date().toISOString(),
                    actorId: user.uid,
                    actorRole: 'VLE' as const,
                    action: 'Task Accepted',
                    details: `VLE ${userProfile.name} has accepted the task.`
                };
    
                transaction.update(taskRef, { 
                    status: 'Assigned',
                    history: arrayUnion(historyEntry)
                });
            });
    
            toast({ title: 'Task Accepted', description: 'You can now begin work on this task.' });
            
            if (taskData.creatorId) {
                await createNotification(
                    taskData.creatorId,
                    'Task Accepted!',
                    `Your task for "${taskData.service}" has been accepted by a VLE.`,
                    `/dashboard/task/${taskId}`
                );
            }

            await createNotificationForAdmins('Task Accepted by VLE', `VLE ${userProfile.name} has accepted task ${taskId.slice(-6).toUpperCase()}.`,  `/dashboard/task/${taskId}`);
            
        } catch (error: any) {
            console.error("Task acceptance failed:", error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    }

    const onTaskReject = async (taskId: string) => {
        if (!user || !userProfile) return;
        const taskRef = doc(db, "tasks", taskId);

        try {
            const historyEntry = {
                timestamp: new Date().toISOString(),
                actorId: user.uid,
                actorRole: 'VLE' as const,
                action: 'Task Rejected',
                details: `VLE ${userProfile.name} rejected the task. It has been returned to the assignment queue.`
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
                `Task ${taskId.slice(-6).toUpperCase()} was rejected and needs to be reassigned.`,
                 `/dashboard/task/${taskId}`
            );
        } catch (error: any) {
            console.error("Task rejection failed:", error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    if (!user || !userProfile || userProfile.role !== 'vle') return null;
    
    if (userProfile.status === 'Pending') {
        return <PendingApprovalView />;
    }

    return (
    <div className="space-y-6">
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Availability</CardTitle>
                <ToggleRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-2">
                <div className="flex items-center space-x-2 pt-2">
                    <Switch 
                        id="availability-mode" 
                        checked={(userProfile as VLEProfile).available} 
                        onCheckedChange={(checked) => onVleAvailabilityChange(user.uid, checked)}
                        disabled={userProfile.status !== 'Approved'}
                    />
                    <Label htmlFor="availability-mode">{(userProfile as VLEProfile).available ? 'Available' : 'Unavailable'} for Tasks</Label>
                </div>
            </CardContent>
        </Card>
        <Tabs defaultValue="task-invitations" className="w-full">
            <div className="flex items-center">
                <TabsList>
                    <TabsTrigger value="task-invitations">Task Invitations <Badge className="ml-2">{taskInvitations.length}</Badge></TabsTrigger>
                    <TabsTrigger value="camp-invitations">Camp Invitations <Badge className="ml-2">{campInvitations.length}</Badge></TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="task-invitations" className="mt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>New Task Invitations</CardTitle>
                        <CardDescription>Please review and respond to these new task assignments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Table>
                           <TableHeader>
                               <TableRow>
                                   <TableHead>Service</TableHead>
                                   <TableHead>Customer</TableHead>
                                   <TableHead>Your Earnings</TableHead>
                                   <TableHead className="text-right">Actions</TableHead>
                               </TableRow>
                           </TableHeader>
                           <TableBody>
                               {taskInvitations.length > 0 ? taskInvitations.map(task => {
                                   const { governmentFee, vleCommission } = calculateVleEarnings(task);
                                   return (
                                       <TableRow key={task.id}>
                                           <TableCell className="font-medium">{task.service}</TableCell>
                                           <TableCell>{task.customer}</TableCell>
                                           <TableCell>
                                               <div className='text-sm'>
                                                   <p>Commission: <span className='font-semibold'>₹{vleCommission.toFixed(2)}</span></p>
                                                   <p className='text-xs text-muted-foreground'>+ ₹{governmentFee.toFixed(2)} for Govt. Fee</p>
                                               </div>
                                           </TableCell>
                                           <TableCell className="text-right space-x-2">
                                               <Button size="sm" variant="outline" onClick={() => onTaskAccept(task.id)}><CheckCircle2 className="mr-2 h-4 w-4"/>Accept</Button>
                                               <Button size="sm" variant="destructive" onClick={() => onTaskReject(task.id)}><XCircle className="mr-2 h-4 w-4"/>Reject</Button>
                                           </TableCell>
                                       </TableRow>
                                   )
                               }) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No pending task invitations.</TableCell></TableRow>}
                           </TableBody>
                       </Table>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="camp-invitations" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>New Camp Invitations</CardTitle>
                        <CardDescription>You have been invited to join these camps. Please respond on the Camp Management page.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Camp Name</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {campInvitations.length > 0 ? campInvitations.map(camp => (
                                    <TableRow key={camp.id}>
                                        <TableCell>{camp.name}</TableCell>
                                        <TableCell>{camp.location}</TableCell>
                                        <TableCell>{format(new Date(camp.date), 'dd MMM yyyy')}</TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href="/dashboard/camps">View & Respond</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No new camp invitations.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
)
}
