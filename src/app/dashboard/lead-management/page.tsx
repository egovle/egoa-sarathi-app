
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { FilePlus, Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { TaskCreatorDialog } from '@/components/dashboard/shared';
import type { Task, Service } from '@/lib/types';


export default function LeadManagementPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [leads, setLeads] = useState<Task[]>([]);
    const [services, setServices] = useState<Service[]>([]);
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

        const leadsQuery = query(collection(db, "tasks"), where("creatorId", "==", user.uid));
        const unsubLeads = onSnapshot(leadsQuery, snapshot => {
            const fetchedLeads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
            fetchedLeads.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setLeads(fetchedLeads);
            setLoadingData(false);
        });

        const servicesQuery = query(collection(db, "services"));
        const unsubServices = onSnapshot(servicesQuery, snapshot => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Service));
        });

        return () => {
            unsubLeads();
            unsubServices();
        };
    }, [user]);

    const filteredLeads = useMemo(() => {
        if (!searchQuery) return leads;
        return leads.filter(task => 
            task.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.customer.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [leads, searchQuery]);

    if (authLoading || loadingData) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!user || !userProfile) return null;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>My Generated Leads</CardTitle>
                        <CardDescription>Track the status of tasks you created for customers.</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by ID, service, or customer..." 
                                className="pl-8 w-72"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                         <TaskCreatorDialog 
                            services={services} 
                            type="VLE Lead" 
                            creatorId={user.uid} 
                            creatorProfile={userProfile} 
                            buttonTrigger={
                                <Button size="sm" className="h-9 gap-1">
                                    <FilePlus className="h-3.5 w-3.5" />Generate New Lead
                                </Button>
                            } 
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
                    {filteredLeads.length > 0 ? filteredLeads.map(task => (
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
                    )) : <TableRow><TableCell colSpan={6} className="h-24 text-center">You have not generated any leads.</TableCell></TableRow>}
                </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
