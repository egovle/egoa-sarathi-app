
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, Trash2, Briefcase, UserPlus, Wallet, AlertTriangle, MessageSquare, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { collection, onSnapshot, query, where, orderBy, getCountFromServer, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { resetApplicationData } from '@/app/actions';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { StatCard } from './shared';
import Link from 'next/link';

import type { Task, UserProfile, VLEProfile } from '@/lib/types';


export default function AdminDashboard() {
    const { toast } = useToast();
    const { user, userProfile } = useAuth();

    // Data states
    const [actionableTasks, setActionableTasks] = useState<Task[]>([]);
    const [pendingVles, setPendingVles] = useState<VLEProfile[]>([]);
    
    // Stats
    const [stats, setStats] = useState({
        pendingTasks: 0,
        pendingVles: 0,
        pendingPayments: 0,
        openComplaints: 0
    });
    
    // Loading states
    const [loading, setLoading] = useState(true);
    const [isResetting, setIsResetting] = useState(false);


    useEffect(() => {
        setLoading(true);
        const fetchStats = async () => {
             const pendingTaskStatuses: Task['status'][] = ['Unassigned', 'Pending Price Approval', 'Pending VLE Acceptance'];
             const pendingTasksSnap = await getCountFromServer(query(collection(db, 'tasks'), where('status', 'in', pendingTaskStatuses)));
             const pendingVlesSnap = await getCountFromServer(query(collection(db, 'vles'), where('status', '==', 'Pending')));
             const pendingPaymentsSnap = await getCountFromServer(query(collection(db, 'paymentRequests'), where('status', '==', 'pending')));
             const openComplaintsSnap = await getCountFromServer(query(collection(db, 'tasks'), where('complaint.status', '==', 'Open')));
             
             setStats({
                 pendingTasks: pendingTasksSnap.data().count,
                 pendingVles: pendingVlesSnap.data().count,
                 pendingPayments: pendingPaymentsSnap.data().count,
                 openComplaints: openComplaintsSnap.data().count,
             });
        };

        fetchStats();

        // Realtime listeners for actionable items
        const actionableTaskStatuses: Task['status'][] = ['Unassigned', 'Pending Price Approval', 'Pending VLE Acceptance', 'Completed', 'Complaint Raised'];
        const tasksQuery = query(
            collection(db, 'tasks'), 
            where('status', 'in', actionableTaskStatuses), 
            orderBy('date', 'desc'),
            limit(10)
        );
        const tasksUnsub = onSnapshot(tasksQuery, (snapshot) => {
            setActionableTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tasks:", error);
            setLoading(false);
        });
        
        const vlesQuery = query(collection(db, 'vles'), where('status', '==', 'Pending'), limit(10));
        const vlesUnsub = onSnapshot(vlesQuery, (snapshot) => {
            setPendingVles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as VLEProfile));
            setStats(s => ({...s, pendingVles: snapshot.size}));
            setLoading(false);
        });

         const paymentsUnsub = onSnapshot(query(collection(db, 'paymentRequests'), where('status', '==', 'pending')), (snapshot) => {
            setStats(s => ({...s, pendingPayments: snapshot.size}));
        });

        return () => {
            tasksUnsub();
            vlesUnsub();
            paymentsUnsub();
        }
    }, []);

    const handleReset = async () => {
        setIsResetting(true);
        const result = await resetApplicationData();
        if (result.success) {
            toast({ title: "Application Reset", description: result.message });
        } else {
            toast({ title: "Error", description: result.error, variant: 'destructive' });
        }
        setIsResetting(false);
    }
    
    const combinedActionItems = useMemo(() => {
        const tasks = actionableTasks.map(task => ({
            id: `task-${task.id}`,
            item: `${task.service} for ${task.customer}`,
            type: 'Task',
            details: task.status,
            link: `/dashboard/task/${task.id}`
        }));
        const vles = pendingVles.map(vle => ({
            id: `vle-${vle.id}`,
            item: `${vle.name}`,
            type: 'VLE Approval',
            details: vle.status,
            link: `/dashboard/users?tab=vles`
        }));
        return [...tasks, ...vles];
    }, [actionableTasks, pendingVles]);

    return (
        <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button variant="destructive" disabled={isResetting}>
                            {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} 
                            Reset Application Data
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action will permanently delete all tasks, camps, and notifications, and reset all user wallets to zero. This cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleReset} className={buttonVariants({variant: 'destructive'})}>Reset Application</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Pending Tasks" value={stats.pendingTasks.toString()} icon={Briefcase} description="Tasks needing price/VLE assignment" />
                    <StatCard title="VLE Requests" value={stats.pendingVles.toString()} icon={UserPlus} description="New VLEs awaiting approval" />
                    <StatCard title="Payment Requests" value={stats.pendingPayments.toString()} icon={Wallet} description="Wallet balance requests to approve" />
                    <StatCard title="Open Complaints" value={stats.openComplaints.toString()} icon={AlertTriangle} description="Customer complaints needing review" />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Action Center</CardTitle>
                        <CardDescription>All items requiring your immediate attention.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status/Details</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell></TableRow>
                                ) : combinedActionItems.length > 0 ? (
                                    combinedActionItems.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.item}</TableCell>
                                            <TableCell>
                                                <Badge variant={item.type === 'Task' ? 'secondary' : 'default'}>{item.type}</Badge>
                                            </TableCell>
                                            <TableCell><Badge variant="outline">{item.details}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={item.link}>
                                                      {item.type === 'Task' ? 'View Task' : 'View Users'}
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={4} className="h-24 text-center">No immediate actions required.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
