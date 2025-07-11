
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Loader2, UserPlus, MoreHorizontal, Eye, GitFork, AlertTriangle, Mail, Phone, Search, Trash2, CircleDollarSign, Briefcase, Users, Users2, Wallet, Send, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc, writeBatch, query, arrayUnion, getDoc, runTransaction, getDocs, where, collection, onSnapshot, orderBy, startAt, endAt, startAfter, endBefore, limit, Query, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createNotification, processPayout } from '@/app/actions';
import { resetApplicationData } from '@/app/dashboard/services/actions';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { StatCard } from './shared';
import { ComplaintResponseDialog } from './dialogs/ComplaintResponseDialog';
import { AssignVleDialog, AddBalanceDialog } from './dialogs/AdminDialogs';
import type { Task, VLEProfile, CustomerProfile, PaymentRequest, Complaint as ComplaintType } from '@/lib/types';


// Debounce hook
function useDebounce(value: string, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

const PAGE_SIZE = 10;

export default function AdminDashboard() {
    const { toast } = useToast();
    const { user, userProfile } = useAuth();
    
    // UI State
    const [activeTab, setActiveTab] = useState('overview');
    const [processingVleId, setProcessingVleId] = useState<string | null>(null);
    const [processingBalanceRequestId, setProcessingBalanceRequestId] = useState<string | null>(null);
    const [processingPayoutTaskId, setProcessingPayoutTaskId] = useState<string | null>(null);
    
    // Search State
    const [searchQueries, setSearchQueries] = useState({ vles: '', customers: '', tasks: '' });
    const debouncedVleSearch = useDebounce(searchQueries.vles, 500);
    const debouncedCustomerSearch = useDebounce(searchQueries.customers, 500);
    const debouncedTaskSearch = useDebounce(searchQueries.tasks, 500);
    
    // Data State
    const [data, setData] = useState<Record<string, any[]>>({
        tasks: [], vles: [], customers: [], paymentRequests: [], complaints: [], payoutTasks: []
    });
    const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
    
    // Pagination State
    const [lastVisible, setLastVisible] = useState<Record<string, DocumentData | null>>({});
    const [page, setPage] = useState<Record<string, number>>({ tasks: 1, vles: 1, customers: 1 });

    const fetchData = useCallback(async (collectionName: string, searchField: string, searchTerm: string, pageNum: number, lastDoc: DocumentData | null) => {
        setIsLoading(prev => ({ ...prev, [collectionName]: true }));
        let q: Query<DocumentData>;
        const baseQuery = collection(db, collectionName);
        
        if (searchTerm) {
            q = query(baseQuery, orderBy(searchField), startAt(searchTerm), endAt(searchTerm + '\uf8ff'), limit(PAGE_SIZE));
        } else {
            q = query(baseQuery, orderBy('date', 'desc'), limit(PAGE_SIZE));
            if (pageNum > 1 && lastDoc) {
                q = query(baseQuery, orderBy('date', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
            }
        }
        
        const snapshot = await getDocs(q);
        const newData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        setData(prev => ({ ...prev, [collectionName]: newData }));
        setLastVisible(prev => ({ ...prev, [collectionName]: snapshot.docs[snapshot.docs.length - 1] ?? null }));
        setIsLoading(prev => ({ ...prev, [collectionName]: false }));
    }, []);

    useEffect(() => {
        fetchData('tasks', 'customer', debouncedTaskSearch, page.tasks, lastVisible.tasks);
    }, [debouncedTaskSearch, page.tasks, fetchData]);
    
    useEffect(() => {
        fetchData('vles', 'name', debouncedVleSearch, page.vles, lastVisible.vles);
    }, [debouncedVleSearch, page.vles, fetchData]);

    useEffect(() => {
        fetchData('users', 'name', debouncedCustomerSearch, page.customers, lastVisible.customers);
    }, [debouncedCustomerSearch, page.customers, fetchData]);

    // Fetch static/overview data
    useEffect(() => {
        const paymentReqQuery = query(collection(db, "paymentRequests"), where("status", "==", "pending"));
        const unsubPayment = onSnapshot(paymentReqQuery, (s) => setData(prev => ({...prev, paymentRequests: s.docs.map(d => ({ id: d.id, ...d.data() }) as PaymentRequest)})));
        
        const tasksQuery = query(collection(db, "tasks"));
        const unsubTasks = onSnapshot(tasksQuery, (s) => {
            const allTasksData = s.docs.map(d => ({ id: d.id, ...d.data()}) as Task);
            const complaintsData = allTasksData.filter(t => t.complaint).map(t => ({...t.complaint, taskId: t.id, customer: t.customer, service: t.service, date: t.date, customerId: t.creatorId}));
            const payoutTasksData = allTasksData.filter(t => t.status === 'Completed');
            setData(prev => ({ ...prev, complaints: complaintsData, payoutTasks: payoutTasksData }));
        });

        const vlesQuery = query(collection(db, "vles"));
        const unsubVles = onSnapshot(vlesQuery, s => setData(prev => ({...prev, allVles: s.docs.map(d => ({id: d.id, ...d.data()}) as VLEProfile)})));

        const usersQuery = query(collection(db, "users"));
        const unsubUsers = onSnapshot(usersQuery, s => setData(prev => ({...prev, allCustomers: s.docs.map(d => ({id: d.id, ...d.data()}) as CustomerProfile)})));


        return () => { unsubPayment(); unsubTasks(); unsubVles(); unsubUsers() };
    }, []);


    const handleSearchChange = (type: string, value: string) => {
        setSearchQueries(prev => ({ ...prev, [type]: value }));
        setPage(prev => ({...prev, [type]: 1}));
        setLastVisible(prev => ({...prev, [type]: null}));
    };
    
    const handleNextPage = (type: string) => setPage(prev => ({ ...prev, [type]: prev[type] + 1 }));
    const handlePrevPage = (type: string) => { /* Firestore SDK doesn't support previous pages efficiently without complex logic */ };


    const handleComplaintResponse = async (taskId: string, customerId: string, response: any) => {
        const taskRef = doc(db, "tasks", taskId);
        const taskSnap = await getDoc(taskRef);
        if (taskSnap.exists()) {
            const taskData = taskSnap.data() as Task;
            const updatedComplaint = { ...taskData.complaint, response, status: 'Responded' };
            await updateDoc(taskRef, { complaint: updatedComplaint });
            await createNotification(
                customerId,
                'Response to your Complaint',
                `An admin has responded to your complaint for task ${taskId.slice(-6).toUpperCase()}.`,
                `/dashboard/task/${taskId}`
            );
        }
    }
    
    const handleVleApprove = async (vleId: string) => {
        setProcessingVleId(vleId);
        const vleRef = doc(db, "vles", vleId);
        try {
            await updateDoc(vleRef, { status: 'Approved' });
            await createNotification(
                vleId,
                'Account Approved',
                'Congratulations! Your VLE account has been approved by an admin.'
            );
            toast({ title: 'VLE Approved', description: 'The VLE has been approved and can now take tasks.'});
        } catch (error) {
            console.error("Error approving VLE:", error);
            toast({ title: "Error", description: "Could not approve the VLE.", variant: "destructive" });
        } finally {
            setProcessingVleId(null);
        }
    }

    const handleVleAvailabilityChange = async (vleId: string, available: boolean) => {
        const vleRef = doc(db, "vles", vleId);
        await updateDoc(vleRef, { available: available });
        toast({ title: 'Availability Updated', description: `This VLE is now ${available ? 'available' : 'unavailable'} for tasks.`});
    }

    const handleAssignVle = async (taskId: string, vleId: string, vleName: string) => {
        if (!user || !userProfile?.isAdmin) {
            toast({ title: 'Permission Denied', description: 'Only admins can assign tasks.', variant: 'destructive' });
            return;
        }

        const taskRef = doc(db, "tasks", taskId);
        const historyEntry = {
            timestamp: new Date().toISOString(),
            actorId: user.uid,
            actorRole: 'Admin',
            action: 'Task Assigned to VLE',
            details: `Task assigned to VLE ${vleName} for acceptance.`
        };

        try {
            await updateDoc(taskRef, { 
                status: 'Pending VLE Acceptance', 
                assignedVleId: vleId, 
                assignedVleName: vleName,
                history: arrayUnion(historyEntry)
            });

            await createNotification(
                vleId,
                'New Task Invitation',
                `You have been invited to work on task: ${taskId.slice(-6).toUpperCase()}.`,
                `/dashboard`
            );
        } catch (error: any) {
            console.error("Task assignment failed:", error);
            toast({
                title: 'Assignment Failed',
                description: error.message || 'Could not assign the task.',
                variant: 'destructive',
            });
            throw error; 
        }
    }

     const handleUpdateVleBalance = async (vleId: string, amountToAdd: number) => {
        const vleRef = doc(db, "vles", vleId);
        try {
            await runTransaction(db, async (transaction) => {
                const vleDoc = await transaction.get(vleRef);
                if (!vleDoc.exists()) {
                    throw "Document does not exist!";
                }
                const currentBalance = vleDoc.data().walletBalance || 0;
                const newBalance = currentBalance + amountToAdd;
                transaction.update(vleRef, { walletBalance: newBalance });
            });

            await createNotification(
                vleId,
                'Wallet Balance Updated',
                `An admin has added ₹${amountToAdd.toFixed(2)} to your wallet.`
            );
        } catch (e) {
            console.error("Transaction failed: ", e);
            toast({ title: "Error", description: "Failed to update balance.", variant: "destructive" });
        }
    };
    
    const handleBalanceRequest = async (req: PaymentRequest, status: 'approved' | 'rejected') => {
        setProcessingBalanceRequestId(req.id);
        const userRef = doc(db, req.userRole === 'vle' ? 'vles' : 'users', req.userId);
        const reqRef = doc(db, 'paymentRequests', req.id);

        try {
            if (status === 'approved') {
                 await runTransaction(db, async (transaction) => {
                    const userDoc = await transaction.get(userRef);
                    if (!userDoc.exists()) throw new Error("User document not found.");

                    const currentBalance = userDoc.data().walletBalance || 0;
                    const newBalance = currentBalance + req.amount;
                    
                    transaction.update(userRef, { walletBalance: newBalance });
                    transaction.update(reqRef, { status: 'approved', approvedBy: user?.uid, approvedAt: new Date().toISOString() });
                });
                toast({ title: 'Balance Added', description: `Successfully added ₹${req.amount.toFixed(2)} to ${req.userName}'s wallet.` });
                await createNotification(req.userId, 'Wallet Balance Updated', `An admin has approved your request and added ₹${req.amount.toFixed(2)} to your wallet.`);
            } else {
                 await updateDoc(reqRef, { status: 'rejected', approvedBy: user?.uid, approvedAt: new Date().toISOString() });
                 toast({ title: 'Request Rejected', description: `The balance request from ${req.userName} has been rejected.` });
                 await createNotification(req.userId, 'Balance Request Rejected', `Your request to add ₹${req.amount.toFixed(2)} has been rejected by an admin.`);
            }
        } catch (error: any) {
            console.error("Failed to process balance request:", error);
            toast({ title: "Action Failed", description: error.message || "Could not process the balance request.", variant: "destructive" });
        } finally {
            setProcessingBalanceRequestId(null);
        }
    };

    const handleResetData = async () => {
        toast({ title: 'Resetting Data...', description: 'Please wait, this may take a moment.' });
        
        const result = await resetApplicationData();

        if (result.success) {
            toast({ title: 'Application Reset', description: 'All data has been cleared and default services have been seeded.' });
        } else {
            console.error("Error resetting data:", result.error);
            toast({ title: 'Reset Failed', description: result.error || 'Could not reset the application data.', variant: 'destructive' });
        }
    };

    const handleApprovePayout = async (task: Task) => {
        if (!user || !userProfile?.isAdmin) {
            toast({ title: 'Error', description: 'Permission denied.', variant: 'destructive' });
            return;
        }
        
        setProcessingPayoutTaskId(task.id);
        const result = await processPayout(task, user.uid);

        if (result.success) {
            toast({ title: 'Payout Approved!', description: result.message });
        } else {
            toast({ title: 'Payout Failed', description: result.error, variant: 'destructive' });
        }
        setProcessingPayoutTaskId(null);
    };

    const allTasksCount = (data.tasks || []).length;
    const allVlesCount = (data.allVles || []).length;
    const allCustomersCount = (data.allCustomers || []).length;
    const openComplaintsCount = (data.complaints || []).filter(c => c.status === 'Open').length;
    const payoutTaskCount = (data.payoutTasks || []).length;
    const pendingVles = (data.allVles || []).filter(v => v.status === 'Pending');
    const pricingTasks = (data.tasks || []).filter(t => t.status === 'Pending Price Approval');

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="vle-management">VLEs <Badge className="ml-2">{allVlesCount}</Badge></TabsTrigger>
                <TabsTrigger value="customer-management">Customers <Badge className="ml-2">{allCustomersCount}</Badge></TabsTrigger>
                <TabsTrigger value="all-tasks">Tasks</TabsTrigger>
                <TabsTrigger value="payouts">Payouts <Badge className="ml-2">{payoutTaskCount}</Badge></TabsTrigger>
                <TabsTrigger value="complaints">Complaints <Badge className="ml-2">{openComplaintsCount}</Badge></TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <StatCard title="Total Tasks" value={allTasksCount.toString()} icon={Briefcase} description="All tasks in the system" />
                    <StatCard title="Total VLEs" value={allVlesCount.toString()} icon={Users} description="Registered VLEs" />
                    <StatCard title="Total Customers" value={allCustomersCount.toString()} icon={Users2} description="Registered customers" />
                    <StatCard title="Open Complaints" value={openComplaintsCount.toString()} icon={AlertTriangle} description="Awaiting admin response" />
                    <StatCard title="Pending Payouts" value={payoutTaskCount.toString()} icon={Wallet} description="Tasks needing payout approval" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader><CardTitle>VLEs Pending Approval</CardTitle></CardHeader>
                        <CardContent>
                            {pendingVles.length > 0 ? (
                                <Table>
                                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Location</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {pendingVles.map(vle => (
                                            <TableRow key={vle.id}>
                                                <TableCell>{vle.name}</TableCell>
                                                <TableCell>{vle.location}</TableCell>
                                                <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => handleVleApprove(vle.id)} disabled={processingVleId === vle.id}>{processingVleId === vle.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} Approve</Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : <p className="text-sm text-muted-foreground">No VLEs are currently pending approval.</p>}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Tasks Pending Price Approval</CardTitle></CardHeader>
                        <CardContent>
                            {pricingTasks.length > 0 ? (
                                <Table>
                                    <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Service</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {pricingTasks.map(task => (
                                            <TableRow key={task.id}>
                                                <TableCell>{task.customer}</TableCell>
                                                <TableCell>{task.service}</TableCell>
                                                <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link href={`/dashboard/task/${task.id}`}>Set Price</Link></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : <p className="text-sm text-muted-foreground">No tasks are currently pending pricing.</p>}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Pending Balance Requests</CardTitle></CardHeader>
                        <CardContent>
                            {data.paymentRequests.length > 0 ? (
                                <Table>
                                    <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Amount</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {data.paymentRequests.map(req => (
                                            <TableRow key={req.id}>
                                                <TableCell>{req.userName}</TableCell>
                                                <TableCell>₹{req.amount.toFixed(2)}</TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button size="sm" variant="destructive" onClick={() => handleBalanceRequest(req, 'rejected')} disabled={processingBalanceRequestId === req.id}><XCircle className="mr-2 h-4 w-4"/>Reject</Button>
                                                    <Button size="sm" variant="outline" onClick={() => handleBalanceRequest(req, 'approved')} disabled={processingBalanceRequestId === req.id}>{processingBalanceRequestId === req.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Approve"}</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : <p className="text-sm text-muted-foreground">No pending balance requests.</p>}
                        </CardContent>
                    </Card>
                </div>
                 <div className='pt-4'>
                    <Card className='border-destructive/50'>
                        <CardHeader>
                            <CardTitle className='text-destructive'>Danger Zone</CardTitle>
                            <CardDescription>These are irreversible actions. Use with caution.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                     <Button variant="destructive">Reset All Application Data</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete all tasks, camps, and notifications, and reset all user wallet balances to zero.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleResetData}>Yes, reset everything</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            <TabsContent value="vle-management" className="mt-4">
                <Card>
                    <CardHeader><div className="flex items-center justify-between"><div><CardTitle>VLE Management</CardTitle><CardDescription>Approve or manage VLE accounts and see their availability.</CardDescription></div><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search VLE by name..." className="pl-8 w-72" value={searchQueries.vles} onChange={(e) => handleSearchChange('vles', e.target.value)} /></div></div></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Location</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead><TableHead>Availability</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {isLoading.vles ? <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="animate-spin" /></TableCell></TableRow> : data.vles.map(vle => (
                                <TableRow key={vle.id}>
                                    <TableCell>{vle.name}</TableCell>
                                    <TableCell>{vle.location}</TableCell>
                                    <TableCell>₹{vle.walletBalance?.toFixed(2) || '0.00'}</TableCell>
                                    <TableCell><Badge variant={vle.status === 'Approved' ? 'default' : 'secondary'}>{vle.status}</Badge></TableCell>
                                    <TableCell>{vle.status === 'Approved' ? (<Switch checked={vle.available} onCheckedChange={(checked) => handleVleAvailabilityChange(vle.id, checked)} aria-label="Toggle VLE Availability" />) : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {vle.status === 'Pending' && <DropdownMenuItem onClick={() => handleVleApprove(vle.id)} disabled={processingVleId === vle.id}>{processingVleId === vle.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}Approve VLE</DropdownMenuItem>}
                                                {vle.status === 'Approved' && <AddBalanceDialog trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}><Wallet className="mr-2 h-4 w-4"/>Add Balance</DropdownMenuItem>} vleName={vle.name} onAddBalance={(amount) => handleUpdateVleBalance(vle.id, amount)} />}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem asChild><a href={`mailto:${vle.email}`}><Mail className="mr-2 h-4 w-4"/>Email VLE</a></DropdownMenuItem>
                                                <DropdownMenuItem asChild><a href={`tel:${vle.mobile}`}><Phone className="mr-2 h-4 w-4"/>Call VLE</a></DropdownMenuItem>
                                                <DropdownMenuItem asChild><a href={`https://wa.me/91${vle.mobile}`} target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="mr-2 h-5 w-5"/>WhatsApp</a></DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handlePrevPage('vles')} disabled={page.vles === 1}><ChevronLeft className="mr-2 h-4 w-4"/>Previous</Button>
                        <Button variant="outline" size="sm" onClick={() => handleNextPage('vles')} disabled={data.vles.length < PAGE_SIZE}>Next<ChevronRight className="ml-2 h-4 w-4"/></Button>
                    </CardFooter>
                </Card>
            </TabsContent>
            
            <TabsContent value="customer-management" className="mt-4">
                <Card>
                    <CardHeader><div className="flex items-center justify-between"><div><CardTitle>Customer Management</CardTitle><CardDescription>View all registered customers in the system.</CardDescription></div><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by name..." className="pl-8 w-80" value={searchQueries.customers} onChange={(e) => handleSearchChange('customers', e.target.value)} /></div></div></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Mobile</TableHead><TableHead>Location</TableHead></TableRow></TableHeader>
                            <TableBody>{isLoading.customers ? <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="animate-spin" /></TableCell></TableRow> : data.customers.map(user => (<TableRow key={user.id}><TableCell>{user.name}</TableCell><TableCell>{user.email}</TableCell><TableCell>{user.mobile}</TableCell><TableCell>{user.location}</TableCell></TableRow>))}</TableBody>
                        </Table>
                    </CardContent>
                     <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handlePrevPage('customers')} disabled={page.customers === 1}><ChevronLeft className="mr-2 h-4 w-4"/>Previous</Button>
                        <Button variant="outline" size="sm" onClick={() => handleNextPage('customers')} disabled={data.customers.length < PAGE_SIZE}>Next<ChevronRight className="ml-2 h-4 w-4"/></Button>
                    </CardFooter>
                </Card>
            </TabsContent>

            <TabsContent value="all-tasks" className="mt-4">
                <Card>
                    <CardHeader><div className="flex items-center justify-between"><div><CardTitle>All Service Requests</CardTitle><CardDescription>View and manage all tasks in the system.</CardDescription></div><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by customer name..." className="pl-8 w-80" value={searchQueries.tasks} onChange={(e) => handleSearchChange('tasks', e.target.value)} /></div></div></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Task ID</TableHead><TableHead>Customer</TableHead><TableHead>Service</TableHead><TableHead>Status</TableHead><TableHead>Assigned VLE</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {isLoading.tasks ? <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="animate-spin" /></TableCell></TableRow> : data.tasks.map(task => {
                                    const availableVles = (data.allVles || []).filter(vle => {
                                        if (vle.status !== 'Approved' || !vle.available) return false;
                                        if (task.type === 'VLE Lead' && vle.id === task.creatorId) return false;
                                        return true;
                                    });
                                    return (
                                        <TableRow key={task.id}>
                                            <TableCell className="font-medium">{task.id.slice(-6).toUpperCase()}</TableCell>
                                            <TableCell>{task.customer}</TableCell>
                                            <TableCell>{task.service}</TableCell>
                                            <TableCell><Badge variant="outline">{task.status}</Badge></TableCell>
                                            <TableCell>{task.assignedVleName || 'N/A'}</TableCell>
                                            <TableCell>{format(new Date(task.date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild><Link href={`/dashboard/task/${task.id}`}><Eye className="mr-2 h-4 w-4"/>View Details</Link></DropdownMenuItem>
                                                        {task.status === 'Unassigned' && <AssignVleDialog trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}><GitFork className="mr-2 h-4 w-4"/>Assign VLE</DropdownMenuItem>} taskId={task.id} availableVles={availableVles} onAssign={handleAssignVle} />}
                                                        {task.status === 'Completed' && <DropdownMenuItem onClick={() => handleApprovePayout(task)} disabled={processingPayoutTaskId === task.id}>{processingPayoutTaskId === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CircleDollarSign className="mr-2 h-4 w-4" />}Approve Payout</DropdownMenuItem>}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                     <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handlePrevPage('tasks')} disabled={page.tasks === 1}><ChevronLeft className="mr-2 h-4 w-4"/>Previous</Button>
                        <Button variant="outline" size="sm" onClick={() => handleNextPage('tasks')} disabled={data.tasks.length < PAGE_SIZE}>Next<ChevronRight className="ml-2 h-4 w-4"/></Button>
                    </CardFooter>
                </Card>
            </TabsContent>

            <TabsContent value="payouts" className="mt-4">
                <Card>
                    <CardHeader><CardTitle>Pending Payouts</CardTitle><CardDescription>Review and approve payouts for completed tasks.</CardDescription></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Task ID</TableHead><TableHead>VLE</TableHead><TableHead>Service</TableHead><TableHead>Total Paid</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {data.payoutTasks.length > 0 ? data.payoutTasks.map(task => (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-medium">{task.id.slice(-6).toUpperCase()}</TableCell>
                                        <TableCell>{task.assignedVleName}</TableCell>
                                        <TableCell>{task.service}</TableCell>
                                        <TableCell>₹{task.totalPaid?.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => handleApprovePayout(task)} disabled={processingPayoutTaskId === task.id}>
                                                {processingPayoutTaskId === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CircleDollarSign className="mr-2 h-4 w-4" />}
                                                Approve Payout
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={5} className="h-24 text-center">No tasks are currently awaiting payout.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="complaints" className="mt-4">
                <Card>
                    <CardHeader><CardTitle>Customer Complaints</CardTitle><CardDescription>Review and resolve all customer complaints.</CardDescription></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Task ID</TableHead><TableHead>Customer</TableHead><TableHead>Complaint</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {data.complaints.map(c => (
                                <TableRow key={c.date}>
                                    <TableCell className="font-medium">{c.taskId.slice(-6).toUpperCase()}</TableCell>
                                    <TableCell>{c.customer}</TableCell>
                                    <TableCell className="max-w-xs break-words">{c.text}</TableCell>
                                    <TableCell><Badge variant={c.status === 'Open' ? 'destructive' : 'default'}>{c.status}</Badge></TableCell>
                                    <TableCell className="text-right">{c.status === 'Open' && <ComplaintResponseDialog trigger={<Button size="sm">Respond</Button>} complaint={c} taskId={c.taskId} customerId={c.customerId} onResponseSubmit={handleComplaintResponse} />}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}
