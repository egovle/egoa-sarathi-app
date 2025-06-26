
'use client';

import { useState } from 'react';
import { File, MoreHorizontal, PlusCircle, User, FilePlus, Wallet, ToggleRight, BrainCircuit, UserCheck, Star, MessageSquareWarning, UserCircle, Edit, Banknote } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- DEMO USERS & DATA ---
// Since there's no real authentication, we're using mock data to simulate different user roles.
// You can switch between views using the tabs on the dashboard.
//
// - Customers: Ravi Sharma, Priya Naik
// - VLEs: Suresh Kumar (Approved), Anjali Desai (Pending)
// - Admin: The "Admin View" tab shows the admin perspective.

const customerTasks = [
  { id: 'SS-84621', customer: 'Ravi Sharma', service: 'Birth Certificate', status: 'In Progress', date: '2023-10-25', complaint: null, feedback: null },
  { id: 'SS-93715', customer: 'Priya Naik', service: 'Property Tax Payment', status: 'Completed', date: '2023-10-20', complaint: null, feedback: null },
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

// --- HELPER COMPONENTS ---

const StarRating = ({ rating, setRating, readOnly = false }: { rating: number; setRating?: (rating: number) => void; readOnly?: boolean }) => {
    const fullStars = Math.floor(rating);
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={`h-6 w-6 ${!readOnly && 'cursor-pointer'} ${fullStars >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
                    onClick={() => !readOnly && setRating && setRating(star)}
                />
            ))}
        </div>
    );
};

const ComplaintDialog = ({ trigger }: { trigger: React.ReactNode }) => {
    const { toast } = useToast();
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast({ title: 'Complaint Submitted', description: 'Your complaint has been registered. We will look into it shortly.' });
    };

    return (
        <Dialog>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Raise a Complaint</DialogTitle>
                        <DialogDescription>Describe the issue you are facing with this service request.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="complaint" className="sr-only">Complaint Details</Label>
                        <Textarea id="complaint" placeholder="Please provide details about your issue..." rows={5} required />
                    </div>
                    <DialogFooter>
                        <Button type="submit">Submit Complaint</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const FeedbackDialog = ({ trigger }: { trigger: React.ReactNode }) => {
    const { toast } = useToast();
    const [rating, setRating] = useState(0);
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast({ title: 'Feedback Submitted', description: 'Thank you for your valuable feedback!' });
    };
    return (
        <Dialog onOpenChange={() => setRating(0)}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Provide Feedback</DialogTitle>
                        <DialogDescription>Rate your experience with this service request.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex justify-center">
                           <StarRating rating={rating} setRating={setRating} />
                        </div>
                        <Textarea id="feedback" placeholder="Any additional comments? (Optional)" rows={3} />
                    </div>
                    <DialogFooter>
                        <Button type="submit">Submit Feedback</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const TaskCreatorDialog = ({ buttonTrigger }: { buttonTrigger: React.ReactNode }) => {
  const { toast } = useToast();
  const [taskId, setTaskId] = useState('');
  const [service, setService] = useState('');
  const [otherService, setOtherService] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const newTaskId = `SS-${Date.now().toString().slice(-6)}`;
    setTaskId(newTaskId);
    toast({
      title: 'Task Created!',
      description: `Your new task ID is ${newTaskId}.`,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
      if (!isOpen) {
          setTaskId('');
          setService('');
          setOtherService('');
          setSelectedFiles([]);
      }
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{buttonTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleCreateTask}>
          <DialogHeader>
            <DialogTitle>Create a new Service Request</DialogTitle>
            <DialogDescription>
              Fill in the details for your new service request. Document upload is mandatory.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" defaultValue="Ravi Sharma" className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">Address</Label>
              <Input id="address" defaultValue="Panjim, Goa" className="col-span-3" required />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mobile" className="text-right">Mobile</Label>
              <Input id="mobile" defaultValue="9876543210" className="col-span-3" required />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" type="email" defaultValue="ravi.sharma@example.com" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Service</Label>
                <div className="col-span-3">
                    <Select onValueChange={setService} value={service}>
                        <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="New PAN">New PAN</SelectItem>
                            <SelectItem value="Correction of PAN">Correction of PAN</SelectItem>
                            <SelectItem value="Non-individual PAN card">Non-individual PAN card</SelectItem>
                            <SelectItem value="Passport">Passport</SelectItem>
                            <SelectItem value="Driving License">Driving License</SelectItem>
                            <SelectItem value="Residence Certificate">Residence Certificate</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            {service === 'Other' && (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="other-service" className="text-right">Other Service</Label>
                    <Input id="other-service" value={otherService} onChange={e => setOtherService(e.target.value)} placeholder="Please specify" className="col-span-3" required/>
                </div>
            )}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="documents" className="text-right pt-2">
                Documents
              </Label>
              <div className="col-span-3 grid gap-2">
                <Input id="documents" type="file" multiple required onChange={handleFileChange} />
                {selectedFiles.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1">
                        {selectedFiles.map(file => <p key={file.name}>{file.name}</p>)}
                    </div>
                )}
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


const ProfileView = ({ userType }: {userType: 'Customer' | 'VLE'}) => (
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
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Profile Details</span>
                        <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="profile-name">Full Name</Label>
                        <Input id="profile-name" defaultValue={userType === 'Customer' ? 'Ravi Sharma' : 'Suresh Kumar'} readOnly />
                     </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-email">Email Address</Label>
                        <Input id="profile-email" type="email" defaultValue={userType === 'Customer' ? 'ravi.sharma@example.com' : 'suresh.k@example.com'} readOnly />
                     </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-mobile">Mobile Number</Label>
                        <Input id="profile-mobile" defaultValue={userType === 'Customer' ? "9876543210" : "9988776655"} readOnly />
                     </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Bank Details</span>
                        <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                    </CardTitle>
                    <CardDescription>Securely add your bank account for transactions.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="bank-name">Bank Name</Label>
                        <Input id="bank-name" placeholder="e.g., State Bank of India" />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="account-number">Account Number</Label>
                        <Input id="account-number" placeholder="Enter your account number" />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="ifsc-code">IFSC Code</Label>
                        <Input id="ifsc-code" placeholder="Enter IFSC Code" />
                     </div>
                </CardContent>
                 <CardFooter>
                    <Button>Save Bank Details</Button>
                </CardFooter>
            </Card>
        </div>
    </div>
);


const CustomerDashboard = () => (
  <TabsContent value="customer">
    <Tabs defaultValue="requests">
        <TabsList>
            <TabsTrigger value="requests">My Service Requests</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>
        <TabsContent value="requests" className="mt-4">
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
                        <TableHead>Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {customerTasks.map(task => (
                        <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.id}</TableCell>
                        <TableCell>{task.service}</TableCell>
                        <TableCell><Badge variant="outline">{task.status}</Badge></TableCell>
                        <TableCell>{task.date}</TableCell>
                        <TableCell>
                            <div className="flex gap-2">
                            {task.status === 'In Progress' && (
                                 <ComplaintDialog trigger={<Button variant="outline" size="sm">Raise Complaint</Button>} />
                            )}
                            {task.status === 'Completed' && (
                                <FeedbackDialog trigger={<Button variant="outline" size="sm">Give Feedback</Button>} />
                            )}
                            </div>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="profile" className="mt-4">
            <ProfileView userType="Customer" />
        </TabsContent>
    </Tabs>
  </TabsContent>
);

const VLEDashboard = () => (
    <TabsContent value="vle">
         <Tabs defaultValue="tasks">
            <TabsList>
                <TabsTrigger value="tasks">Assigned Tasks</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks" className="mt-4">
                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <TabsContent value="profile" className="mt-4">
                <ProfileView userType="VLE" />
            </TabsContent>
        </Tabs>
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
