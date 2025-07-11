
'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Mail, BarChart2, Briefcase, CheckCircle, Clock, AlertTriangle, Wallet, TrendingUp, Sparkles, Tent, Award } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, ResponsiveContainer, PieChart, Pie, Cell, Legend, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import type { Task, VLEProfile, UserProfile, Camp } from '@/lib/types';
import { ADMIN_COMMISSION_RATE } from '@/lib/config';
import { calculateVleEarnings } from '@/lib/utils';


const AdminReports = ({ tasks, vles, camps }: { tasks: Task[], vles: VLEProfile[], camps: Camp[] }) => {
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
            const completedTasks = assignedTasks.filter(t => t.status === 'Paid Out');
            const totalCommission = completedTasks.reduce((sum, task) => {
                 const { vleCommission } = calculateVleEarnings(task);
                return sum + vleCommission;
            }, 0);
            return {
                ...vle,
                tasksAssigned: assignedTasks.length,
                tasksCompleted: completedTasks.length,
                totalCommission,
            };
        }).sort((a,b) => b.tasksCompleted - a.tasksCompleted);
    }, [tasks, vles]);

    const revenueByMonth = useMemo(() => {
        const data: { [key: string]: number } = {};
        tasks.filter(t => t.status === 'Paid Out' || t.status === 'Completed').forEach(task => {
            const month = format(new Date(task.date), 'yyyy-MM');
            const { adminCommission } = calculateVleEarnings(task);
            data[month] = (data[month] || 0) + adminCommission;
        });
        return Object.entries(data)
            .map(([month, revenue]) => ({ month: format(new Date(month), 'MMM yy'), revenue }))
            .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
    }, [tasks]);

    const popularServices = useMemo(() => {
        const data: { [key: string]: number } = {};
        tasks.forEach(task => {
            data[task.service] = (data[task.service] || 0) + 1;
        });
        return Object.entries(data)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Top 5
    }, [tasks]);

    const campFinancials = useMemo(() => {
        const paidOutCamps = camps.filter(c => c.status === 'Paid Out');
        const totalVlePayouts = paidOutCamps.reduce((sum, camp) => {
            const campTotal = camp.payouts?.reduce((payoutSum, p) => payoutSum + p.amount, 0) || 0;
            return sum + campTotal;
        }, 0);
        const totalAdminEarnings = paidOutCamps.reduce((sum, camp) => sum + (camp.adminEarnings || 0), 0);
        return { totalVlePayouts, totalAdminEarnings };
    }, [camps]);

     const chartConfig: ChartConfig = {
        count: {
          label: "Tasks",
        },
        'Paid Out': {
            label: "Paid Out",
            color: "hsl(120, 80%, 40%)",
        },
        Completed: {
          label: "Completed",
          color: "hsl(var(--chart-2))",
        },
        'In Progress': {
            label: 'In Progress',
            color: 'hsl(210, 80%, 60%)',
        },
        Assigned: {
          label: "Assigned",
          color: "hsl(var(--chart-1))",
        },
        Unassigned: {
          label: "Unassigned",
          color: "hsl(var(--destructive))",
        },
         'Awaiting Documents': {
          label: "Awaiting Docs",
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
        'Complaint Raised': {
          label: "Complaint",
          color: "hsl(0, 100%, 30%)",
        },
      } satisfies ChartConfig

      const revenueChartConfig: ChartConfig = {
        revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
    };

    const handleEmailReport = (vle: any) => {
        const subject = `Your Weekly Performance Report - eGoa Sarathi`;
        const body = `
Hi ${vle.name},

Here is your performance summary:

- Tasks Assigned: ${vle.tasksAssigned}
- Tasks Completed: ${vle.tasksCompleted}
- Total Commission Earned: ₹${vle.totalCommission.toFixed(2)}

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
                            <BarChart accessibilityLayer data={taskStatusData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid horizontal={false} />
                                <XAxis type="number" hide />
                                 <YAxis
                                    dataKey="status"
                                    type="category"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    width={120}
                                />
                                <ChartTooltip 
                                    cursor={false}
                                    content={<ChartTooltipContent 
                                        labelKey="count"
                                        indicator="dot"
                                    />} 
                                />
                                <Bar dataKey="count" radius={5}>
                                    {taskStatusData.map((entry) => (
                                        <Cell key={entry.status} fill={chartConfig[entry.status as keyof typeof chartConfig]?.color || 'hsl(var(--muted))'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Top VLE Performance</CardTitle>
                         <CardDescription>Performance metrics for all VLEs, sorted by completions.</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>VLE Name</TableHead>
                                    <TableHead>Tasks Assigned</TableHead>
                                    <TableHead>Tasks Completed</TableHead>
                                    <TableHead>Commission Earned</TableHead>
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
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Task Revenue Over Time</CardTitle>
                    </CardHeader>
                    <CardDescription className="px-6 -mt-4">Based on 20% commission from completed tasks.</CardDescription>
                    <CardContent>
                        <ChartContainer config={revenueChartConfig} className="min-h-[250px] w-full pt-4">
                            <BarChart data={revenueByMonth}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center gap-2">
                         <Sparkles className="h-5 w-5 text-muted-foreground" />
                         <CardTitle>Most Popular Services</CardTitle>
                    </CardHeader>
                     <CardDescription className="px-6 -mt-4">Top 5 services by task count.</CardDescription>
                    <CardContent className="pt-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Service Name</TableHead>
                                    <TableHead className="text-right">Bookings</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {popularServices.length > 0 ? popularServices.map(service => (
                                    <TableRow key={service.name}>
                                        <TableCell className="font-medium">{service.name}</TableCell>
                                        <TableCell className="text-right">{service.count}</TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={2} className="h-24 text-center">No task data available.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center gap-2">
                         <Tent className="h-5 w-5 text-muted-foreground" />
                         <CardTitle>Camp Financials</CardTitle>
                    </CardHeader>
                     <CardDescription className="px-6 -mt-4">Summary of earnings from all paid out camps.</CardDescription>
                    <CardContent className="pt-6 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Payouts to VLEs</span>
                            <span className="font-medium">₹{campFinancials.totalVlePayouts.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-muted-foreground">Total Admin Earnings</span>
                             <span className="font-medium">₹{campFinancials.totalAdminEarnings.toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

const VleReports = ({ tasks, camps, userProfile }: { tasks: Task[], camps: Camp[], userProfile: VLEProfile }) => {
    
    const stats = useMemo(() => {
        const paidOutTasks = tasks.filter(t => t.status === 'Paid Out');
        
        const totalTaskCommission = paidOutTasks.reduce((sum, task) => {
            const { vleCommission, governmentFee } = calculateVleEarnings(task);
            return sum + vleCommission + governmentFee;
        }, 0);

        const myAcceptedCamps = camps.filter(c => c.assignedVles?.some(v => v.vleId === userProfile.id && v.status === 'accepted'));
        const paidOutCamps = myAcceptedCamps.filter(c => c.status === 'Paid Out');

        const totalCampPayout = paidOutCamps.reduce((sum, camp) => {
            const myPayout = camp.payouts?.find(p => p.vleId === userProfile.id)?.amount || 0;
            return sum + myPayout;
        }, 0);
        
        return {
            totalTasks: tasks.length,
            completedTasks: paidOutTasks.length,
            pendingTasks: tasks.length - paidOutTasks.length,
            totalCamps: myAcceptedCamps.length,
            paidOutCamps: paidOutCamps.length,
            totalEarnings: totalTaskCommission + totalCampPayout,
        };
    }, [tasks, camps, userProfile]);

    return (
        <div className="space-y-6">
             <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Assigned Tasks</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalTasks}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Paid Out Tasks</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.completedTasks}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Assigned Camps</CardTitle>
                        <Tent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalCamps}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Paid Out Camps</CardTitle>
                        <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.paidOutCamps}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingTasks}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Your Total Earnings</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.totalEarnings.toFixed(2)}</div>
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
                                <TableHead>Total Fee</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tasks.map(task => (
                                <TableRow key={task.id}>
                                    <TableCell>{task.id.slice(-6).toUpperCase()}</TableCell>
                                    <TableCell>{task.service}</TableCell>
                                    <TableCell>{task.status}</TableCell>
                                    <TableCell>₹{(task.totalPaid || 0).toFixed(2)}</TableCell>
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
    
    const [tasks, setTasks] = useState<Task[]>([]);
    const [vles, setVles] = useState<VLEProfile[]>([]);
    const [camps, setCamps] = useState<Camp[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!authLoading && !userProfile) {
            router.push('/');
        }
    }, [userProfile, authLoading, router]);

    useEffect(() => {
        if (!userProfile) return;

        setLoadingData(true);

        let unsubTasks: () => void = () => {};
        let unsubVles: () => void = () => {};
        let unsubCamps: () => void = () => {};

        const campsQuery = query(collection(db, "camps"), orderBy('date', 'desc'));
        unsubCamps = onSnapshot(campsQuery, (snapshot) => {
            setCamps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Camp));
        });

        if (userProfile.isAdmin) {
            const tasksQuery = query(collection(db, "tasks"));
            unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
                setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task));
                setLoadingData(false);
            });
            const vlesQuery = query(collection(db, "vles"));
            unsubVles = onSnapshot(vlesQuery, (snapshot) => {
                setVles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as VLEProfile));
            });
        } else if (userProfile.role === 'vle') {
            const tasksQuery = query(collection(db, "tasks"), where('assignedVleId', '==', userProfile.id));
             unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
                setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task));
                setLoadingData(false);
            });
        }
        
        return () => {
            unsubTasks();
            unsubVles();
            unsubCamps();
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

    if (userProfile.role === 'customer' || userProfile.role === 'government') {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Reports</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Reporting features are available for VLEs and Admins.</p>
                </CardContent>
            </Card>
        )
    }

    return userProfile.isAdmin 
        ? <AdminReports tasks={tasks} vles={vles} camps={camps} /> 
        : <VleReports tasks={tasks} camps={camps} userProfile={userProfile as VLEProfile} />;
}
