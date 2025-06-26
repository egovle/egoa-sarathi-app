
'use client';

import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { File, PlusCircle, User, FilePlus, Wallet, ToggleRight, BrainCircuit, UserCheck, Star, MessageSquareWarning, Edit, Banknote, Camera, FileUp, AtSign, Trash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

// --- DEMO USERS & DATA ---
// Since there's no real authentication, we're using mock data to simulate different user roles.
// You can switch between views using the tabs on the dashboard.
//
// - Customers: Ravi Sharma, Priya Naik
// - VLEs: Suresh Kumar (Approved), Anjali Desai (Pending)
// - Admin: The "Admin View" tab shows the admin perspective.

const customerTasks = [
  { id: 'SS-84621', customer: 'Ravi Sharma', service: 'Birth Certificate', status: 'In Progress', date: '2023-10-25', complaint: { id: 'C-001', text: 'The VLE has not contacted me yet after 3 days.' }, feedback: null },
  { id: 'SS-93715', customer: 'Priya Naik', service: 'Property Tax Payment', status: 'Completed', date: '2023-10-20', complaint: null, feedback: { id: 'F-001', rating: 5, comment: 'Very fast and efficient service.' } },
  { id: 'SS-28374', customer: 'Priya Naik', service: 'Passport Renewal', status: 'Completed', date: '2023-09-15', complaint: null, feedback: { id: 'F-002', rating: 4, comment: 'Good service.' } },
];

const vleTasks = [
  { id: 'SS-38192', service: 'Aadhar Card Update', status: 'Assigned', customer: 'Riya Sharma', date: '2023-10-26', complaint: null, feedback: null },
  { id: 'SS-49271', service: 'Driving License', status: 'Pending Docs', customer: 'Amit Patel', date: '2023-10-24', complaint: null, feedback: null },
  { id: 'SS-83472', service: 'Passport Application', status: 'Unassigned', customer: 'Neha Singh', date: '2023-10-27', complaint: null, feedback: null },
];

const allTasks = [
  ...customerTasks.map(t => ({...t, type: 'Customer Request'})),
  ...vleTasks.map(t => ({...t, type: 'VLE Lead'}))
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


const vles = [
    { id: 'VLE7362', name: 'Suresh Kumar', location: 'Panjim, Goa', status: 'Approved'},
    { id: 'VLE9451', name: 'Anjali Desai', location: 'Margao, Goa', status: 'Pending'},
]

const allComplaints = allTasks.filter(t => t.complaint).map(t => ({ taskId: t.id, customer: t.customer, ...t.complaint, date: t.date }));
const allFeedback = allTasks.filter(t => t.feedback).map(t => ({ taskId: t.id, customer: t.customer, ...t.feedback, date: t.date }));


// --- HELPER COMPONENTS ---

const StarRating = ({ rating, setRating, readOnly = false }: { rating: number; setRating?: (rating: number) => void; readOnly?: boolean }) => {
    const fullStars = Math.floor(rating);
    return (
        <div className={cn("flex items-center gap-1", readOnly && "justify-center")}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={`h-6 w-6 ${!readOnly ? 'cursor-pointer' : ''} ${fullStars >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
                    onClick={() => !readOnly && setRating && setRating(star)}
                />
            ))}
        </div>
    );
};

const ComplaintDialog = ({ trigger }: { trigger: React.ReactNode }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast({ title: 'Complaint Submitted', description: 'Your complaint has been registered. We will look into it shortly.' });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
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
    const [open, setOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast({ title: 'Feedback Submitted', description: 'Thank you for your valuable feedback!' });
        setOpen(false);
    };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            setRating(0);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
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


const CameraUploadDialog = ({ open, onOpenChange, onCapture }: { open: boolean, onOpenChange: (open: boolean) => void, onCapture: (file: File) => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        let stream: MediaStream | null = null;
        const getCameraPermission = async () => {
            if (!open) return;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                setHasCameraPermission(true);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error('Error accessing camera:', error);
                setHasCameraPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Camera Access Denied',
                    description: 'Please enable camera permissions in your browser settings.',
                });
            }
        };

        getCameraPermission();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (videoRef.current) {
              videoRef.current.srcObject = null;
            }
        };
    }, [open, toast]);

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const fileName = `capture-${Date.now()}.jpg`;
                    const file = new File([blob], fileName, { type: 'image/jpeg' });
                    onCapture(file);
                    onOpenChange(false);
                }
            }, 'image/jpeg');
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Capture Document</DialogTitle>
                    <DialogDescription>Position your document in the frame and click capture.</DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    {hasCameraPermission === false && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                           <Alert variant="destructive" className="w-auto">
                              <AlertTitle>Camera Access Required</AlertTitle>
                              <AlertDescription>
                                Please allow camera access to use this feature.
                              </AlertDescription>
                          </Alert>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleCapture} disabled={!hasCameraPermission}>
                        <Camera className="mr-2 h-4 w-4" /> Capture
                    </Button>
                </DialogFooter>
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
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if(selectedFiles.length === 0) {
        toast({
            title: 'Document Required',
            description: 'Please upload at least one document.',
            variant: 'destructive'
        });
        return;
    }
    const newTaskId = `SS-${Date.now().toString().slice(-6)}`;
    setTaskId(newTaskId);
    toast({
      title: 'Task Created!',
      description: `Your new task ID is ${newTaskId}.`,
    });
    // Do not close dialog here, show the Task ID instead.
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
    }
  };

  const handleCameraCapture = (file: File) => {
      setSelectedFiles(prevFiles => [...prevFiles, file]);
  };

  const handleOpenChange = (isOpen: boolean) => {
      setDialogOpen(isOpen);
      if (!isOpen) {
          setTaskId('');
          setService('');
          setOtherService('');
          setSelectedFiles([]);
      }
  }

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
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
                <Label className="text-right pt-2">
                  Documents
                </Label>
                <div className="col-span-3 grid gap-2">
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => fileInputRef.current?.click()}>
                        <FileUp className="mr-2 h-4 w-4"/> Choose Files
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsCameraOpen(true)}>
                        <Camera className="mr-2 h-4 w-4" /> Use Camera
                    </Button>
                  </div>
                  <Input id="documents" type="file" multiple onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                  {selectedFiles.length > 0 && (
                      <div className="text-xs text-muted-foreground space-y-1 mt-2">
                          <p className='font-medium'>Selected files:</p>
                          {selectedFiles.map((file, i) => <p key={i}>{file.name}</p>)}
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
              <Button type="submit" disabled={!!taskId}>Create Task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <CameraUploadDialog open={isCameraOpen} onOpenChange={setIsCameraOpen} onCapture={handleCameraCapture} />
    </>
  );
};


const ProfileView = ({ userType }: {userType: 'Customer' | 'VLE'}) => {
    const { toast } = useToast();

    type BankAccount = {
        id: string;
        bankName: string;
        accountNumber: string;
        ifscCode: string;
        upiId: string;
    };
    
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState<string | null>(null);

    const [formState, setFormState] = useState<BankAccount>({
        id: '', bankName: '', accountNumber: '', ifscCode: '', upiId: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormState(prevState => ({ ...prevState, [id]: value }));
    };

    const handleAddClick = () => {
        setEditingAccount(null);
        setFormState({ id: '', bankName: '', accountNumber: '', ifscCode: '', upiId: '' });
        setIsEditing(true);
    };

    const handleEditClick = (account: BankAccount) => {
        setEditingAccount(account);
        setFormState(account);
        setIsEditing(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingAccount) {
            setBankAccounts(accounts => accounts.map(acc => acc.id === editingAccount.id ? formState : acc));
            toast({ title: "Bank Details Updated", description: "Your bank account has been updated."});
        } else {
            const newAccount = { ...formState, id: Date.now().toString() };
            setBankAccounts(accounts => [...accounts, newAccount]);
            toast({ title: "Bank Account Added", description: "Your new bank account has been added."});
        }
        setIsEditing(false);
        setEditingAccount(null);
    };

    const handleDeleteClick = (accountId: string) => {
        setAccountToDelete(accountId);
        setIsDeleteDialogOpen(true);
    }
    
    const confirmDelete = () => {
        if (accountToDelete) {
            setBankAccounts(accounts => accounts.filter(acc => acc.id !== accountToDelete));
            toast({ title: "Bank Account Removed", description: "The bank account has been removed."});
        }
        setIsDeleteDialogOpen(false);
        setAccountToDelete(null);
    }

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditingAccount(null);
    }
    
    return (
    <div className="space-y-4">
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this bank account from your profile.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

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
                    <CardTitle>Bank Details</CardTitle>
                    <CardDescription>Securely manage your bank accounts for transactions.</CardDescription>
                </CardHeader>
                {isEditing ? (
                     <form onSubmit={handleSave}>
                        <CardContent className="space-y-4">
                             <DialogTitle>{editingAccount ? 'Edit' : 'Add'} Bank Account</DialogTitle>
                            <div className="space-y-2 pt-2">
                                <Label htmlFor="bankName">Bank Name</Label>
                                <Input id="bankName" placeholder="e.g., State Bank of India" value={formState.bankName} onChange={handleInputChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="accountNumber">Account Number</Label>
                                <Input id="accountNumber" placeholder="Enter your account number" value={formState.accountNumber} onChange={handleInputChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ifscCode">IFSC Code</Label>
                                <Input id="ifscCode" placeholder="Enter IFSC Code" value={formState.ifscCode} onChange={handleInputChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="upiId">UPI ID (Optional)</Label>
                                <div className="relative">
                                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input id="upiId" placeholder="your-name@okbank" className="pl-10" value={formState.upiId} onChange={handleInputChange} />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end gap-2">
                            <Button type="button" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                            <Button type="submit">Save Changes</Button>
                        </CardFooter>
                     </form>
                 ) : (
                     <>
                        <CardContent className="space-y-4">
                            {bankAccounts.length > 0 ? (
                                <div className="space-y-4">
                                {bankAccounts.map((account) => (
                                    <div key={account.id} className="p-4 border rounded-lg relative bg-muted/20">
                                         <div className="absolute top-2 right-2 flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(account)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(account.id)}><Trash className="h-4 w-4" /></Button>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <p className="font-semibold">{account.bankName}</p>
                                            <p className="text-muted-foreground">A/C: {account.accountNumber}</p>
                                            <p className="text-muted-foreground">IFSC: {account.ifscCode}</p>
                                            {account.upiId && <p className="text-muted-foreground">UPI: {account.upiId}</p>}
                                        </div>
                                    </div>
                                ))}
                                </div>
                             ) : (
                                <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg bg-muted/50">
                                    <Banknote className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="mb-4 text-muted-foreground">No bank account added yet.</p>
                                </div>
                             )}
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleAddClick} variant={bankAccounts.length > 0 ? 'default' : 'default'}>
                               <PlusCircle className="mr-2 h-4 w-4"/> {bankAccounts.length > 0 ? 'Add Another Account' : 'Add Bank Account'}
                            </Button>
                        </CardFooter>
                     </>
                 )}
            </Card>
        </div>
    </div>
)};


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
    <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="vle-management">VLE Management</TabsTrigger>
            <TabsTrigger value="all-tasks">All Tasks</TabsTrigger>
            <TabsTrigger value="complaints">Complaints</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
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
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open Complaints</CardTitle>
                        <MessageSquareWarning className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{allComplaints.length}</div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="vle-management" className="mt-4">
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
        </TabsContent>

        <TabsContent value="all-tasks" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>All Service Requests</CardTitle>
                    <CardDescription>View and manage all tasks in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Task ID</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Service</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allTasks.map(task => (
                                <TableRow key={task.id}>
                                    <TableCell className="font-medium">{task.id}</TableCell>
                                    <TableCell>{task.customer}</TableCell>
                                    <TableCell>{task.service}</TableCell>
                                    <TableCell><Badge variant="outline">{task.status}</Badge></TableCell>
                                    <TableCell>{task.date}</TableCell>
                                    <TableCell>
                                        {task.status === 'Unassigned' && <Button variant="outline" size="sm">Assign</Button>}
                                    </TableCell>
                                </TableRow>
                            ))}
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
                          <TableHead>Date</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {allComplaints.map(complaint => (
                      <TableRow key={complaint.id}>
                          <TableCell className="font-medium">{complaint.taskId}</TableCell>
                          <TableCell>{complaint.customer}</TableCell>
                          <TableCell>{complaint.text}</TableCell>
                          <TableCell>{complaint.date}</TableCell>
                      </TableRow>
                      ))}
                  </TableBody>
                  </Table>
              </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="mt-4">
             <Card>
              <CardHeader>
                  <CardTitle>Customer Feedback</CardTitle>
                  <CardDescription>Review customer feedback for completed tasks.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Task ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead className="text-center">Rating</TableHead>
                          <TableHead>Comment</TableHead>
                          <TableHead>Date</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {allFeedback.map(fb => (
                      <TableRow key={fb.id}>
                          <TableCell className="font-medium">{fb.taskId}</TableCell>
                          <TableCell>{fb.customer}</TableCell>
                          <TableCell><StarRating rating={fb.rating} readOnly={true} /></TableCell>
                          <TableCell>{fb.comment}</TableCell>
                          <TableCell>{fb.date}</TableCell>
                      </TableRow>
                      ))}
                  </TableBody>
                  </Table>
              </CardContent>
          </Card>
        </TabsContent>

    </Tabs>
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
