'use client';

import { useState, useRef, useEffect, type ChangeEvent, type FormEvent, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileUp, FileText, Wallet, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { validateFiles } from '@/lib/utils';
import { Briefcase, Users, Users2, AlertTriangle } from 'lucide-react';
import { createTask } from '@/app/actions';

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const StatCard = ({ title, value, icon: Icon, description }: {title: string, value: string, icon: React.ElementType, description: string}) => (
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

export const TaskCreatorDialog = ({ buttonTrigger, type, creatorId, creatorProfile, services }: { buttonTrigger: React.ReactNode, type: 'Customer Request' | 'VLE Lead', creatorId?: string, creatorProfile?: any, services: any[] }) => {
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

  const handleDialogSubmit = async (e: FormEvent<HTMLFormElement>) => {
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
        const formData = new FormData();
        formData.append('name', form.name.value);
        formData.append('mobile', mobile);
        formData.append('address', form.address.value);
        formData.append('email', email);
        formData.append('type', type);
        formData.append('creatorId', creatorId);
        formData.append('creatorProfile', JSON.stringify(creatorProfile));
        formData.append('selectedService', JSON.stringify(selectedService));
        selectedFiles.forEach(file => formData.append('files', file));
        
        const result = await createTask(formData);

        if (result.success) {
            toast({ title: 'Success!', description: result.message });
            setDialogOpen(false); 
        } else {
            throw new Error(result.error || 'An unknown error occurred.');
        }

    } catch (error: any) {
        console.error("Error creating task:", error);
        toast({
            title: 'Task Creation Failed',
            description: error.message,
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
                 <div className="space-y-4">
                    <p className="text-sm font-medium text-muted-foreground">User Details</p>
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
                </div>

                <Separator className="my-2" />
                
                <div className="space-y-4">
                    <p className="text-sm font-medium text-muted-foreground">Service Selection</p>
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
                            name="files"
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
                </div>

               {selectedService && creatorProfile && (
                <>
                    <Separator className="my-2" />
                     <div className="space-y-4">
                        <p className="text-sm font-medium text-muted-foreground">Wallet Summary</p>
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
                     </div>
                 </>
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
