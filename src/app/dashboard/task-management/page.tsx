
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import type { Task } from '@/lib/types';


export default function TaskManagementPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!authLoading && (!user || userProfile?.role !== 'vle')) {
            router.push('/dashboard');
        }
    }, [user, userProfile, authLoading, router]);

    useEffect(() => {
        if (!user) return;
        setLoadingData(true);

        const tasksQuery = query(collection(db, "tasks"), where("assignedVleId", "==", user.uid));
        const unsubscribe = onSnapshot(tasksQuery, snapshot => {
            const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
            fetchedTasks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTasks(fetchedTasks.filter(t => t.status !== 'Pending VLE Acceptance'));
            setLoadingData(false);
        });

        return () => unsubscribe();
    }, [user]);

    const filteredTasks = useMemo(() => {
        if (!searchQuery) return tasks;
        return tasks.filter(task => 
            task.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.customer.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [tasks, searchQuery]);

    if (authLoading || loadingData) {
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
                        <CardTitle>Your Active Tasks</CardTitle>
                        <CardDescription>Tasks you have accepted and are currently working on.</CardDescription>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by ID, service, or customer..." 
                            className="pl-8 w-72"
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
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTasks.length > 0 ? filteredTasks.map(task => (
                        <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.id.slice(-6).toUpperCase()}</TableCell>
                            <TableCell>{task.service}</TableCell>
                            <TableCell><Badge variant="outline">{task.status}</Badge></TableCell>
                            <TableCell>{task.customer}</TableCell>
                            <TableCell>{format(new Date(task.date), 'dd MMM yyyy')}</TableCell>
                            <TableCell className="text-right">
                                <Button asChild variant="outline" size="sm"><Link href={`/dashboard/task/${task.id}`}>View Details</Link></Button>
                            </TableCell>
                        </TableRow>
                        )) : <TableRow><TableCell colSpan={6} className="h-24 text-center">You have no active tasks.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
