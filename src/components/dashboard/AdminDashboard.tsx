
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, Trash2, Briefcase, UserPlus, Wallet, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { collection, onSnapshot, query, where, orderBy, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { resetApplicationData } from '@/app/actions';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { StatCard } from './shared';
import Link from 'next/link';

import type { Task } from '@/lib/types';


export default function AdminDashboard() {
    const { toast } = useToast();
    const { user, userProfile } = useAuth();

    // Data states
    const [tasks, setTasks] = useState<Task[]>([]);
    
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
        const fetchStats = async () => {
             const pendingTasksSnap = await getCountFromServer(query(collection(db, 'tasks'), where('status', 'in', ['Unassigned', 'Pending Price Approval'])));
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
        const actionableTaskStatuses: Task['status'][] = ['Unassigned', 'Pending Price Approval', 'Completed', 'Complaint Raised'];
        const tasksUnsub = onSnapshot(query(collection(db, 'tasks'), where('status', 'in', actionableTaskStatuses), orderBy('date', 'desc')), (snapshot) => {
            const taskData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
            setTasks(taskData);
            setLoading(false); // Set loading to false after fetching tasks
        }, (error) => {
            console.error("Error fetching tasks:", error);
            setLoading(false); // Also handle loading state on error
        });
        
        // We can keep listening to stats changes in real-time as well
        const vlesUnsub = onSnapshot(query(collection(db, 'vles'), where('status', '==', 'Pending')), (snapshot) => {
            setStats(s => ({...s, pendingVles: snapshot.size}));
        });

        return () => {
            tasksUnsub();
            vlesUnsub();
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
                            ) : tasks.length > 0 ? (
                                tasks.map(task => (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-medium">{task.service}</TableCell>
                                        <TableCell>Task</TableCell>
                                        <TableCell><Badge variant="outline">{task.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/dashboard/task/${task.id}`}>View Task</Link>
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
    );
}
