
'use client';

import { useState, useEffect, type FormEvent, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, ChevronsUpDown, Check, X, Search, CircleDollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DayPicker } from 'react-day-picker';
import "react-day-picker/dist/style.css";
import { createNotification, createNotificationForAdmins, processCampPayout } from '@/app/actions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import type { Camp, CampSuggestion, VLEProfile, Service, GovernmentProfile, CampVLE, UserProfile } from '@/lib/types';


export const CampFormDialog = ({ camp, suggestion, vles, adminProfile, onFinished }: { camp?: Camp | null; suggestion?: CampSuggestion | null; vles: VLEProfile[]; adminProfile: UserProfile | null; onFinished: () => void; }) => {
    const { toast } = useToast();
    const initialData = camp || suggestion || {};
    
    const initialName = camp?.name || (suggestion ? `Goa Sarathi Camp at ${suggestion.location}`: '');

    const [name, setName] = useState(initialName);
    const [location, setLocation] = useState(initialData.location || '');
    const [date, setDate] = useState<Date | undefined>(initialData.date ? new Date(initialData.date) : undefined);
    const [loading, setLoading] = useState(false);
    
    const [assignedVles, setAssignedVles] = useState<VLEProfile[]>([]);

    useEffect(() => {
        const initialAssignedVles = camp ? vles.filter(vle => camp.assignedVles.some(av => av.vleId === vle.id)) : [];
        setAssignedVles(initialAssignedVles);
    }, [camp, vles]);


    const [isVlePopoverOpen, setIsVlePopoverOpen] = useState(false);
    const [vleSearch, setVleSearch] = useState('');
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

    const filteredVles = useMemo(() => {
        const baseList = vles.filter(vle => vle.status === 'Approved' && vle.available);
        if (!vleSearch) return baseList;
        return baseList.filter(vle => 
            vle.name.toLowerCase().includes(vleSearch.toLowerCase()) ||
            vle.location.toLowerCase().includes(vleSearch.toLowerCase())
        );
    }, [vles, vleSearch]);

    const minDate = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!date) {
            toast({ title: "Date required", description: "Please select a date for the camp.", variant: "destructive" });
            setLoading(false);
            return;
        }
        
        const newlyAssignedVles = assignedVles.filter(
            vle => !camp?.assignedVles?.some((av:any) => av.vleId === vle.id)
        );

        const campData: Omit<Camp, 'id'> = {
            name,
            location,
            date: date.toISOString(),
            status: camp?.status === 'Paid Out' ? 'Paid Out' : 'Upcoming',
            type: camp ? camp.type : (suggestion ? 'suggested' : 'created'),
            services: initialData.services || [],
            otherServices: initialData.otherServices || '',
            assignedVles: assignedVles.map(vle => {
                const existingVle = camp?.assignedVles.find(av => av.vleId === vle.id);
                if (existingVle) return existingVle;
                return { vleId: vle.id, status: 'pending' };
            }),
        };

        try {
            if (camp) {
                await updateDoc(doc(db, "camps", camp.id), campData);
                toast({ title: 'Camp Updated', description: `${name} has been successfully updated.` });
            } else if (suggestion) {
                 const newCampRef = doc(collection(db, "camps"));
                 const suggestionRef = doc(db, "campSuggestions", suggestion.id);
                 
                 const batch = writeBatch(db);
                 batch.set(newCampRef, campData);
                 batch.delete(suggestionRef);
                 await batch.commit();

                 toast({ title: 'Suggestion Approved', description: 'The camp is now listed as upcoming.' });
                 if (suggestion.suggestedBy?.id) {
                    await createNotification(suggestion.suggestedBy.id, 'Camp Suggestion Approved!', `Your suggestion for a camp at ${suggestion.location} has been approved.`);
                }
            } else {
                await addDoc(collection(db, "camps"), campData);
                toast({ title: 'Camp Created', description: `${name} has been successfully created.` });
            }
            
            for (const vle of newlyAssignedVles) {
                await createNotification(vle.id, 'New Camp Invitation', `You have been invited to join the camp "${name}".`, '/dashboard/camps');
            }
            
            onFinished();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'An unknown error occurred.', variant: 'destructive' });
        }
        setLoading(false);
    };
    
    const toggleVleSelection = (vle: VLEProfile) => {
        setAssignedVles(currentVles => {
            const isSelected = currentVles.some(s => s.id === vle.id);
            if (isSelected) {
                return currentVles.filter(s => s.id !== vle.id);
            } else {
                return [...currentVles, vle];
            }
        });
    };

    return (
        <DialogContent
            className="sm:max-w-lg"
            onInteractOutside={(e) => {
              if (e.target instanceof HTMLElement && e.target.closest('[data-radix-popper-content-wrapper]')) {
                e.preventDefault();
              }
            }}
        >
        <DialogHeader>
            <DialogTitle>{camp ? 'Edit Camp' : (suggestion ? 'Approve & Finalize Camp' : 'Create New Camp')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} id="camp-form">
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Camp Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Summer Service Drive" required className="col-span-3"/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="location" className="text-right">Location</Label>
                    <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Margao Town Hall" required className="col-span-3"/>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="date" className="text-right">Date</Label>
                    <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                {date ? format(date, "dd/MM/yyyy") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <DayPicker 
                                mode="single" 
                                selected={date} 
                                onSelect={(d) => { setDate(d); setIsDatePopoverOpen(false); }} 
                                initialFocus 
                                fromDate={minDate} 
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                 <div className="grid grid-cols-4 items-start gap-4 pt-2">
                    <Label className="text-right pt-2">Assign VLEs</Label>
                    <div className="col-span-3 space-y-2">
                        <Popover open={isVlePopoverOpen} onOpenChange={setIsVlePopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between"
                                >
                                    {assignedVles.length > 0 ? `${assignedVles.length} VLE(s) assigned` : "Select VLEs..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <div className="p-2">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                        <Input 
                                            placeholder="Search VLEs..." 
                                            value={vleSearch}
                                            onChange={(e) => setVleSearch(e.target.value)}
                                            className="pl-8"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[200px] overflow-y-auto">
                                    {filteredVles.length > 0 ? (
                                        filteredVles.map((vle) => {
                                            const isSelected = assignedVles.some(s => s.id === vle.id);
                                            return (
                                                <div 
                                                    key={vle.id} 
                                                    className="flex items-center space-x-2 p-2 cursor-pointer hover:bg-accent"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        toggleVleSelection(vle);
                                                    }}
                                                >
                                                    <Checkbox
                                                        id={`vle-${vle.id}`}
                                                        checked={isSelected}
                                                        readOnly
                                                        tabIndex={-1}
                                                    />
                                                    <Label htmlFor={`vle-${vle.id}`} className="font-normal cursor-pointer">
                                                        {vle.name} ({vle.location})
                                                    </Label>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <p className="p-4 text-center text-sm text-muted-foreground">No available VLEs found.</p>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                        <div className="flex flex-wrap gap-1">
                            {assignedVles.map(vle => {
                                const status = camp?.assignedVles.find(av => av.vleId === vle.id)?.status || 'pending';
                                const variant = status === 'accepted' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary';
                                return (
                                    <Badge key={vle.id} variant={variant} className="flex items-center gap-1">
                                        {vle.name} ({status})
                                        <button
                                            type="button"
                                            className="ml-1 rounded-full hover:bg-muted-foreground/20"
                                            onClick={() => setAssignedVles(assignedVles.filter(s => s.id !== vle.id))}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </form>
        <DialogFooter>
            <Button type="submit" disabled={loading} form="camp-form">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {camp ? 'Save Changes' : (suggestion ? 'Approve & Create Camp' : 'Create Camp')}
            </Button>
        </DialogFooter>
        </DialogContent>
    );
};


export const SuggestCampDialog = ({ onFinished, services, userProfile }: { onFinished: () => void; services: Service[], userProfile: VLEProfile | GovernmentProfile }) => {
    const { toast } = useToast();
    const [location, setLocation] = useState('');
    const [date, setDate] = useState<Date | undefined>();
    const [loading, setLoading] = useState(false);
    
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [otherServices, setOtherServices] = useState('');
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

    const minDate = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        d.setHours(0,0,0,0);
        return d;
    }, []);
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!date || !userProfile) {
            toast({ title: "Missing Information", description: "Please select a date and ensure you are logged in.", variant: "destructive" });
            setLoading(false);
            return;
        }

        const suggestionData: Omit<CampSuggestion, 'id'> = {
            location,
            date: date.toISOString(),
            suggestedBy: {
                id: userProfile.id,
                name: userProfile.name,
            },
            services: selectedServices.map(s => s.name),
            otherServices: otherServices.trim(),
        };

        try {
            await addDoc(collection(db, "campSuggestions"), suggestionData);
            await createNotificationForAdmins('New Camp Suggested', `${userProfile.name} suggested a camp at ${location}.`);
            toast({ title: 'Suggestion Sent!', description: 'Your camp suggestion has been sent to the admin for review.' });
            onFinished();
        } catch (error: any) {
            console.error("Error submitting suggestion:", error);
            toast({ title: 'Error', description: error.message || 'Could not send suggestion. Please check permissions.', variant: 'destructive' });
        }
        setLoading(false);
    };

    return (
        <DialogContent className="sm:max-w-lg">
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>Suggest a New Camp</DialogTitle>
                    <DialogDescription>Fill in the details for a potential camp. An admin will review your suggestion.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="location" className="text-right">Location</Label>
                        <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Ponda Market" required className="col-span-3"/>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">Proposed Date</Label>
                        <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                    {date ? format(date, "dd/MM/yyyy") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <DayPicker 
                                    mode="single" 
                                    selected={date} 
                                    onSelect={(d) => { setDate(d); setIsDatePopoverOpen(false); }} 
                                    initialFocus 
                                    fromDate={minDate}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4 pt-2">
                        <Label className="text-right pt-2">Services</Label>
                        <div className="col-span-3">
                            <Card>
                                <CardContent className="p-4 space-y-2 max-h-48 overflow-y-auto">
                                    {services.filter(s => s.customerRate > 0 || s.isVariable).map((service) => (
                                        <div key={service.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`service-${service.id}`}
                                                checked={selectedServices.some(s => s.id === service.id)}
                                                onCheckedChange={(checked) => {
                                                    setSelectedServices(prev => 
                                                        checked 
                                                            ? [...prev, service]
                                                            : prev.filter(s => s.id !== service.id)
                                                    );
                                                }}
                                            />
                                            <Label htmlFor={`service-${service.id}`} className="font-normal cursor-pointer">{service.name}</Label>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                            <p className="text-xs text-muted-foreground pt-1">Select all services that will be offered.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="otherServices" className="text-right">Other</Label>
                        <Input 
                            id="otherServices" 
                            value={otherServices} 
                            onChange={(e) => setOtherServices(e.target.value)} 
                            placeholder="e.g., Blood Pressure Check"
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Suggestion
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
};

export const CampPayoutDialog = ({ camp, vles, adminProfile, onFinished }: { camp: Camp, vles: VLEProfile[], adminProfile: UserProfile, onFinished: () => void }) => {
    const { toast } = useToast();
    const [vlePayouts, setVlePayouts] = useState<{ [vleId: string]: string }>({});
    const [adminEarnings, setAdminEarnings] = useState('');
    const [loading, setLoading] = useState(false);

    const assignedVleDetails = useMemo(() => {
        return camp.assignedVles
            .filter(av => av.status === 'accepted')
            .map(av => vles.find(v => v.id === av.vleId))
            .filter((v): v is VLEProfile => !!v);
    }, [camp.assignedVles, vles]);

    const handlePayoutChange = (vleId: string, amount: string) => {
        setVlePayouts(prev => ({ ...prev, [vleId]: amount }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payoutData = Object.entries(vlePayouts).map(([vleId, amountStr]) => {
            const vleName = vles.find(v => v.id === vleId)?.name || 'Unknown VLE';
            return {
                vleId,
                vleName,
                amount: parseFloat(amountStr) || 0,
            };
        }).filter(p => p.amount > 0);

        const adminEarningsNum = parseFloat(adminEarnings) || 0;

        const result = await processCampPayout(camp.id, payoutData, adminEarningsNum, adminProfile.id);

        if (result.success) {
            toast({ title: "Success", description: result.message });
            onFinished();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setLoading(false);
    };

    return (
        <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>Process Payouts for "{camp.name}"</DialogTitle>
                    <DialogDescription>
                        Enter the payout amount for each participating VLE and record admin earnings.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                    <h4 className="font-semibold text-sm">VLE Payouts</h4>
                    {assignedVleDetails.length > 0 ? (
                        assignedVleDetails.map(vle => (
                            <div key={vle.id} className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor={`payout-${vle.id}`} className="col-span-1">{vle.name}</Label>
                                <Input
                                    id={`payout-${vle.id}`}
                                    type="number"
                                    placeholder="Amount (₹)"
                                    value={vlePayouts[vle.id] || ''}
                                    onChange={(e) => handlePayoutChange(vle.id, e.target.value)}
                                    className="col-span-2"
                                />
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No VLEs accepted the invitation for this camp.</p>
                    )}

                    <h4 className="font-semibold text-sm pt-4">Admin Earnings</h4>
                     <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="admin-earnings" className="col-span-1">Earnings (₹)</Label>
                        <Input
                            id="admin-earnings"
                            type="number"
                            placeholder="Admin Profit"
                            value={adminEarnings}
                            onChange={(e) => setAdminEarnings(e.target.value)}
                            className="col-span-2"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CircleDollarSign className="mr-2 h-4 w-4" />}
                        Submit Payouts
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
};
