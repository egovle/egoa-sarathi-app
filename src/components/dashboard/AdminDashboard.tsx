
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';

import { PlusCircle, Wallet, UserCheck, Edit, Banknote, Camera, FileUp, AtSign, Trash, Send, FileText, CheckCircle2, Loader2, Users, MoreHorizontal, Eye, GitFork, UserPlus, ShieldAlert, StarIcon, MessageCircleMore, PenSquare, Briefcase, Users2, AlertTriangle, Mail, Phone, Search, Tent, Trash2, CircleDollarSign, XCircle, MessageSquare } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AddBalanceDialog, AssignVleDialog, ComplaintResponseDialog } from './shared';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.296-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
);

export default function AdminDashboard({ allTasks, allUsers, paymentRequests, processingBalanceRequestId, onComplaintResponse, onVleApprove, onVleAssign, onUpdateVleBalance, onApproveBalanceRequest, onResetData, onApprovePayout, onVleAvailabilityChange }: { allTasks: any[], allUsers: any[], paymentRequests: any[], processingBalanceRequestId: string | null, onComplaintResponse: (taskId: string, customerId: string, response: any) => void, onVleApprove: (vleId: string) => void, onVleAssign: (taskId: string, vleId: string, vleName: string) => Promise<void>, onUpdateVleBalance: (vleId: string, amount: number) => void, onApproveBalanceRequest: (req: any) => void, onResetData: () => Promise<void>, onApprovePayout: (task: any) => Promise<void>, onVleAvailabilityChange: (vleId: string, available: boolean) => void }) {
    const vlesForManagement = allUsers.filter(u => u.role === 'vle' && !u.isAdmin);
    const customersForManagement = allUsers.filter(u => u.role === 'customer');
    
    const pendingVles = vlesForManagement.filter(v => v.status === 'Pending');
    const pricingTasks = allTasks.filter(t => t.status === 'Pending Price Approval');
    const complaints = allTasks.filter(t => t.complaint).map(t => ({...t.complaint, taskId: t.id, customer: t.customer, service: t.service, date: t.date, customerId: t.creatorId}));
    const payoutTasks = useMemo(() => allTasks.filter(t => t.status === 'Completed'), [allTasks]);
    
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
    
    // Counts for badges
    const pendingVleCount = useMemo(() => pendingVles.length, [pendingVles]);
    const unassignedTaskCount = useMemo(() => allTasks.filter(t => t.status === 'Unassigned').length, [allTasks]);
    const openComplaintsCount = useMemo(() => complaints.filter(c => c.status === 'Open').length, [complaints]);
    const payoutTaskCount = useMemo(() => payoutTasks.length, [payoutTasks]);

    // Search states
    const [vleSearch, setVleSearch] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [taskSearch, setTaskSearch] = useState('');
    
    const filteredVles = useMemo(() => {
        if (!vleSearch) return vlesForManagement;
        const query = vleSearch.toLowerCase();
        return vlesForManagement.filter(vle => 
            vle.name.toLowerCase().includes(query) ||
            vle.location.toLowerCase().includes(query)
        );
    }, [vlesForManagement, vleSearch]);

    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return customersForManagement;
        const query = customerSearch.toLowerCase();
        
        const tasksByCustomer: {[key: string]: string[]} = {};
        allTasks.forEach(task => {
            if (!tasksByCustomer[task.creatorId]) {
                tasksByCustomer[task.creatorId] = [];
            }
            tasksByCustomer[task.creatorId].push(task.id);
        });

        return customersForManagement.filter(user => 
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            (user.mobile && user.mobile.includes(query)) ||
            (tasksByCustomer[user.id] || []).some(taskId => taskId.toLowerCase().includes(query))
        );
    }, [customersForManagement, allTasks, customerSearch]);

    const filteredTasks = useMemo(() => {
        if (!taskSearch) return allTasks;
        const query = taskSearch.toLowerCase();
        return allTasks.filter(task => 
            task.id.toLowerCase().includes(query) ||
            task.customer.toLowerCase().includes(query) ||
            task.service.toLowerCase().includes(query)
        );
    }, [allTasks, taskSearch]);


    const StatCard = ({ title, value, icon: Icon, description }: {title: string, value: string, icon: React.ElementType, description: string}) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );

    const TabTriggerWithBadge = ({ value, label, count }: { value: string, label: string, count: number }) => (
        <TabsTrigger value={value} className="relative">
            {label}
            {count > 0 && <Badge className="absolute -top-2 -right-2 h-5 w-5 justify-center rounded-full p-0">{count}</Badge>}
        </TabsTrigger>
    );

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabTriggerWithBadge value="vle-management" label="VLEs" count={pendingVleCount} />
                <TabTriggerWithBadge value="customer-management" label="Customers" count={0} />
                <TabTriggerWithBadge value="all-tasks" label="Tasks" count={unassignedTaskCount} />
                <TabTriggerWithBadge value="payouts" label="Payouts" count={payoutTaskCount} />
                <TabTriggerWithBadge value="complaints" label="Complaints" count={openComplaintsCount} />
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <StatCard title="Total Tasks" value={allTasks.length.toString()} icon={Briefcase} description="All tasks in the system" />
                    <StatCard title="Total VLEs" value={vlesForManagement.length.toString()} icon={Users} description="Registered VLEs" />
                    <StatCard title="Total Customers" value={customersForManagement.length.toString()} icon={Users2} description="Registered customers" />
                    <StatCard title="Open Complaints" value={complaints.filter(c => c.status === 'Open').length.toString()} icon={AlertTriangle} description="Awaiting admin response" />
                    <StatCard title="Pending Payouts" value={payoutTasks.length.toString()} icon={Wallet} description="Tasks needing payout approval" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>VLEs Pending Approval</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {pendingVles.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Location</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingVles.map(vle => (
                                            <TableRow key={vle.id}>
                                                <TableCell>{vle.name}</TableCell>
                                                <TableCell>{vle.location}</TableCell>
                                                <TableCell className="text-right">
                                                     <Button variant="outline" size="sm" onClick={() => onVleApprove(vle.id)}>
                                                        <UserPlus className="mr-2 h-4 w-4" /> Approve
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-sm text-muted-foreground">No VLEs are currently pending approval.</p>
                            )}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Tasks Pending Price Approval</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {pricingTasks.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Task ID</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Service</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pricingTasks.map(task => (
                                            <TableRow key={task.id}>
                                                <TableCell>{task.id.slice(-6).toUpperCase()}</TableCell>
                                                <TableCell>{task.customer}</TableCell>
                                                <TableCell>{task.service}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button asChild variant="outline" size="sm">
                                                        <Link href={`/dashboard/task/${task.id}`}><PenSquare className="mr-2 h-4 w-4" />Set Price</Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-sm text-muted-foreground">No tasks are currently pending pricing.</p>
                            )}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Pending Balance Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {paymentRequests.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paymentRequests.map(req => (
                                            <TableRow key={req.id}>
                                                <TableCell>{req.userName}</TableCell>
                                                <TableCell>₹{req.amount.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="outline" size="sm" onClick={() => onApproveBalanceRequest(req)} disabled={processingBalanceRequestId === req.id}>
                                                        {processingBalanceRequestId === req.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                                         Approve
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-sm text-muted-foreground">No pending balance requests.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <Card className="mt-6 border-destructive/50">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 bg-destructive/10 text-destructive p-3 rounded-full">
                               <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle>Danger Zone</CardTitle>
                                <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Reset Application Data
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete all tasks, camps, notifications, and payment requests. It will also re-seed the services list and reset all user/VLE wallets to zero.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={onResetData} className="bg-destructive hover:bg-destructive/90">Yes, Reset Everything</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <p className="text-xs text-muted-foreground mt-2">Use this to return the application to its default state for testing.</p>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="vle-management" className="mt-4">
                <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                           <CardTitle>VLE Management</CardTitle>
                           <CardDescription>Approve or manage VLE accounts and see their availability.</CardDescription>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search VLE by name or location..." 
                                className="pl-8 w-72"
                                value={vleSearch}
                                onChange={(e) => setVleSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Location</TableHead>
                             <TableHead>Balance</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Availability</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredVles.map(vle => (
                        <TableRow key={vle.id}>
                            <TableCell>{vle.name}</TableCell>
                            <TableCell>{vle.location}</TableCell>
                            <TableCell>₹{vle.walletBalance?.toFixed(2) || '0.00'}</TableCell>
                            <TableCell><Badge variant={vle.status === 'Approved' ? 'default' : 'secondary'}>{vle.status}</Badge></TableCell>
                            <TableCell>
                                {vle.status === 'Approved' ? (
                                     <Switch
                                        checked={vle.available}
                                        onCheckedChange={(checked) => onVleAvailabilityChange(vle.id, checked)}
                                        aria-label="Toggle VLE Availability"
                                     />
                                ) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {vle.status === 'Pending' && <DropdownMenuItem onClick={() => onVleApprove(vle.id)}><UserPlus className="mr-2 h-4 w-4" />Approve VLE</DropdownMenuItem>}
                                        {vle.status === 'Approved' && (
                                            <AddBalanceDialog 
                                                trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}><Wallet className="mr-2 h-4 w-4"/>Add Balance</DropdownMenuItem>}
                                                vleName={vle.name}
                                                onAddBalance={(amount) => onUpdateVleBalance(vle.id, amount)}
                                            />
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <a href={`mailto:${vle.email}`} className="flex items-center w-full"><Mail className="mr-2 h-4 w-4"/>Email VLE</a>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <a href={`tel:${vle.mobile}`} className="flex items-center w-full"><Phone className="mr-2 h-4 w-4"/>Call VLE</a>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <a href={`https://wa.me/91${vle.mobile}`} target="_blank" rel="noopener noreferrer" className="flex items-center w-full"><WhatsAppIcon className="mr-2 h-5 w-5 fill-green-600"/>WhatsApp</a>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
            </TabsContent>
            
            <TabsContent value="customer-management" className="mt-4">
                <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                           <CardTitle>Customer Management</CardTitle>
                           <CardDescription>View all registered customers in the system.</CardDescription>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by name, email, mobile or Task ID..." 
                                className="pl-8 w-80"
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Mobile</TableHead>
                            <TableHead>Location</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCustomers.map(user => (
                        <TableRow key={user.id}>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.mobile}</TableCell>
                            <TableCell>{user.location}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
            </TabsContent>

            <TabsContent value="all-tasks" className="mt-4">
                <Card>
                    <CardHeader>
                         <div className="flex items-center justify-between">
                            <div>
                               <CardTitle>All Service Requests</CardTitle>
                               <CardDescription>View and manage all tasks in the system.</CardDescription>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search by ID, customer, or service..." 
                                    className="pl-8 w-80"
                                    value={taskSearch}
                                    onChange={(e) => setTaskSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Task ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Assigned VLE</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTasks.map(task => {
                                    const availableVles = vlesForManagement.filter(vle => 
                                        vle.status === 'Approved' && 
                                        vle.available && 
                                        vle.id !== task.creatorId // Exclude the VLE who created the task
                                    );
                                    return (
                                        <TableRow key={task.id}>
                                            <TableCell className="font-medium">{task.id.slice(-6).toUpperCase()}</TableCell>
                                            <TableCell>{task.customer}</TableCell>
                                            <TableCell>{task.service}</TableCell>
                                            <TableCell>
                                                <Badge variant={task.type === 'VLE Lead' ? 'secondary' : 'outline'}>
                                                    {task.type || 'Customer Request'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell><Badge variant="outline">{task.status}</Badge></TableCell>
                                            <TableCell>{task.assignedVleName || 'N/A'}</TableCell>
                                            <TableCell>{format(new Date(task.date), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild><Link href={`/dashboard/task/${task.id}`} className="flex items-center w-full"><Eye className="mr-2 h-4 w-4"/>View Details</Link></DropdownMenuItem>
                                                        {task.status === 'Unassigned' && (
                                                            <AssignVleDialog 
                                                                trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center w-full"><GitFork className="mr-2 h-4 w-4"/>Assign VLE</DropdownMenuItem>}
                                                                taskId={task.id}
                                                                availableVles={availableVles}
                                                                onAssign={onVleAssign}
                                                            />
                                                        )}
                                                        {task.status === 'Completed' && (
                                                            <DropdownMenuItem onClick={() => onApprovePayout(task)}>
                                                                <CircleDollarSign className="mr-2 h-4 w-4" />
                                                                Approve Payout
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="payouts" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Payouts</CardTitle>
                        <CardDescription>Review and approve payouts for completed tasks.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Task ID</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Assigned VLE</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Total Paid</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payoutTasks.length > 0 ? payoutTasks.map(task => (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-medium">{task.id.slice(-6).toUpperCase()}</TableCell>
                                        <TableCell>{task.service}</TableCell>
                                        <TableCell>{task.assignedVleName}</TableCell>
                                        <TableCell>{task.customer}</TableCell>
                                        <TableCell>₹{task.totalPaid?.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => onApprovePayout(task)}>
                                                <CircleDollarSign className="mr-2 h-4 w-4" /> Approve Payout
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No tasks are currently awaiting payout.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="complaints" className="mt-4">
                <Card>
                <CardHeader>
                    <CardTitle>Customer Complaints</CardTitle>
                    <CardDescription>Review and resolve all customer complaints.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Task ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Complaint</TableHead>
                            <TableHead>Docs</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {complaints.map(c => (
                        <TableRow key={c.date}>
                            <TableCell className="font-medium">{c.taskId.slice(-6).toUpperCase()}</TableCell>
                            <TableCell>{c.customer}</TableCell>
                            <TableCell className="max-w-xs break-words">{c.text}</TableCell>
                            <TableCell>{c.documents?.length > 0 ? <FileText className="h-4 w-4" /> : 'N/A'}</TableCell>
                            <TableCell><Badge variant={c.status === 'Open' ? 'destructive' : 'default'}>{c.status}</Badge></TableCell>
                            <TableCell className="text-right">
                                {c.status === 'Open' && (
                                    <ComplaintResponseDialog
                                        trigger={<Button size="sm"><MessageCircleMore className="mr-2 h-4 w-4" />Respond</Button>}
                                        complaint={c}
                                        taskId={c.taskId}
                                        customerId={c.customerId}
                                        onResponseSubmit={onComplaintResponse}
                                    />
                                )}
                            </TableCell>
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
