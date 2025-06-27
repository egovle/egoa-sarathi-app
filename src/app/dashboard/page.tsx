
'use client';

import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, query, orderBy, getDoc, setDoc, where, getDocs, arrayUnion, runTransaction } from 'firebase/firestore';
import { File, PlusCircle, User, FilePlus, Wallet, ToggleRight, BrainCircuit, UserCheck, Star, MessageSquareWarning, Edit, Banknote, Camera, FileUp, AtSign, Trash, Send, FileText, CheckCircle2, Loader2, Users, MoreHorizontal, Eye, GitFork, UserPlus, ShieldAlert, StarIcon, MessageCircleMore, PenSquare, Briefcase, Users2, AlertTriangle, Mail, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


// --- NOTIFICATION HELPERS ---
async function createNotification(userId: string, title: string, description: string, link?: string) {
    if (!userId) return;
    await addDoc(collection(db, "notifications"), {
        userId,
        title,
        description,
        link: link || '/dashboard',
        read: false,
        date: new Date().toISOString(),
    });
}

async function createNotificationForAdmins(title: string, description: string, link?: string) {
    try {
        const adminsQuery = query(collection(db, "vles"), where("isAdmin", "==", true));
        const adminSnapshot = await getDocs(adminsQuery);
        
        if (adminSnapshot.empty) {
            console.log("No admin users found to notify.");
            return;
        }

        const notificationPromises = adminSnapshot.docs.map(adminDoc => {
            return createNotification(adminDoc.id, title, description, link);
        });

        await Promise.all(notificationPromises);
    } catch (error) {
        console.error("Error creating notifications for admins:", error);
    }
}


// --- HELPER COMPONENTS ---

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.296-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
);


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

const ComplaintResponseDialog = ({ trigger, complaint, taskId, customerId, onResponseSubmit }: { trigger: React.ReactNode, complaint: any, taskId: string, customerId: string, onResponseSubmit: (taskId: string, customerId: string, response: any) => void }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [responseText, setResponseText] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const response = {
            text: responseText,
            documents: selectedFiles.map(f => ({ name: f.name, url: '' })), // Placeholder for storage URL
            date: new Date().toISOString(),
        };
        onResponseSubmit(taskId, customerId, response);
        toast({ title: 'Response Sent', description: 'The customer has been notified.' });
        setOpen(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
        }
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setResponseText('');
            setSelectedFiles([]);
        }
        setOpen(isOpen);
    }
    
    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Respond to Complaint</DialogTitle>
                        <DialogDescription>
                            Provide a response to the customer's complaint for Task ID: {taskId.slice(-6).toUpperCase()}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 grid gap-4">
                        <div className="mt-2 text-sm bg-muted/80 p-3 rounded-md"><b>Customer's complaint:</b> "{complaint.text}"</div>
                        <Textarea id="response" value={responseText} onChange={(e) => setResponseText(e.target.value)} placeholder="Type your response here..." rows={4} required />
                        <div>
                             <Label>Attach Documents (Optional)</Label>
                             <div className="flex items-center gap-2 mt-2">
                                <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                    <FileUp className="mr-2 h-4 w-4"/> Choose Files
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
                    <DialogFooter>
                        <Button type="submit"><Send className="mr-2 h-4 w-4" /> Send Response</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};


const ComplaintDialog = ({ trigger, taskId, onComplaintSubmit }: { trigger: React.ReactNode, taskId: string, onComplaintSubmit: (taskId: string, complaint: any) => void }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [complaintText, setComplaintText] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newComplaint = {
            text: complaintText,
            status: 'Open',
            response: null,
            documents: selectedFiles.map(f => ({ name: f.name, url: '' })), // Placeholder for storage URL
            date: new Date().toISOString(),
        };
        onComplaintSubmit(taskId, newComplaint);
        toast({ title: 'Complaint Submitted', description: 'Your complaint has been registered. We will look into it shortly.' });
        setOpen(false);
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
        if (!isOpen) {
            setComplaintText('');
            setSelectedFiles([]);
            setIsCameraOpen(false);
        }
        setOpen(isOpen);
    }

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>{trigger}</DialogTrigger>
                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Raise a Complaint</DialogTitle>
                            <DialogDescription>Describe the issue you are facing and attach relevant documents if any.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 grid gap-4">
                            <Textarea id="complaint" value={complaintText} onChange={e => setComplaintText(e.target.value)} placeholder="Please provide details about your issue..." rows={4} required />
                             <div>
                                <Label>Attach Documents</Label>
                                <div className="flex gap-2 mt-2">
                                    <Button type="button" onClick={() => fileInputRef.current?.click()} size="sm" variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30">
                                        <FileUp className="mr-2 h-4 w-4"/> Choose Files
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => setIsCameraOpen(true)} size="sm">
                                        <Camera className="mr-2 h-4 w-4" /> Use Camera
                                    </Button>
                                </div>
                                <Input id="documents" type="file" multiple onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                                {selectedFiles.length > 0 && (
                                    <div className="text-xs text-muted-foreground space-y-1 mt-2">
                                        <p className='font-medium'>Selected files:</p>
                                        {selectedFiles.map((file, i) => <div key={i} className="flex items-center gap-2"><FileText className="h-3 w-3" /><span>{file.name}</span></div>)}
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Submit Complaint</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <CameraUploadDialog open={isCameraOpen} onOpenChange={setIsCameraOpen} onCapture={handleCameraCapture} />
        </>
    );
};

const FeedbackDialog = ({ trigger, taskId, onFeedbackSubmit }: { trigger: React.ReactNode, taskId: string, onFeedbackSubmit: (taskId: string, feedback: any) => void }) => {
    const { toast } = useToast();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [open, setOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newFeedback = {
            rating,
            comment,
            date: new Date().toISOString(),
        }
        onFeedbackSubmit(taskId, newFeedback);
        toast({ title: 'Feedback Submitted', description: 'Thank you for your valuable feedback!' });
        setOpen(false);
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setRating(0);
            setComment('');
        }
        setOpen(isOpen);
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
                        <Textarea id="feedback" value={comment} onChange={e => setComment(e.target.value)} placeholder="Any additional comments? (Optional)" rows={3} />
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

const TaskCreatorDialog = ({ buttonTrigger, onTaskCreated, type, creatorId, creatorProfile }: { buttonTrigger: React.ReactNode, onTaskCreated: (task: any) => void, type: 'Customer Request' | 'VLE Lead', creatorId?: string, creatorProfile?: any }) => {
  const { toast } = useToast();
  const [service, setService] = useState('');
  const [otherService, setOtherService] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    if(selectedFiles.length === 0) {
        toast({
            title: 'Document Required',
            description: 'Please upload at least one document.',
            variant: 'destructive'
        });
        return;
    }
    const form = e.target as HTMLFormElement;
    const finalService = service === 'Other' ? otherService : service;

    const newTask = {
        customer: form.name.value,
        customerAddress: form.address.value,
        customerMobile: form.mobile.value,
        customerEmail: form.email.value,
        service: finalService,
        status: 'Unassigned',
        date: new Date().toISOString(),
        history: [{
            timestamp: new Date().toISOString(),
            actorName: creatorProfile?.name || form.name.value,
            actorRole: type === 'VLE Lead' ? 'VLE' : 'Customer',
            action: 'Task Created',
            details: `Task created for service: ${finalService}.`
        }],
        acknowledgementNumber: null,
        complaint: null,
        feedback: null,
        type: type,
        documents: selectedFiles.map(f => ({ name: f.name, url: '' })), // Placeholder for storage URL
        assignedVleId: null,
        assignedVleName: null,
        creatorId: creatorId,
    };

    await onTaskCreated(newTask);
    
    toast({
      title: 'Task Created!',
      description: `Your new service request has been submitted.`,
    });
    setDialogOpen(false);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
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
          setService('');
          setOtherService('');
          setSelectedFiles([]);
          setIsCameraOpen(false);
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
                <Input id="name" name="name" defaultValue={creatorProfile?.name} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">Address</Label>
                <Input id="address" name="address" defaultValue={creatorProfile?.location} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="mobile" className="text-right">Mobile</Label>
                <Input id="mobile" name="mobile" defaultValue={creatorProfile?.mobile} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={creatorProfile?.email} className="col-span-3" />
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
                    <Button type="button" onClick={() => fileInputRef.current?.click()} variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30">
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
                          {selectedFiles.map((file, i) => <div key={i} className="flex items-center gap-2"><FileText className="h-3 w-3" /><span>{file.name}</span></div>)}
                      </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Create Task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <CameraUploadDialog open={isCameraOpen} onOpenChange={setIsCameraOpen} onCapture={handleCameraCapture} />
    </>
  );
};


const ProfileView = ({ userType, userId, profileData }: {userType: 'Customer' | 'VLE', userId: string, profileData: any}) => {
    const { toast } = useToast();

    type BankAccount = {
        id: string;
        bankName: string;
        accountNumber: string;
        ifscCode: string;
        upiId: string;
    };
    
    const [userProfile, setUserProfile] = useState<any>(profileData);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(profileData?.bankAccounts || []);
    const [isEditing, setIsEditing] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState<string | null>(null);

    const [formState, setFormState] = useState<BankAccount>({
        id: '', bankName: '', accountNumber: '', ifscCode: '', upiId: ''
    });

    useEffect(() => {
        if (!userId) return;
        setUserProfile(profileData);
        setBankAccounts(profileData?.bankAccounts || []);
    }, [userId, profileData]);


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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        let updatedAccounts;
        if (editingAccount) {
            updatedAccounts = bankAccounts.map(acc => acc.id === editingAccount.id ? formState : acc);
            toast({ title: "Bank Details Updated", description: "Your bank account has been updated."});
        } else {
            const newAccount = { ...formState, id: Date.now().toString() };
            updatedAccounts = [...bankAccounts, newAccount];
            toast({ title: "Bank Account Added", description: "Your new bank account has been added."});
        }
        
        const collectionName = userType === 'Customer' ? 'users' : 'vles';
        const docRef = doc(db, collectionName, userId);
        await updateDoc(docRef, { bankAccounts: updatedAccounts });

        setIsEditing(false);
        setEditingAccount(null);
    };

    const handleDeleteClick = (accountId: string) => {
        setAccountToDelete(accountId);
        setIsDeleteDialogOpen(true);
    }
    
    const confirmDelete = async () => {
        if (accountToDelete) {
            const updatedAccounts = bankAccounts.filter(acc => acc.id !== accountToDelete);
            const collectionName = userType === 'Customer' ? 'users' : 'vles';
            const docRef = doc(db, collectionName, userId);
            await updateDoc(docRef, { bankAccounts: updatedAccounts });

            toast({ title: "Bank Account Removed", description: "The bank account has been removed."});
        }
        setIsDeleteDialogOpen(false);
        setAccountToDelete(null);
    }

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditingAccount(null);
    }
    
    if (!userProfile) {
        return <div>Loading profile...</div>;
    }

    return (
    <div className="space-y-6">
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

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-muted-foreground" />
                    <span>Wallet Balance</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">₹{userProfile.walletBalance?.toFixed(2) || '0.00'}</div>
                <p className="text-xs text-muted-foreground">Available balance</p>
            </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
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
                        <Input id="profile-name" defaultValue={userProfile.name} readOnly className="bg-muted/50" />
                     </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-email">Email Address</Label>
                        <Input id="profile-email" type="email" defaultValue={userProfile.email} readOnly className="bg-muted/50" />
                     </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-mobile">Mobile Number</Label>
                        <Input id="profile-mobile" defaultValue={userProfile.mobile} readOnly className="bg-muted/50" />
                     </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Bank Details</CardTitle>
                            <CardDescription>Manage your bank accounts for transactions.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                {isEditing ? (
                     <form onSubmit={handleSave}>
                        <CardContent className="space-y-4">
                            <h4 className="text-base font-semibold leading-none tracking-tight">{editingAccount ? 'Edit' : 'Add'} Bank Account</h4>
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
                                    <div key={account.id} className="p-4 border rounded-lg relative bg-muted/50">
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


const CustomerDashboard = ({ tasks, userId, userProfile, onTaskCreated, onComplaintSubmit, onFeedbackSubmit }: { tasks: any[], userId: string, userProfile: any, onTaskCreated: (task: any) => Promise<void>, onComplaintSubmit: (taskId: string, complaint: any) => void, onFeedbackSubmit: (taskId: string, feedback: any) => void }) => {
    const customerComplaints = tasks.filter(t => t.complaint).map(t => ({...t.complaint, taskId: t.id, service: t.service}));
    
    return (
      <Tabs defaultValue="tasks" className="w-full">
          <div className='flex items-center justify-between'>
            <TabsList>
                <TabsTrigger value="tasks">My Tasks</TabsTrigger>
                <TabsTrigger value="complaints">My Complaints</TabsTrigger>
            </TabsList>
             <TaskCreatorDialog creatorId={userId} creatorProfile={userProfile} type="Customer Request" onTaskCreated={onTaskCreated} buttonTrigger={<Button size="sm" className="h-8 gap-1"><PlusCircle className="h-3.5 w-3.5" />New Request</Button>} />
          </div>
            <TabsContent value="tasks" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>My Service Requests</CardTitle>
                        <CardDescription>
                        Track your ongoing and completed service requests.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Task ID</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {tasks.map(task => (
                            <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.id.slice(-6).toUpperCase()}</TableCell>
                            <TableCell>{task.service}</TableCell>
                            <TableCell><Badge variant="outline">{task.status}</Badge></TableCell>
                            <TableCell>{new Date(task.date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild><Link href={`/dashboard/task/${task.id}`} className="flex items-center w-full"><Eye className="mr-2 h-4 w-4"/>View Details</Link></DropdownMenuItem>
                                        {task.status !== 'Completed' && !task.complaint && (
                                            <ComplaintDialog taskId={task.id} onComplaintSubmit={onComplaintSubmit} trigger={
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center w-full"><ShieldAlert className="mr-2 h-4 w-4"/>Raise Complaint</DropdownMenuItem>
                                            } />
                                        )}
                                        {task.status === 'Completed' && !task.feedback && (
                                             <FeedbackDialog taskId={task.id} onFeedbackSubmit={onFeedbackSubmit} trigger={
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center w-full"><StarIcon className="mr-2 h-4 w-4"/>Give Feedback</DropdownMenuItem>
                                            } />
                                        )}
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
            <TabsContent value="complaints" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>My Complaints</CardTitle>
                        <CardDescription>View and track all your complaints.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Task ID</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Complaint</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Admin Response</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customerComplaints.length > 0 ? (
                                    customerComplaints.map(c => (
                                    <TableRow key={c.date}>
                                        <TableCell className="font-medium">{c.taskId.slice(-6).toUpperCase()}</TableCell>
                                        <TableCell>{c.service}</TableCell>
                                        <TableCell className="max-w-xs break-words">{c.text}</TableCell>
                                        <TableCell><Badge variant={c.status === 'Open' ? 'destructive' : 'default'}>{c.status}</Badge></TableCell>
                                        <TableCell className="max-w-xs break-words">
                                            {c.response ? c.response.text : 'No response yet.'}
                                        </TableCell>
                                    </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            You have not raised any complaints.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}

const VLEDashboard = ({ tasks, userId, userProfile, onTaskCreated, onVleAvailabilityChange }: { tasks: any[], userId: string, userProfile: any, onTaskCreated: (task: any) => Promise<void>, onVleAvailabilityChange: (vleId: string, available: boolean) => void }) => {
    
    return (
    <Tabs defaultValue="tasks" className="w-full">
        <div className="flex items-center">
            <TabsList>
                <TabsTrigger value="tasks">Assigned Tasks</TabsTrigger>
            </TabsList>
            <div className="ml-auto flex items-center gap-2">
                <TaskCreatorDialog type="VLE Lead" onTaskCreated={onTaskCreated} creatorId={userId} creatorProfile={userProfile} buttonTrigger={<Button size="sm" className="h-8 gap-1"><FilePlus className="h-3.5 w-3.5" />Generate Lead</Button>} />
            </div>
        </div>
        <TabsContent value="tasks" className="mt-4">
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
                        <CardTitle>Assigned Tasks</CardTitle>
                        <CardDescription>Tasks assigned to you for fulfillment.</CardDescription>
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
                            {tasks.map(task => (
                            <TableRow key={task.id}>
                                <TableCell className="font-medium">{task.id.slice(-6).toUpperCase()}</TableCell>
                                <TableCell>{task.service}</TableCell>
                                <TableCell><Badge variant="outline">{task.status}</Badge></TableCell>
                                <TableCell>{task.customer}</TableCell>
                                <TableCell>{new Date(task.date).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="outline" size="sm"><Link href={`/dashboard/task/${task.id}`}>View Details</Link></Button>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
    </Tabs>
)};

const AssignVleDialog = ({ trigger, taskId, availableVles, onAssign }: { trigger: React.ReactNode, taskId: string, availableVles: any[], onAssign: (taskId: string, vleId: string, vleName: string) => void }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [selectedVleId, setSelectedVleId] = useState('');

    const handleAssign = () => {
        if (!selectedVleId) {
            toast({ title: 'Select a VLE', description: 'Please select a VLE to assign the task.', variant: 'destructive' });
            return;
        }
        const vle = availableVles.find(v => v.id === selectedVleId);
        onAssign(taskId, selectedVleId, vle.name);
        toast({ title: 'Task Assigned', description: `Task ${taskId.slice(-6).toUpperCase()} has been assigned.`});
        setOpen(false);
    }

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setSelectedVleId('');
        }
        setOpen(isOpen);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Task {taskId.slice(-6).toUpperCase()}</DialogTitle>
                    <DialogDescription>Select an available VLE to assign this task to.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Select onValueChange={setSelectedVleId} value={selectedVleId}>
                        <SelectTrigger><SelectValue placeholder="Select an available VLE" /></SelectTrigger>
                        <SelectContent>
                            {availableVles.map(vle => (
                                <SelectItem key={vle.id} value={vle.id}>{vle.name} - {vle.location}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button onClick={handleAssign}>Assign VLE</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const AddBalanceDialog = ({ trigger, vleName, onAddBalance }: { trigger: React.ReactNode, vleName: string, onAddBalance: (amount: number) => void }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const amountToAdd = parseFloat(amount);
        if (isNaN(amountToAdd) || amountToAdd <= 0) {
            toast({ title: 'Invalid Amount', description: 'Please enter a valid positive number.', variant: 'destructive' });
            return;
        }
        onAddBalance(amountToAdd);
        toast({ title: 'Balance Added', description: `₹${amountToAdd.toFixed(2)} has been added to ${vleName}'s wallet.` });
        setOpen(false);
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setAmount('');
        }
        setOpen(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add Balance to {vleName}'s Wallet</DialogTitle>
                        <DialogDescription>Enter the amount you wish to add. This will be added to the VLE's current balance.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 grid gap-4">
                        <Label htmlFor="amount">Amount to Add (₹)</Label>
                        <Input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="e.g., 500"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit">Add Balance</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};


const AdminDashboard = ({ allTasks, vles, allUsers, onComplaintResponse, onVleApprove, onVleAssign, onUpdateVleBalance }: { allTasks: any[], vles: any[], allUsers: any[], onComplaintResponse: (taskId: string, customerId: string, response: any) => void, onVleApprove: (vleId: string) => void, onVleAssign: (taskId: string, vleId: string, vleName: string) => void, onUpdateVleBalance: (vleId: string, amount: number) => void }) => {
    const vlesForManagement = vles.filter(v => !v.isAdmin);
    const availableVles = vlesForManagement.filter(v => v.status === 'Approved' && v.available);
    const pendingVles = vlesForManagement.filter(v => v.status === 'Pending');
    const complaints = allTasks.filter(t => t.complaint).map(t => ({...t.complaint, taskId: t.id, customer: t.customer, service: t.service, date: t.date, customerId: t.creatorId}));
    const feedback = allTasks.filter(t => t.feedback).map(t => ({...t.feedback, taskId: t.id, customer: t.customer, date: t.date, service: t.service}));
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');


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

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="vle-management">VLEs</TabsTrigger>
                <TabsTrigger value="customer-management">Customers</TabsTrigger>
                <TabsTrigger value="all-tasks">Tasks</TabsTrigger>
                <TabsTrigger value="complaints">Complaints</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Total Tasks" value={allTasks.length.toString()} icon={Briefcase} description="All tasks in the system" />
                    <StatCard title="Total VLEs" value={vlesForManagement.length.toString()} icon={Users} description="Registered VLEs" />
                    <StatCard title="Total Customers" value={allUsers.length.toString()} icon={Users2} description="Registered customers" />
                    <StatCard title="Open Complaints" value={complaints.filter(c => c.status === 'Open').length.toString()} icon={AlertTriangle} description="Awaiting admin response" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
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
                            <CardTitle>Customer Feedback</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Customer</TableHead>
                                        <TableHead className="text-center">Rating</TableHead>
                                        <TableHead>Comment</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {feedback.length > 0 ? feedback.slice(0, 5).map(fb => (
                                        <TableRow key={fb.date}>
                                            <TableCell>{fb.customer}</TableCell>
                                            <TableCell><StarRating rating={fb.rating} readOnly={true} /></TableCell>
                                            <TableCell className='truncate max-w-xs'>{fb.comment}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center">No feedback yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            <TabsContent value="vle-management" className="mt-4">
                <Card>
                <CardHeader>
                    <CardTitle>VLE Management</CardTitle>
                    <CardDescription>Approve or manage VLE accounts and see their availability.</CardDescription>
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
                        {vlesForManagement.map(vle => (
                        <TableRow key={vle.id}>
                            <TableCell>{vle.name}</TableCell>
                            <TableCell>{vle.location}</TableCell>
                            <TableCell>₹{vle.walletBalance?.toFixed(2) || '0.00'}</TableCell>
                            <TableCell><Badge variant={vle.status === 'Approved' ? 'default' : 'secondary'}>{vle.status}</Badge></TableCell>
                            <TableCell>
                                {vle.status === 'Approved' ? (
                                     <Badge variant={vle.available ? 'outline' : 'destructive'} className={cn(vle.available && 'border-green-500 text-green-600')}>{vle.available ? 'Available' : 'Unavailable'}</Badge>
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
                    <CardTitle>Customer Management</CardTitle>
                    <CardDescription>View all registered customers in the system.</CardDescription>
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
                        {allUsers.map(user => (
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
                                    <TableHead>Assigned VLE</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allTasks.map(task => (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-medium">{task.id.slice(-6).toUpperCase()}</TableCell>
                                        <TableCell>{task.customer}</TableCell>
                                        <TableCell>{task.service}</TableCell>
                                        <TableCell><Badge variant="outline">{task.status}</Badge></TableCell>
                                        <TableCell>{task.assignedVleName || 'N/A'}</TableCell>
                                        <TableCell>{new Date(task.date).toLocaleDateString()}</TableCell>
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
};

export default function DashboardPage() {
    const { toast } = useToast();
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'tasks');

    const [tasks, setTasks] = useState<any[]>([]);
    const [vles, setVles] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [realtimeProfile, setRealtimeProfile] = useState<any | null>(null);
    
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) return;
        
        const probableRole = userProfile?.role || 'customer';
        const collectionName = (userProfile?.isAdmin || probableRole === 'vle') ? 'vles' : 'users';
        const docRef = doc(db, collectionName, user.uid);
        
        const unsubscribe = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                setRealtimeProfile({ id: doc.id, ...doc.data() });
            } else if (collectionName === 'users') {
                 const vleDocRef = doc(db, 'vles', user.uid);
                 const unsubVle = onSnapshot(vleDocRef, (vleDoc) => {
                     if (vleDoc.exists()) {
                         setRealtimeProfile({ id: vleDoc.id, ...vleDoc.data() });
                     } else {
                         console.error(`User ${user.uid} not found in users or vles collection.`);
                     }
                 });
                 return () => unsubVle();
            } else {
                console.error(`User ${user.uid} not found in ${collectionName} collection.`);
            }
        }, (error) => {
            console.error("Error listening to profile updates:", error);
        });

        return () => unsubscribe();
    }, [user, userProfile?.role]);

    // Fetch data based on user role
    useEffect(() => {
        if (!user || !realtimeProfile) {
            return;
        }

        let unsubscribeTasks: () => void = () => {};
        let unsubscribeVles: () => void = () => {};
        let unsubscribeUsers: () => void = () => {};

        const primaryRole = realtimeProfile.isAdmin ? 'admin' : realtimeProfile.role;

        if (primaryRole === 'admin') {
            const tasksQuery = query(collection(db, "tasks"), orderBy("date", "desc"));
            unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
                const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTasks(fetchedTasks);
            });

            const vlesQuery = query(collection(db, "vles"));
            unsubscribeVles = onSnapshot(vlesQuery, (snapshot) => {
                const fetchedVles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setVles(fetchedVles);
            });

            const usersQuery = query(collection(db, "users"));
            unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
                const fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllUsers(fetchedUsers);
            });

        } else if (primaryRole === 'vle') {
            const tasksQuery = query(collection(db, "tasks"), where("assignedVleId", "==", user.uid));
            unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
                const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                fetchedTasks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setTasks(fetchedTasks);
            });
        } else { // Customer
            const tasksQuery = query(collection(db, "tasks"), where("creatorId", "==", user.uid));
            unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
                 const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                fetchedTasks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setTasks(fetchedTasks);
            });
        }
        
        return () => {
            unsubscribeTasks();
            unsubscribeVles();
            unsubscribeUsers();
        };
    }, [user, realtimeProfile]);


    const handleCreateTask = async (newTask: any) => {
        const docRef = await addDoc(collection(db, "tasks"), newTask);
        await createNotificationForAdmins(
            'New Task Created',
            `A new task '${newTask.service}' has been created by ${newTask.customer}.`,
            `/dashboard/task/${docRef.id}`
        );
    }

    const handleComplaintSubmit = async (taskId: string, complaint: any) => {
        const taskRef = doc(db, "tasks", taskId);
        await updateDoc(taskRef, { complaint: complaint, status: 'Complaint Raised' });
        const taskSnap = await getDoc(taskRef);
        const taskData = taskSnap.data();
        await createNotificationForAdmins(
            'New Complaint Raised',
            `A complaint was raised for task ${taskId.slice(-6).toUpperCase()} by ${taskData?.customer}.`,
            `/dashboard/task/${taskId}`
        );
    }
    
    const handleFeedbackSubmit = async (taskId: string, feedback: any) => {
        const taskRef = doc(db, "tasks", taskId);
        await updateDoc(taskRef, { feedback: feedback });
    }

    const handleComplaintResponse = async (taskId: string, customerId: string, response: any) => {
        const taskRef = doc(db, "tasks", taskId);
        const taskSnap = await getDoc(taskRef);
        if (taskSnap.exists()) {
            const taskData = taskSnap.data();
            const updatedComplaint = { ...taskData.complaint, response, status: 'Responded' };
            await updateDoc(taskRef, { complaint: updatedComplaint });
            await createNotification(
                customerId,
                'Response to your Complaint',
                `An admin has responded to your complaint for task ${taskId.slice(-6).toUpperCase()}.`,
                `/dashboard/task/${taskId}`
            );
        }
    }
    
    const handleVleApprove = async (vleId: string) => {
        const vleRef = doc(db, "vles", vleId);
        await updateDoc(vleRef, { status: 'Approved' });
        await createNotification(
            vleId,
            'Account Approved',
            'Congratulations! Your VLE account has been approved by an admin.'
        );
        toast({ title: 'VLE Approved', description: 'The VLE has been approved and can now take tasks.'});
    }

    const handleVleAvailabilityChange = async (vleId: string, available: boolean) => {
        const vleRef = doc(db, "vles", vleId);
        await updateDoc(vleRef, { available: available });
        toast({ title: 'Availability Updated', description: `You are now ${available ? 'available' : 'unavailable'} for tasks.`});
    }

    const handleAssignVle = async (taskId: string, vleId: string, vleName: string) => {
        const taskRef = doc(db, "tasks", taskId);
        const historyEntry = {
            timestamp: new Date().toISOString(),
            actorName: realtimeProfile?.name || 'Admin',
            actorRole: 'Admin',
            action: 'Task Assigned',
            details: `Task assigned to VLE: ${vleName}.`
        };
        await updateDoc(taskRef, { 
            status: 'Assigned', 
            assignedVleId: vleId, 
            assignedVleName: vleName,
            history: arrayUnion(historyEntry)
        });
        await createNotification(
            vleId,
            'New Task Assigned',
            `You have been assigned a new task: ${taskId.slice(-6).toUpperCase()}.`,
            `/dashboard/task/${taskId}`
        );
    }
    
    const handleUpdateVleBalance = async (vleId: string, amountToAdd: number) => {
        const vleRef = doc(db, "vles", vleId);
        try {
            await runTransaction(db, async (transaction) => {
                const vleDoc = await transaction.get(vleRef);
                if (!vleDoc.exists()) {
                    throw "Document does not exist!";
                }
                const currentBalance = vleDoc.data().walletBalance || 0;
                const newBalance = currentBalance + amountToAdd;
                transaction.update(vleRef, { walletBalance: newBalance });
            });

            await createNotification(
                vleId,
                'Wallet Balance Updated',
                `An admin has added ₹${amountToAdd.toFixed(2)} to your wallet.`
            );
        } catch (e) {
            console.error("Transaction failed: ", e);
            toast({ title: "Error", description: "Failed to update balance.", variant: "destructive" });
        }
    };
    
    if (loading || !user || !realtimeProfile) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        )
    }

    const primaryRole = realtimeProfile.isAdmin ? 'admin' : realtimeProfile.role;
    
    const renderContent = () => {
        switch (primaryRole) {
            case 'admin':
                return <AdminDashboard allTasks={tasks} vles={vles} allUsers={allUsers} onComplaintResponse={handleComplaintResponse} onVleApprove={handleVleApprove} onVleAssign={handleAssignVle} onUpdateVleBalance={handleUpdateVleBalance} />;
            case 'vle':
                return <VLEDashboard tasks={tasks} userId={user.uid} userProfile={realtimeProfile} onTaskCreated={handleCreateTask} onVleAvailabilityChange={handleVleAvailabilityChange} />;
            case 'customer':
                return <CustomerDashboard tasks={tasks} userId={user.uid} userProfile={userProfile} onTaskCreated={handleCreateTask} onComplaintSubmit={handleComplaintSubmit} onFeedbackSubmit={handleFeedbackSubmit} />;
            default:
                 return (
                    <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                )
        }
    }

    if(activeTab === 'profile') {
        return <ProfileView userType={primaryRole === 'vle' ? 'VLE' : 'Customer'} userId={user.uid} profileData={realtimeProfile} />
    }

    return renderContent();
}
