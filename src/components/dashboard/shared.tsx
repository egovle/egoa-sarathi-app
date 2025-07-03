
'use client';

import { useState, useRef, useEffect, type ChangeEvent, type FormEvent, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileUp, Camera, FileText, Send, Star, UserPlus, Wallet, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


// --- HELPER COMPONENTS ---

const fileValidationConfig = {
    allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'],
    maxSize: 1 * 1024 * 1024, // 1 MB
};

const validateFiles = (files: File[]): { isValid: boolean, message?: string } => {
    for (const file of files) {
        if (!fileValidationConfig.allowedTypes.includes(file.type)) {
            return { isValid: false, message: `Invalid file type: ${file.name}. Only PNG, JPG, JPEG, and PDF are allowed.` };
        }
        if (file.size > fileValidationConfig.maxSize) {
            return { isValid: false, message: `File is too large: ${file.name}. Maximum size is 1MB.` };
        }
    }
    return { isValid: true };
};

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const StarRating = ({ rating, setRating, readOnly = false }: { rating: number; setRating?: (rating: number) => void; readOnly?: boolean }) => {
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

export const ComplaintResponseDialog = ({ trigger, complaint, taskId, customerId, onResponseSubmit }: { trigger: React.ReactNode, complaint: any, taskId: string, customerId: string, onResponseSubmit: (taskId: string, customerId: string, response: any) => void }) => {
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
            const files = Array.from(e.target.files);
            const validation = validateFiles(files);
            if (!validation.isValid) {
                toast({ title: 'Validation Error', description: validation.message, variant: 'destructive' });
                return;
            }
            setSelectedFiles(prev => [...prev, ...files]);
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


export const ComplaintDialog = ({ trigger, taskId, onComplaintSubmit }: { trigger: React.ReactNode, taskId: string, onComplaintSubmit: (taskId: string, complaint: any) => void }) => {
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
            const files = Array.from(e.target.files);
            const validation = validateFiles(files);
            if (!validation.isValid) {
                toast({ title: 'Validation Error', description: validation.message, variant: 'destructive' });
                return;
            }
            setSelectedFiles(prev => [...prev, ...files]);
        }
    };
    
    const handleCameraCapture = (file: File) => {
        const validation = validateFiles([file]);
        if (!validation.isValid) {
            toast({ title: 'Validation Error', description: validation.message, variant: 'destructive' });
            return;
        }
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

export const FeedbackDialog = ({ trigger, taskId, onFeedbackSubmit }: { trigger: React.ReactNode, taskId: string, onFeedbackSubmit: (taskId: string, feedback: any) => void }) => {
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


export const CameraUploadDialog = ({ open, onOpenChange, onCapture }: { open: boolean, onOpenChange: (open: boolean) => void, onCapture: (file: File) => void }) => {
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

export const TaskCreatorDialog = ({ buttonTrigger, onTaskCreated, type, creatorId, creatorProfile, services }: { buttonTrigger: React.ReactNode, onTaskCreated: (task: any, service: any, filesToUpload: File[]) => Promise<void>, type: 'Customer Request' | 'VLE Lead', creatorId?: string, creatorProfile?: any, services: any[] }) => {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const parentServices = useMemo(() => services.filter(s => !s.parentId), [services]);
  const subServices = useMemo(() => {
    if (!selectedCategory) return [];
    return services.filter(s => s.parentId === selectedCategory);
  }, [services, selectedCategory]);

  const selectedService = useMemo(() => {
    const finalServiceId = selectedSubCategory || selectedCategory;
    return services.find(s => s.id === finalServiceId);
  }, [services, selectedCategory, selectedSubCategory]);

  const serviceFee = useMemo(() => {
    if (!selectedService || selectedService.isVariable) return 0;
    const isVleLead = creatorProfile?.role === 'vle';
    return parseFloat(isVleLead ? selectedService.vleRate : selectedService.customerRate);
  }, [selectedService, creatorProfile]);

  const remainingBalance = useMemo(() => {
    const currentBalance = creatorProfile?.walletBalance || 0;
    return currentBalance - serviceFee;
  }, [creatorProfile, serviceFee]);


  useEffect(() => {
      setSelectedSubCategory('');
      setSelectedFiles([]);
  }, [selectedCategory])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const files = Array.from(e.target.files);
        const validation = validateFiles(files);
        if (!validation.isValid) {
            toast({ title: 'Validation Error', description: validation.message, variant: 'destructive' });
            return;
        }
        setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleDialogSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const form = e.target as HTMLFormElement;
    const mobile = form.mobile.value;
    const email = form.email.value;

    if (mobile.length !== 10) {
        toast({ title: 'Invalid Mobile Number', description: 'Please enter a valid 10-digit mobile number.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }
    if (email && !validateEmail(email)) {
        toast({ title: 'Invalid Email Address', description: 'Please enter a valid email format.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }
    if (!creatorProfile || !creatorId) {
        toast({ title: "Error", description: "Your profile is still loading, please wait a moment.", variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }
    
    if (selectedFiles.length === 0) {
        toast({ title: "Documents Required", description: "Please upload at least one document for the selected service.", variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }

    if (!selectedService || (!selectedService.isVariable && (!selectedService.customerRate || selectedService.customerRate <= 0))) {
        toast({ title: 'Specific Service Required', description: 'This appears to be a category. Please select a specific sub-service to proceed.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }
    
    try {
        const isVleLead = creatorProfile.role === 'vle';
        const totalPaid = isVleLead ? selectedService.vleRate : selectedService.customerRate;
        
        const newTaskData = {
            customer: form.name.value,
            customerAddress: form.address.value,
            customerMobile: mobile,
            customerEmail: email,
            service: selectedService.name,
            serviceId: selectedService.id,
            date: new Date().toISOString(),
            totalPaid: totalPaid,
            governmentFeeApplicable: selectedService.governmentFee || 0,
            customerRate: selectedService.customerRate,
            vleRate: selectedService.vleRate,
            history: [{
                timestamp: new Date().toISOString(),
                actorId: creatorId,
                actorRole: type === 'VLE Lead' ? 'VLE' : 'Customer',
                action: 'Task Created',
                details: `Task created for service: ${selectedService.name}.`
            }],
            acknowledgementNumber: null,
            complaint: null,
            feedback: null,
            type: type,
            assignedVleId: null,
            assignedVleName: null,
            creatorId: creatorId,
            finalCertificate: null,
        };

        await onTaskCreated(newTaskData, selectedService, selectedFiles);
        setDialogOpen(false); 
    } catch (error: any) {
        console.error("Error creating task:", error);
        toast({
            title: 'Task Creation Failed',
            description: error.message || 'There was an error creating your task. Please check your balance and try again.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
      setDialogOpen(isOpen);
      if (!isOpen) {
          setSelectedCategory('');
          setSelectedSubCategory('');
          setSelectedFiles([]);
          setIsSubmitting(false);
      }
  }

  const getServiceDisplayName = (s: any) => {
    const isVle = creatorProfile?.role === 'vle';
    const rate = isVle ? s.vleRate : s.customerRate;
    return s.isVariable ? `${s.name} - Variable Rate` : `${s.name} - ₹${rate}`;
  }

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{buttonTrigger}</DialogTrigger>
        <DialogContent 
            className="sm:max-w-2xl"
            onInteractOutside={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('[data-radix-popper-content-wrapper]')) {
                    e.preventDefault();
                }
            }}
        >
          <form onSubmit={handleDialogSubmit}>
            <DialogHeader>
              <DialogTitle>Create a new Service Request</DialogTitle>
              <DialogDescription>
                Fill in the details for your new service request.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" name="name" defaultValue={creatorProfile?.name} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="mobile">Mobile</Label>
                        <Input id="mobile" name="mobile" type="tel" maxLength={10} defaultValue={creatorProfile?.mobile} required onChange={(e) => e.target.value = e.target.value.replace(/\D/g, '')} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" name="address" defaultValue={creatorProfile?.location} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={creatorProfile?.email} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Service Category</Label>
                        <Select onValueChange={setSelectedCategory} value={selectedCategory} required>
                            <SelectTrigger><SelectValue placeholder="Select a service category" /></SelectTrigger>
                            <SelectContent>
                                {parentServices?.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedCategory && subServices.length > 0 && (
                        <div className="space-y-2">
                            <Label>Specific Service</Label>
                            <Select onValueChange={setSelectedSubCategory} value={selectedSubCategory} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a specific service" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subServices?.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{getServiceDisplayName(s)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="documents">Attach Documents</Label>
                    <Input
                        id="documents"
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="text-xs h-9"
                    />
                     {selectedFiles.length > 0 && (
                        <div className="text-xs text-muted-foreground space-y-1 mt-2">
                            <p className='font-medium'>Selected files:</p>
                            {selectedFiles.map((file, i) => (
                                <p key={i} className="truncate" title={file.name}>
                                    <FileText className="h-3 w-3 inline-block mr-1" />
                                    {file.name}
                                </p>
                            ))}
                        </div>
                    )}
                </div>

               {selectedService && creatorProfile && (
                 <Card className="bg-muted/50 p-4 mt-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Current Wallet Balance</span>
                        <span>₹{creatorProfile.walletBalance?.toFixed(2) || '0.00'}</span>
                    </div>
                    {!selectedService.isVariable && (
                      <>
                        <div className="flex justify-between text-sm text-destructive">
                            <span className="text-muted-foreground">Service Fee</span>
                            <span>- ₹{serviceFee.toFixed(2)}</span>
                        </div>
                        <Separator className="my-2" />
                        <div className={`flex justify-between font-semibold ${remainingBalance < 0 ? 'text-destructive' : ''}`}>
                            <span>Remaining Balance</span>
                            <span>₹{remainingBalance.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    {selectedService.isVariable && (
                        <p className="text-xs text-center text-muted-foreground pt-2">An admin will set the final price for this service after reviewing your request.</p>
                    )}
                 </Card>
              )}
            </div>
            <DialogFooter className='pt-4 border-t'>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const AddBalanceRequestDialog = ({ trigger, onBalanceRequest }: { trigger: React.ReactNode, onBalanceRequest: (amount: number) => void }) => {
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
        onBalanceRequest(amountToAdd);
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
                        <DialogTitle>Add Balance to Wallet</DialogTitle>
                        <DialogDescription>
                            Please transfer funds to the details below and then create a request here. An admin will verify and credit your wallet.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 grid gap-6">
                        <Card className="bg-muted/50">
                            <CardHeader className='p-4'>
                                <CardTitle className="text-base">Payment Details</CardTitle>
                            </CardHeader>
                            <CardContent className='p-4 pt-0 text-sm space-y-2'>
                                <p><b>UPI ID:</b> admin-upi@ybl</p>
                                <p><b>Bank:</b> HDFC Bank</p>
                                <p><b>Account:</b> 1234567890</p>
                            </CardContent>
                        </Card>
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount Transferred (₹)</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="e.g., 500"
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Submit Request</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};


export const AssignVleDialog = ({ trigger, taskId, availableVles, onAssign }: { trigger: React.ReactNode, taskId: string, availableVles: any[], onAssign: (taskId: string, vleId: string, vleName: string) => void }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [selectedVleId, setSelectedVleId] = useState('');

    const handleAssign = async () => {
        if (!selectedVleId) {
            toast({ title: 'Select a VLE', description: 'Please select a VLE to assign the task.', variant: 'destructive' });
            return;
        }
        const vle = availableVles.find(v => v.id === selectedVleId);
        
        try {
            await onAssign(taskId, selectedVleId, vle.name);
            toast({ title: 'Task Assigned', description: `Task ${taskId.slice(-6).toUpperCase()} has been assigned.`});
            setOpen(false);
        } catch (error) {
            console.error("Assignment failed, dialog will remain open.");
        }
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

export const AddBalanceDialog = ({ trigger, vleName, onAddBalance }: { trigger: React.ReactNode, vleName: string, onAddBalance: (vleId: string, amount: number) => void }) => {
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
        onAddBalance(vleName, amountToAdd);
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
