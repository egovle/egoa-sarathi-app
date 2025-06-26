'use client';

import { useState } from 'react';
import { File, MoreHorizontal, PlusCircle, User, FilePlus, Wallet, ToggleRight, BrainCircuit, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';

// --- DEMO USERS & DATA ---
// Since there's no real authentication, we're using mock data to simulate different user roles.
// You can switch between views using the tabs on the dashboard.
//
// - Customers: Ravi Sharma, Priya Naik
// - VLEs: Suresh Kumar (Approved), Anjali Desai (Pending)
// - Admin: The "Admin View" tab shows the admin perspective.

const customerTasks = [
  { id: 'SS-84621', customer: 'Ravi Sharma', service: 'Birth Certificate', status: 'In Progress', date: '2023-10-25' },
  { id: 'SS-93715', customer: 'Priya Naik', service: 'Property Tax Payment', status: 'Completed', date: '2023-10-20' },
];

const vleTasks = [
  { id: 'SS-38192', service: 'Aadhar Card Update', status: 'Assigned', customer: 'Riya Sharma', date: '2023-10-26' },
  { id: 'SS-49271', service: 'Driving License', status: 'Pending Docs', customer: 'Amit Patel', date: '2023-10-24' },
];

const allTasks = [
  ...customerTasks.map(t => ({...t, type: 'Customer Request'})),
  ...vleTasks.map(t => ({...t, type: 'VLE Lead'}))
]

const vles = [
    { id: 'VLE7362', name: 'Suresh Kumar', location: 'Panjim, Goa', status: 'Approved'},
    { id: 'VLE9451', name: 'Anjali Desai', location: 'Margao, Goa', status: 'Pending'},
]

// Components
const TaskCreatorDialog = ({ buttonTrigger }: { buttonTrigger: React.ReactNode }) => {
  const { toast } = useToast();
  const [taskId, setTaskId] = useState('');

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const newTaskId = `SS-${Date.now().toString().slice(-6)}`;
    setTaskId(newTaskId);
    toast({
      title: 'Task Created!',
      description: `Your new task ID is ${newTaskId}. Please upload the required documents.`,
    });
  };

  return (
    <Dialog onOpenChange={() => setTaskId('')}>
      <DialogTrigger asChild>{buttonTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleCreateTask}>
          <DialogHeader>
            <DialogTitle>Create a new Service Request</DialogTitle>
            <DialogDescription>
              Fill in the details for your new service request. Document upload is mandatory.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="service-name" className="text-right">
                Service
              </Label>
              <Input id="service-name" placeholder="e.g., Birth Certificate" className="col-span-3" required/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea id="description" placeholder="Provide a brief description" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="documents" className="text-right">
                Documents
              </Label>
              <div className="col-span-3">
                <Input id="documents" type="file" multiple required />
              </div>
            </div>
            {taskId && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Task ID</Label>
                <div className="col-span-3 font-mono text-sm bg-muted p-2 rounded-md">{taskId}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit">Create Task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const CustomerDashboard = () => (
  <TabsContent value="customer">
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹1000</div>
            <p className="text-xs text-muted-foreground">Preloaded for demo</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
                <CardTitle>My Service Requests</CardTitle>
                <CardDescription>
                Track your ongoing and completed service requests.
                </CardDescription>
            </div>
            <div className="ml-auto flex items-center gap-2">
                <TaskCreatorDialog buttonTrigger={<Button size="sm" className="h-8 gap-1"><PlusCircle className="h-3.5 w-3.5" />New Request</Button>} />
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task ID</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerTasks.map(task => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.id}</TableCell>
                  <TableCell>{task.service}</TableCell>
                  <TableCell><Badge variant="outline">{task.status}</Badge></TableCell>
                  <TableCell>{task.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  </TabsContent>
);

const VLEDashboard = () => (
    <TabsContent value="vle">
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">₹1000</div>
                <p className="text-xs text-muted-foreground">Preloaded for demo</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Availability</CardTitle>
                <ToggleRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2 pt-2">
                        <Switch id="availability-mode" defaultChecked />
                        <Label htmlFor="availability-mode">Available for Tasks</Label>
                    </div>
                </CardContent>
            </Card>
            </div>
            
            <Card>
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                        <CardTitle>Assigned Tasks</CardTitle>
                        <CardDescription>Tasks assigned to you for fulfillment.</CardDescription>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <TaskCreatorDialog buttonTrigger={<Button size="sm" className="h-8 gap-1"><FilePlus className="h-3.5 w-3.5" />Generate Lead</Button>} />
                        <Button asChild variant="outline" size="sm" className="h-8 gap-1"><Link href="/dashboard/extract"><BrainCircuit className="h-3.5 w-3.5" />Special Request</Link></Button>
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
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {vleTasks.map(task => (
                        <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.id}</TableCell>
                            <TableCell>{task.service}</TableCell>
                            <TableCell><Badge variant="outline">{task.status}</Badge></TableCell>
                            <TableCell>{task.customer}</TableCell>
                            <TableCell>{task.date}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </TabsContent>
);

const AdminDashboard = () => (
  <TabsContent value="admin">
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <File className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{allTasks.length}</div>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">VLEs Pending Approval</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{vles.filter(v => v.status === 'Pending').length}</div>
              </CardContent>
          </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
          <Card>
              <CardHeader>
                  <CardTitle>VLE Management</CardTitle>
                  <CardDescription>Approve or manage VLE accounts.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>VLE ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Action</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {vles.map(vle => (
                      <TableRow key={vle.id}>
                          <TableCell className="font-medium">{vle.id}</TableCell>
                          <TableCell>{vle.name}</TableCell>
                          <TableCell><Badge variant={vle.status === 'Approved' ? 'default' : 'secondary'}>{vle.status}</Badge></TableCell>
                          <TableCell>
                              {vle.status === 'Pending' && <Button variant="outline" size="sm">Approve</Button>}
                          </TableCell>
                      </TableRow>
                      ))}
                  </TableBody>
                  </Table>
              </CardContent>
          </Card>
          <Card>
              <CardHeader>
                  <CardTitle>Task Assignment</CardTitle>
                  <CardDescription>Assign unassigned tasks to available VLEs.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Task ID</TableHead>
                              <TableHead>Service</TableHead>
                              <TableHead>Action</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          <TableRow>
                              <TableCell>SS-83472</TableCell>
                              <TableCell>Passport Application</TableCell>
                              <TableCell><Button variant="outline" size="sm">Assign</Button></TableCell>
                          </TableRow>
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>
      </div>
    </div>
  </TabsContent>
);

export default function DashboardPage() {
  return (
      <Tabs defaultValue="customer">
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="customer">Customer View</TabsTrigger>
            <TabsTrigger value="vle">VLE View</TabsTrigger>
            <TabsTrigger value="admin">Admin View</TabsTrigger>
          </TabsList>
        </div>
        <div className="mt-4">
            <CustomerDashboard />
            <VLEDashboard />
            <AdminDashboard />
        </div>
      </Tabs>
  );
}
