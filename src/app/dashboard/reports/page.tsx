
'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Mail, BarChart2, Briefcase, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';

// --- Admin Reports ---
const AdminReports = ({ tasks, vles }: { tasks: any[], vles: any[] }) => {
    const { toast } = useToast();
    const taskStatusCounts = useMemo(() => {
        return tasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });
    }, [tasks]);

    const taskStatusData = Object.entries(taskStatusCounts).map(([status, count]) => ({ status, count }));

    const vlePerformance = useMemo(() => {
        return vles.filter(v => !v.isAdmin).map(vle => {
            const assignedTasks = tasks.filter(t => t.assignedVleId === vle.id);
            const completedTasks = assignedTasks.filter(t => t.status === 'Completed');
            const totalCommission = completedTasks.reduce((sum, task) => sum + (task.rate || 0), 0);
            return {
                ...vle,
                tasksAssigned: assignedTasks.length,
                tasksCompleted: completedTasks.length,
                totalCommission,
            };
        });
    }, [tasks, vles]);

    const chartConfig: ChartConfig = {
        count: {
          label: "Tasks",
        },
        Assigned: {
          label: "Assigned",
          color: "hsl(var(--chart-1))",
        },
        Completed: {
          label: "Completed",
          color: "hsl(var(--chart-2))",
        },
        Unassigned: {
          label: "Unassigned",
          color: "hsl(var(--chart-3))",
        },
        'Awaiting Payment': {
          label: "Awaiting Payment",
          color: "hsl(var(--chart-4))",
        },
         'Pending Price Approval': {
          label: "Pending Price",
          color: "hsl(var(--chart-5))",
        },
      } satisfies ChartConfig

    const handleEmailReport = (vle: any) => {
        const subject = `Your Weekly Performance Report - eGoa Sarathi`;
        const body = `
Hi ${vle.name},

Here is your performance summary:

- Tasks Assigned: ${vle.tasksAssigned}
- Tasks Completed: ${vle.tasksCompleted}
- Total Fees Processed: ₹${vle.totalCommission.toFixed(2)}

Keep up the great work!

Regards,
eGoa Sarathi Admin Team
        `.trim().replace(/\n/g, '%0A').replace(/ /g, '%20');

        window.location.href = `mailto:${vle.email}?subject=${subject}&body=${body}`;
        toast({ title: "Email Ready", description: "Your email client has been opened with the report."});
    };
    

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Task Status Overview</CardTitle>
                        <CardDescription>A summary of all tasks in the system.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                            <BarChart accessibilityLayer data={taskStatusData}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="status" tickLine={false} tickMargin={10} axisLine={false} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="count" fill="var(--color-Assigned)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>VLE Performance</CardTitle>
                         <CardDescription>Performance metrics for all VLEs.</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>VLE Name</TableHead>
                                    <TableHead>Tasks Assigned</TableHead>
                                    <TableHead>Tasks Completed</TableHead>
                                    <TableHead>Fees Processed</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vlePerformance.map(vle => (
                                    <TableRow key={vle.id}>
                                        <TableCell>{vle.name}</TableCell>
                                        <TableCell>{vle.tasksAssigned}</TableCell>
                                        <TableCell>{vle.tasksCompleted}</TableCell>
                                        <TableCell>₹{vle.totalCommission.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleEmailReport(vle)}>
                                                <Mail className="mr-2 h-4 w-4" /> Email Report
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </CardContent>
                 </Card>
            </div>
        </div>
    );
};

// --- VLE Reports ---
const VleReports = ({ tasks, userProfile }: { tasks: any[], userProfile: any }) => {
    const assignedTasks = useMemo(() => tasks.filter(t => t.assignedVleId === userProfile.id), [tasks, userProfile.id]);
    
    const stats = useMemo(() => {
        const completed = assignedTasks.filter(t => t.status === 'Completed').length;
        const pending = assignedTasks.length - completed;
        const totalCommission = assignedTasks
            .filter(t => t.status === 'Completed')
            .reduce((sum, task) => sum + (task.rate || 0), 0);
        
        return {
            total: assignedTasks.length,
            completed,
            pending,
            totalCommission,
        };
    }, [assignedTasks]);

    return (
        <div className="space-y-6">
             <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Assigned Tasks</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.completed}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pending}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Fees Processed</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.totalCommission.toFixed(2)}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Your Assigned Tasks</CardTitle>
                    <CardDescription>A list of all tasks assigned to you.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Task ID</TableHead>
                                <TableHead>Service</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Fee</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assignedTasks.map(task => (
                                <TableRow key={task.id}>
                                    <TableCell>{task.id.slice(-6).toUpperCase()}</TableCell>
                                    <TableCell>{task.service}</TableCell>
                                    <TableCell>{task.status}</TableCell>
                                    <TableCell>₹{task.rate?.toFixed(2) || '0.00'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default function ReportsPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    
    const [tasks, setTasks] = useState<any[]>([]);
    const [vles, setVles] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!authLoading && !userProfile) {
            router.push('/');
        }
    }, [userProfile, authLoading, router]);

    useEffect(() => {
        if (!userProfile) return;

        let unsubTasks: () => void = () => {};
        let unsubVles: () => void = () => {};

        if (userProfile.isAdmin) {
            const tasksQuery = query(collection(db, "tasks"));
            unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
                setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoadingData(false);
            });
            const vlesQuery = query(collection(db, "vles"));
            unsubVles = onSnapshot(vlesQuery, (snapshot) => {
                setVles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
        } else { // VLE
            const tasksQuery = query(collection(db, "tasks"), where('assignedVleId', '==', userProfile.id));
             unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
                setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoadingData(false);
            });
        }
        
        return () => {
            unsubTasks();
            unsubVles();
        };

    }, [userProfile]);

    if (authLoading || loadingData) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!userProfile) return null;

    return userProfile.isAdmin 
        ? <AdminReports tasks={tasks} vles={vles} /> 
        : <VleReports tasks={tasks} userProfile={userProfile} />;
}
