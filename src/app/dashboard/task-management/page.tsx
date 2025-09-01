
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, where, orderBy, getDocs, limit, startAfter, Query, DocumentData, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Task } from '@/lib/types';


export default function TaskManagementPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/dashboard');
        }
    }, [user, userProfile, authLoading, router]);
    
    useEffect(() => {
        if (!userProfile) return;

        setLoadingData(true);
        let q: Query<DocumentData>;

        if (userProfile.isAdmin) {
             q = query(collection(db, "tasks"), orderBy("date", "desc"));
        } else if (userProfile.role === 'vle') {
            q = query(
                collection(db, "tasks"), 
                where("assignedVleId", "==", userProfile.id), 
                where("status", "in", ['Assigned', 'Awaiting Documents', 'In Progress', 'Completed', 'Paid Out', 'Complaint Raised']),
                orderBy("date", "desc")
            );
        } else {
            setAllTasks([]);
            setLoadingData(false);
            return;
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
            setAllTasks(fetchedTasks);
            setLoadingData(false);
        }, (error) => {
            console.error("Error fetching tasks:", error);
            setLoadingData(false);
        });

        return () => unsubscribe();
    }, [userProfile]);

    const filteredTasks = useMemo(() => {
        let tasksToFilter = allTasks;

        if (statusFilter !== 'all') {
             if (statusFilter === 'all-pending') {
                const pendingStatuses: Task['status'][] = ['Unassigned', 'Pending Price Approval', 'Pending VLE Acceptance', 'Awaiting Documents', 'Assigned', 'In Progress', 'Awaiting Payment', 'Complaint Raised'];
                tasksToFilter = tasksToFilter.filter(task => pendingStatuses.includes(task.status));
            } else {
                tasksToFilter = tasksToFilter.filter(task => task.status === statusFilter);
            }
        }
        
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            tasksToFilter = tasksToFilter.filter(task => 
                task.id.toLowerCase().includes(lowercasedQuery) ||
                task.service.toLowerCase().includes(lowercasedQuery) ||
                task.customer.toLowerCase().includes(lowercasedQuery) ||
                task.assignedVleName?.toLowerCase().includes(lowercasedQuery)
            );
        }

        return tasksToFilter;
    }, [allTasks, statusFilter, searchQuery]);
    
    const pageTitle = userProfile?.isAdmin ? "Task Management (All)" : "Your Active Tasks";
    const pageDescription = userProfile?.isAdmin ? "View, search, and manage all tasks in the system." : "Tasks you have accepted and are currently working on.";
    
    if (authLoading || !userProfile) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{pageTitle}</CardTitle>
                        <CardDescription>{pageDescription}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input 
                            placeholder="Search ID, service, customer, VLE..." 
                            className="w-72"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                         <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="all-pending">All Pending</SelectItem>
                                <SelectItem value="Unassigned">Unassigned</SelectItem>
                                <SelectItem value="Pending VLE Acceptance">Pending Acceptance</SelectItem>
                                <SelectItem value="Awaiting Payment">Awaiting Payment</SelectItem>
                                <SelectItem value="Awaiting Documents">Awaiting Documents</SelectItem>
                                <SelectItem value="Assigned">Assigned</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Paid Out">Paid Out</SelectItem>
                                <SelectItem value="Complaint Raised">Complaint Raised</SelectItem>
                            </SelectContent>
                        </Select>
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
                        <TableHead>Customer</TableHead>
                        {userProfile.isAdmin && <TableHead>Assigned VLE</TableHead>}
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loadingData ? (
                            <TableRow><TableCell colSpan={userProfile.isAdmin ? 7 : 6} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/></TableCell></TableRow>
                        ) : filteredTasks.length > 0 ? filteredTasks.map(task => (
                        <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.id.slice(-6).toUpperCase()}</TableCell>
                            <TableCell>{task.service}</TableCell>
                            <TableCell><Badge variant="outline">{task.status}</Badge></TableCell>
                            <TableCell>{task.customer}</TableCell>
                             {userProfile.isAdmin && <TableCell>{task.assignedVleName || 'N/A'}</TableCell>}
                            <TableCell>{format(new Date(task.date), 'dd MMM yyyy')}</TableCell>
                            <TableCell className="text-right">
                                <Button asChild variant="outline" size="sm"><Link href={`/dashboard/task/${task.id}`}>View Details</Link></Button>
                            </TableCell>
                        </TableRow>
                        )) : <TableRow><TableCell colSpan={userProfile.isAdmin ? 7 : 6} className="h-24 text-center">No tasks found for the current filter.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
