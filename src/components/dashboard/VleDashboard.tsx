
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { FilePlus, Search, ToggleRight, CheckCircle2, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TaskCreatorDialog } from './shared';

export default function VleDashboard({ assignedTasks, myLeads, userId, userProfile, services, onTaskCreated, onVleAvailabilityChange, onTaskAccept, onTaskReject }: { assignedTasks: any[], myLeads: any[], userId: string, userProfile: any, services: any[], onTaskCreated: (task: any, service: any, filesToUpload: File[]) => Promise<void>, onVleAvailabilityChange: (vleId: string, available: boolean) => void, onTaskAccept: (taskId: string) => void, onTaskReject: (taskId: string) => void }) {
    const [searchQuery, setSearchQuery] = useState('');

    const invitations = useMemo(() => assignedTasks.filter(t => t.status === 'Pending VLE Acceptance'), [assignedTasks]);
    const activeTasks = useMemo(() => assignedTasks.filter(t => t.status !== 'Pending VLE Acceptance'), [assignedTasks]);
    
    const filteredLeads = useMemo(() => {
        if (!searchQuery) return myLeads;
        return myLeads.filter(task => 
            task.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.customer.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [myLeads, searchQuery]);

    const getCommissionDetails = (task: any) => {
        const governmentFee = task.governmentFeeApplicable || 0;
        const serviceProfit = (task.totalPaid || 0) - governmentFee;
        const vleCommission = serviceProfit * 0.8;
        return { governmentFee, vleCommission };
    };

    return (
    <Tabs defaultValue="invitations" className="w-full">
        <div className="flex items-center">
            <TabsList>
                <TabsTrigger value="invitations">Invitations <Badge className="ml-2">{invitations.length}</Badge></TabsTrigger>
                <TabsTrigger value="active">Active Tasks</TabsTrigger>
                <TabsTrigger value="leads">My Generated Leads</TabsTrigger>
            </TabsList>
            <div className="ml-auto flex items-center gap-2">
                <TaskCreatorDialog services={services} type="VLE Lead" onTaskCreated={onTaskCreated} creatorId={userId} creatorProfile={userProfile} buttonTrigger={<Button size="sm" className="h-8 gap-1"><FilePlus className="h-3.5 w-3.5" />Generate Lead</Button>} />
            </div>
        </div>
        <TabsContent value="invitations" className="mt-4">
             <Card>
                <CardHeader>
                    <CardTitle>New Task Invitations</CardTitle>
                    <CardDescription>Please review and respond to these new task assignments.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Table>
                       <TableHeader>
                           <TableRow>
                               <TableHead>Service</TableHead>
                               <TableHead>Customer</TableHead>
                               <TableHead>Your Earnings</TableHead>
                               <TableHead className="text-right">Actions</TableHead>
                           </TableRow>
                       </TableHeader>
                       <TableBody>
                           {invitations.length > 0 ? invitations.map(task => {
                               const { governmentFee, vleCommission } = getCommissionDetails(task);
                               return (
                                   <TableRow key={task.id}>
                                       <TableCell className="font-medium">{task.service}</TableCell>
                                       <TableCell>{task.customer}</TableCell>
                                       <TableCell>
                                           <div className='text-sm'>
                                               <p>Commission: <span className='font-semibold'>₹{vleCommission.toFixed(2)}</span></p>
                                               <p className='text-xs text-muted-foreground'>+ ₹{governmentFee.toFixed(2)} for Govt. Fee</p>
                                           </div>
                                       </TableCell>
                                       <TableCell className="text-right space-x-2">
                                           <Button size="sm" variant="outline" onClick={() => onTaskAccept(task.id)}><CheckCircle2 className="mr-2 h-4 w-4"/>Accept</Button>
                                           <Button size="sm" variant="destructive" onClick={() => onTaskReject(task.id)}><XCircle className="mr-2 h-4 w-4"/>Reject</Button>
                                       </TableCell>
                                   </TableRow>
                               )
                           }) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No pending task invitations.</TableCell></TableRow>}
                       </TableBody>
                   </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="active" className="mt-4">
            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">Availability</CardTitle>
                        <ToggleRight className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="pt-2">
                        {userProfile && userProfile.status === 'Approved' ? (
                            <div className="flex items-center space-x-2 pt-2">
                                <Switch 
                                    id="availability-mode" 
                                    checked={userProfile.available} 
                                    onCheckedChange={(checked) => onVleAvailabilityChange(userId, checked)}
                                />
                                <Label htmlFor="availability-mode">{userProfile.available ? 'Available' : 'Unavailable'} for Tasks</Label>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground pt-2">Your account is pending approval.</p>
                        )}
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Your Active Tasks</CardTitle>
                        <CardDescription>Tasks you have accepted and are currently working on.</CardDescription>
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
                            {activeTasks.length > 0 ? activeTasks.map(task => (
                            <TableRow key={task.id}>
                                <TableCell className="font-medium">{task.id.slice(-6).toUpperCase()}</TableCell>
                                <TableCell>{task.service}</TableCell>
                                <TableCell><Badge variant="outline">{task.status}</Badge></TableCell>
                                <TableCell>{task.customer}</TableCell>
                                <TableCell>{format(new Date(task.date), 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="outline" size="sm"><Link href={`/dashboard/task/${task.id}`}>View Details</Link></Button>
                                </TableCell>
                            </TableRow>
                            )) : <TableRow><TableCell colSpan={6} className="h-24 text-center">No active tasks.</TableCell></TableRow>}
                        </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
        <TabsContent value="leads" className="mt-4">
             <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                               <CardTitle>My Generated Leads</CardTitle>
                               <CardDescription>Track the status of tasks you created for customers.</CardDescription>
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
                            {filteredLeads.length > 0 ? filteredLeads.map(task => (
                            <TableRow key={task.id}>
                                <TableCell className="font-medium">{task.id.slice(-6).toUpperCase()}</TableCell>
                                <TableCell>{task.service}</TableCell>
                                <TableCell><Badge variant="outline">{task.status}</Badge></TableCell>
                                <TableCell>{task.customer}</TableCell>
                                <TableCell>{format(new Date(task.date), 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="outline" size="sm"><Link href={`/dashboard/task/${task.id}`}>View Details</Link></Button>
                                </TableCell>
                            </TableRow>
                            )) : <TableRow><TableCell colSpan={6} className="h-24 text-center">You have not generated any leads.</TableCell></TableRow>}
                        </TableBody>
                        </Table>
                    </CardContent>
                </Card>
        </TabsContent>
    </Tabs>
)};
