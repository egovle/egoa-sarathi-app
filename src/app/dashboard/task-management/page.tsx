
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, where, orderBy, getDocs, limit, startAfter, Query, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Task } from '@/lib/types';


const PAGE_SIZE = 15;

export default function TaskManagementPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    
    // Filtering and Searching State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    
    // Pagination State
    const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
    const [firstVisible, setFirstVisible] = useState<DocumentData | null>(null);
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/dashboard');
        }
    }, [user, userProfile, authLoading, router]);

    const fetchTasks = useCallback(async (direction: 'next' | 'prev' | 'initial' = 'initial') => {
        setLoadingData(true);
        if (!userProfile) return;

        let baseConditions: any[] = [orderBy("date", "desc")];

        // VLEs see their assigned tasks
        if (userProfile.role === 'vle') {
            baseConditions.unshift(where("assignedVleId", "==", userProfile.id));
        }
        // Admins see all tasks, so no user-based where clause is added for them.

        if (statusFilter !== 'all') {
             baseConditions.unshift(where("status", "==", statusFilter));
        }
        
        let finalQuery: Query<DocumentData>;
        const collectionRef = collection(db, "tasks");

        if (direction === 'next' && lastVisible) {
            finalQuery = query(collectionRef, ...baseConditions, startAfter(lastVisible), limit(PAGE_SIZE));
        } else {
            finalQuery = query(collectionRef, ...baseConditions, limit(PAGE_SIZE));
        }

        try {
            const snapshot = await getDocs(finalQuery);
            const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
            setTasks(fetchedTasks);

            if (!snapshot.empty) {
                setFirstVisible(snapshot.docs[0]);
                setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
            } else {
                setFirstVisible(null);
                setLastVisible(null);
            }
        } catch (error) {
            console.error("Error fetching tasks:", error);
        } finally {
            setLoadingData(false);
        }
    }, [userProfile, statusFilter, lastVisible]);
    
    useEffect(() => {
        if (userProfile) {
            fetchTasks('initial');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userProfile, statusFilter]); // Re-fetch when filter changes

    const handleNextPage = () => {
        setPage(p => p + 1);
        fetchTasks('next');
    };

    const handlePrevPage = () => {
        setPage(1);
        setLastVisible(null);
        fetchTasks('initial');
    };

    const filteredTasks = useMemo(() => {
        if (!searchQuery) return tasks;
        const lowercasedQuery = searchQuery.toLowerCase();
        return tasks.filter(task => 
            task.id.toLowerCase().includes(lowercasedQuery) ||
            task.service.toLowerCase().includes(lowercasedQuery) ||
            task.customer.toLowerCase().includes(lowercasedQuery) ||
            task.assignedVleName?.toLowerCase().includes(lowercasedQuery)
        );
    }, [tasks, searchQuery]);
    
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
             <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page <= 1}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={tasks.length < PAGE_SIZE}>
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );
}
