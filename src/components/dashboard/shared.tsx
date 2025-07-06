
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
import { Badge } from '../ui/badge';

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
  
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({}); // key: "groupKey:optionKey"
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
      setUploadedFiles({});
  }, [selectedCategory])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, groupKey: string, optionKey: string, allowedFileTypes?: string[]) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const validation = validateFiles([file], allowedFileTypes);
        if (!validation.isValid) {
            toast({ title: 'Validation Error', description: validation.message, variant: 'destructive' });
            if(e.target) e.target.value = ''; // Reset file input
            return;
        }
        setUploadedFiles(prev => ({ ...prev, [`${groupKey}:${optionKey}`]: file }));
    }
  };

  const handleDialogSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const mobile = formData.get('mobile') as string;
    const email = formData.get('email') as string;

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
    
    if (!selectedService || (!selectedService.isVariable && (!selectedService.customerRate || selectedService.customerRate <= 0))) {
        toast({ title: 'Specific Service Required', description: 'This appears to be a category. Please select a specific sub-service to proceed.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }

    if(selectedService?.documentGroups) {
        for (const group of selectedService.documentGroups) {
            if (group.isOptional) continue;

            const minRequired = group.minRequired || 0;
            if (minRequired === 0) continue;

            let suppliedCount = 0;
            for (const option of group.options) {
                if (group.type === 'documents') {
                    const fileKey = `${group.key}:${option.key}`;
                    if (uploadedFiles[fileKey]) {
                        suppliedCount++;
                    }
                } else if (group.type === 'text') {
                    const fieldKey = `text_${group.key}:${option.key}`;
                    const value = formData.get(fieldKey) as string;
                    if (value && value.trim()) {
                        suppliedCount++;
                    }
                }
            }

            if (suppliedCount < minRequired) {
                toast({
                    title: `More Information Required`,
                    description: `Please provide at least ${minRequired} item(s) for the "${group.label}" section.`,
                    variant: 'destructive',
                });
                setIsSubmitting(false);
                return;
            }
        }
    }
    
    try {
        formData.append('type', type);
        formData.append('creatorId', creatorId);
        formData.append('creatorProfile', JSON.stringify(creatorProfile));
        formData.append('selectedService', JSON.stringify(selectedService));
        
        Object.entries(uploadedFiles).forEach(([key, file]) => {
            formData.append(`file_${key}`, file, file.name);
        });
        
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
          setUploadedFiles({});
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
            className="sm:max-w-3xl"
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
                </div>

                {selectedService && selectedService.documentGroups?.length > 0 && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-4">
                      <p className="text-sm font-medium text-muted-foreground">Required Information</p>
                      <div className="space-y-4">
                        {selectedService.documentGroups.map(group => (
                          <Card key={group.key} className="p-4 bg-muted/50">
                              <CardHeader className="p-0 pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    {group.label}
                                    {group.isOptional && <Badge variant="outline">Optional Group</Badge>}
                                </CardTitle>
                                {!group.isOptional && (group.minRequired || 0) > 0 && (
                                    <CardDescription>Please provide at least {group.minRequired} of the following:</CardDescription>
                                )}
                              </CardHeader>
                              <CardContent className="p-0 space-y-2">
                                {group.options.map(option => {
                                  const fileKey = `${group.key}:${option.key}`;
                                  const isMandatory = !group.isOptional && !option.isOptional && (group.minRequired || 0) === 0;
                                  const uploadedFile = uploadedFiles[fileKey];
                                  if (group.type === 'documents') {
                                      return (
                                          <div key={option.key} className="flex items-center justify-between gap-2 text-sm p-2 border-b last:border-b-0">
                                              <Label htmlFor={fileKey} className="flex-1">
                                                {option.label}
                                                {isMandatory && <span className="text-destructive ml-1">*</span>}
                                                {option.isOptional && !group.isOptional && <Badge variant="outline" className="ml-2 text-xs">Optional</Badge>}
                                              </Label>
                                              {uploadedFile ? (
                                                  <div className="flex items-center gap-2 text-green-600 font-medium">
                                                    <FileText className="h-4 w-4" />
                                                    <span className="truncate max-w-xs">{uploadedFile.name}</span>
                                                  </div>
                                              ) : (
                                                <Button type="button" size="sm" variant="outline" onClick={() => fileInputRefs.current[fileKey]?.click()}>
                                                    <FileUp className="h-4 w-4 mr-2"/>Upload
                                                </Button>
                                              )}
                                              <Input 
                                                  id={fileKey}
                                                  type="file"
                                                  className="hidden"
                                                  ref={el => fileInputRefs.current[fileKey] = el}
                                                  onChange={(e) => handleFileChange(e, group.key, option.key, option.allowedFileTypes)}
                                                  accept={option.allowedFileTypes?.map(t => `.${t}`).join(',')}
                                              />
                                          </div>
                                      )
                                  } else { // group.type === 'text'
                                      return (
                                          <div key={option.key} className="space-y-2 p-2">
                                              <Label htmlFor={`text_${group.key}:${option.key}`}>
                                                {option.label}
                                                {isMandatory && <span className="text-destructive ml-1">*</span>}
                                                {option.isOptional && !group.isOptional && <Badge variant="outline" className="ml-2 text-xs">Optional</Badge>}
                                              </Label>
                                              <Input 
                                                id={`text_${group.key}:${option.key}`}
                                                name={`text_${group.key}:${option.key}`}
                                                placeholder={option.placeholder || ''}
                                                required={isMandatory}
                                              />
                                          </div>
                                      )
                                  }
                                })}
                              </CardContent>
                          </Card>
                        ))}
                      </div>
                  </div>
                </>
                )}


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
