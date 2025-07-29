
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Mail, Wallet, Tent, Award, Briefcase, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Task, VLEProfile, UserProfile, Camp, Service } from '@/lib/types';
import { calculateVleEarnings } from '@/lib/utils';


const AdminReports = ({ tasks, vles, camps, services }: { tasks: Task[], vles: VLEProfile[], camps: Camp[], services: Service[] }) => {
    const { toast } = useToast();
    const [selectedPincode, setSelectedPincode] = useState('all-pincodes');
    const [selectedService, setSelectedService] = useState('all-services');

    const uniquePincodes = useMemo(() => {
        const pincodes = new Set(vles.map(v => v.pincode));
        return Array.from(pincodes).sort();
    }, [vles]);

    const vlePerformance = useMemo(() => {
        const filteredTasks = tasks.filter(task => {
            if (selectedService && selectedService !== 'all-services' && task.serviceId !== selectedService) {
                return false;
            }
            return true;
        });

        const filteredVles = vles.filter(vle => {
            if (selectedPincode && selectedPincode !== 'all-pincodes' && vle.pincode !== selectedPincode) {
                return false;
            }
            return !vle.isAdmin;
        });
        
        return filteredVles.map(vle => {
            const assignedTasks = filteredTasks.filter(t => t.assignedVleId === vle.id);
            const completedTasks = assignedTasks.filter(t => t.status === 'Paid Out');
            const totalCommission = completedTasks.reduce((sum, task) => {
                 const { vleCommission, governmentFee } = calculateVleEarnings(task);
                return sum + vleCommission + governmentFee;
            }, 0);
            return {
                ...vle,
                tasksAssigned: assignedTasks.length,
                tasksCompleted: completedTasks.length,
                totalCommission,
            };
        }).sort((a,b) => b.tasksCompleted - a.tasksCompleted);
    }, [tasks, vles, selectedPincode, selectedService]);

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
    
    const resetFilters = () => {
        setSelectedPincode('all-pincodes');
        setSelectedService('all-services');
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Top VLE Performance</CardTitle>
                         <CardDescription>Performance metrics for all VLEs, sorted by completions.</CardDescription>
                         <div className="flex items-center gap-2 pt-2">
                            <Select value={selectedPincode} onValueChange={setSelectedPincode}>
                                <SelectTrigger><SelectValue placeholder="Filter by Pincode" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all-pincodes">All Pincodes</SelectItem>
                                    {uniquePincodes.map(pincode => <SelectItem key={pincode} value={pincode}>{pincode}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={selectedService} onValueChange={setSelectedService}>
                                <SelectTrigger><SelectValue placeholder="Filter by Service" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all-services">All Services</SelectItem>
                                    {services.filter(s => s.parentId).map(service => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                             <Button variant="outline" onClick={resetFilters}>Reset</Button>
                         </div>
                    </CardHeader>
                     <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>VLE Name</TableHead>
                                    <TableHead>Completed</TableHead>
                                    <TableHead>Commission</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vlePerformance.map(vle => (
                                    <TableRow key={vle.id}>
                                        <TableCell>{vle.name}</TableCell>
                                        <TableCell>{vle.tasksCompleted}</TableCell>
                                        <TableCell>₹{vle.totalCommission.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleEmailReport(vle)}>
                                                <Mail className="mr-2 h-4 w-4" /> Email
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </CardContent>
                 </Card>
                 <Card>
                    <CardHeader>
                         <CardTitle>Most Popular Services</CardTitle>
                     <CardDescription>Top 5 services by task count.</CardDescription>
                    </CardHeader>
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
            </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Task Revenue Over Time</CardTitle>
                    </CardHeader>
                    <CardDescription className="px-6 -mt-4">Based on 20% commission from completed tasks.</CardDescription>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Month</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {revenueByMonth.map(item => (
                                    <TableRow key={item.month}>
                                        <TableCell>{item.month}</TableCell>
                                        <TableCell className="text-right">₹{item.revenue.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
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
    const [services, setServices] = useState<Service[]>([]);
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
        let unsubServices: () => void = () => {};

        const campsQuery = query(collection(db, "camps"), orderBy('date', 'desc'));
        unsubCamps = onSnapshot(campsQuery, (snapshot) => {
            setCamps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Camp));
        });

        const servicesQuery = query(collection(db, "services"), orderBy('name'));
        unsubServices = onSnapshot(servicesQuery, (snapshot) => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Service));
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
        } else {
            setLoadingData(false);
        }
        
        return () => {
            unsubTasks();
            unsubVles();
            unsubCamps();
            unsubServices();
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
        ? <AdminReports tasks={tasks} vles={vles} camps={camps} services={services} /> 
        : <VleReports tasks={tasks} camps={camps} userProfile={userProfile as VLEProfile} />;
}

    