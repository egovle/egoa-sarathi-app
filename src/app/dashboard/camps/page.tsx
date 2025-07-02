
'use client';

import { useState, useEffect, type FormEvent, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, runTransaction, writeBatch, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Edit, Trash, MoreHorizontal, Tent, UserPlus, ChevronsUpDown, Check, X, UserCog, CheckCircle2, XCircle, Phone, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DayPicker } from 'react-day-picker';
import "react-day-picker/dist/style.css";
import { createNotification, createNotificationForAdmins } from '@/app/dashboard/page';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';

// --- Camp Dialog Components ---

const CampFormDialog = ({ camp, suggestion, vles, onFinished }: { camp?: any; suggestion?: any; vles: any[]; onFinished: () => void; }) => {
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const initialData = camp || suggestion || {};
    
    // If it's a suggestion, create a better default name than "Suggested by..."
    const initialName = camp?.name || (suggestion ? `Goa Sarathi Camp at ${suggestion.location}`: '');

    const [name, setName] = useState(initialName);
    const [location, setLocation] = useState(initialData.location || '');
    const [date, setDate] = useState<Date | undefined>(initialData.date ? new Date(initialData.date) : undefined);
    const [loading, setLoading] = useState(false);
    
    const [assignedVles, setAssignedVles] = useState<any[]>(camp?.assignedVles || []);
    const [isVlePopoverOpen, setIsVlePopoverOpen] = useState(false);
    const [vleSearch, setVleSearch] = useState('');

    const filteredVles = useMemo(() => {
        if (!vleSearch) return vles;
        return vles.filter(vle => 
            vle.name.toLowerCase().includes(vleSearch.toLowerCase()) ||
            vle.location.toLowerCase().includes(vleSearch.toLowerCase())
        );
    }, [vles, vleSearch]);

    const minDate = useMemo(() => {
        // All new camps/suggestions must be at least 7 days in the future.
        return addDays(new Date(), 7);
    }, []);


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!date) {
            toast({ title: "Date required", description: "Please select a date for the camp.", variant: "destructive" });
            setLoading(false);
            return;
        }
        
        // Find newly assigned VLEs to notify them
        const newlyAssignedVles = assignedVles.filter(
            vle => !camp?.assignedVles?.some((av:any) => av.id === vle.id)
        );

        const campData = {
            name,
            location,
            date: date.toISOString(),
            status: 'Upcoming',
            services: initialData.services || [],
            otherServices: initialData.otherServices || '',
            assignedVles: assignedVles.map(v => ({ id: v.id, name: v.name, mobile: v.mobile, status: v.status || 'pending' })),
            vleParticipantIds: assignedVles.map(v => v.id), // For easier querying
        };

        try {
            if (camp) {
                await updateDoc(doc(db, "camps", camp.id), campData);
                toast({ title: 'Camp Updated', description: `${name} has been successfully updated.` });
            } else if (suggestion) { // Approving a suggestion
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
            } else { // Creating a new camp from scratch
                await addDoc(collection(db, "camps"), campData);
                toast({ title: 'Camp Created', description: `${name} has been successfully created.` });
            }
            
            // Notify newly assigned VLEs
            for (const vle of newlyAssignedVles) {
                await createNotification(vle.id, 'New Camp Invitation', `You have been invited to join the camp "${name}".`, '/dashboard/camps');
            }
            
            onFinished();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'An unknown error occurred.', variant: 'destructive' });
        }
        setLoading(false);
    };
    
    const toggleVleSelection = (vle: any) => {
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
        <form onSubmit={handleSubmit}>
            <DialogHeader>
                <DialogTitle>{camp ? 'Edit Camp' : (suggestion ? 'Approve & Finalize Camp' : 'Create New Camp')}</DialogTitle>
            </DialogHeader>
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
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                {date ? format(date, "dd/MM/yyyy") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <DayPicker mode="single" selected={date} onSelect={setDate} initialFocus fromDate={minDate} />
                        </PopoverContent>
                    </Popover>
                </div>
                {/* VLE Assignment */}
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
                                        <p className="p-4 text-center text-sm text-muted-foreground">No VLEs found.</p>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                        <div className="flex flex-wrap gap-1">
                            {assignedVles.map(vle => {
                                const status = vle.status || 'pending';
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
            <DialogFooter>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {camp ? 'Save Changes' : (suggestion ? 'Approve & Create Camp' : 'Create Camp')}
                </Button>
            </DialogFooter>
        </form>
    );
};

const SuggestCampDialog = ({ onFinished, services }: { onFinished: () => void; services: any[] }) => {
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const [location, setLocation] = useState('');
    const [date, setDate] = useState<Date | undefined>();
    const [loading, setLoading] = useState(false);
    
    // New state for services
    const [selectedServices, setSelectedServices] = useState<any[]>([]);
    const [otherServices, setOtherServices] = useState('');

    const minDate = addDays(new Date(), 7);
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!date || !userProfile) {
            toast({ title: "Missing Information", description: "Please select a date and ensure you are logged in.", variant: "destructive" });
            setLoading(false);
            return;
        }

        const suggestionData = {
            name: `Suggested by ${userProfile.name}`,
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
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                {date ? format(date, "dd/MM/yyyy") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <DayPicker mode="single" selected={date} onSelect={setDate} initialFocus fromDate={minDate} />
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
    );
};


// --- Main Page Component ---
export default function CampManagementPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [allCamps, setAllCamps] = useState<any[]>([]);
    const [campSuggestions, setCampSuggestions] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [vles, setVles] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSuggestFormOpen, setIsSuggestFormOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [selectedCamp, setSelectedCamp] = useState<any | null>(null);
    const [selectedSuggestion, setSelectedSuggestion] = useState<any | null>(null);

    // Effect for authorization
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    // Effect for fetching camps data
    useEffect(() => {
        setLoadingData(true);
        const campsQuery = query(collection(db, 'camps'), orderBy('date', 'asc'));

        const unsubCamps = onSnapshot(campsQuery, (snapshot) => {
             setAllCamps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
             setLoadingData(false);
        }, (error) => {
            console.error("Error fetching camps: ", error);
            setLoadingData(false);
        });
        
        return () => { unsubCamps() };

    }, []);
    
    // Effect for fetching camp suggestions & VLEs (Admins/Govt only)
    useEffect(() => {
        if (!userProfile || (userProfile.role !== 'government' && !userProfile.isAdmin)) return;

        if (userProfile.isAdmin) {
            const suggestionsQuery = query(collection(db, 'campSuggestions'), orderBy('date', 'asc'));
            const unsubSuggestions = onSnapshot(suggestionsQuery, (snapshot) => {
                setCampSuggestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }, (error) => console.error("Error fetching camp suggestions:", error));
    
            // FIX: The query that requires an index. Remove orderBy and sort on the client.
            const vlesQuery = query(collection(db, 'vles'), where('isAdmin', '==', false));
            const unsubVles = onSnapshot(vlesQuery, (snapshot) => {
                const fetchedVles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Sort client-side
                fetchedVles.sort((a, b) => a.name.localeCompare(b.name));
                setVles(fetchedVles);
            }, (error) => console.error("Error fetching VLEs:", error));
    
            return () => {
                unsubSuggestions();
                unsubVles();
            };
        } else if (userProfile.role === 'government') {
            const vlesQuery = query(collection(db, 'vles'), where('isAdmin', '==', false));
             const unsubVles = onSnapshot(vlesQuery, (snapshot) => {
                setVles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }, (error) => console.error("Error fetching VLEs:", error));
            return () => unsubVles();
        }

    }, [userProfile]);

    // Effect to fetch services for the suggestion dialog
     useEffect(() => {
        const servicesQuery = query(collection(db, "services"), orderBy("name"));
        const unsubServices = onSnapshot(servicesQuery, (snapshot) => {
            const fetchedServices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setServices(fetchedServices);
        }, (error) => console.error("Error fetching services:", error));

        return () => unsubServices();
    }, []);
    
    // --- Data Derivations ---
    const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

    const upcomingCamps = useMemo(() => allCamps.filter(c => c.date && format(new Date(c.date), 'yyyy-MM-dd') >= todayStr), [allCamps, todayStr]);
    const pastCamps = useMemo(() => allCamps.filter(c => c.date && format(new Date(c.date), 'yyyy-MM-dd') < todayStr), [allCamps, todayStr]);

    const myInvitations = useMemo(() => {
        if (userProfile?.role !== 'vle') return [];
        return allCamps.filter(camp => {
            if (!camp.date || !Array.isArray(camp.assignedVles)) {
                return false;
            }
            const isUpcoming = format(new Date(camp.date), 'yyyy-MM-dd') >= todayStr;
            if (!isUpcoming) {
                return false;
            }
            return camp.assignedVles.some(vle => vle.id === userProfile.id && vle.status === 'pending');
        });
    }, [allCamps, userProfile, todayStr]);

    const myConfirmedCamps = useMemo(() => {
        if (userProfile?.role !== 'vle') return [];
        return allCamps.filter(camp => {
            if (!camp.date || !Array.isArray(camp.assignedVles)) {
                return false;
            }
            const isUpcoming = format(new Date(camp.date), 'yyyy-MM-dd') >= todayStr;
            if (!isUpcoming) {
                 return false;
            }
            return camp.assignedVles.some(vle => vle.id === userProfile.id && vle.status === 'accepted');
        });
    }, [allCamps, userProfile, todayStr]);

    // --- Handlers ---
    const handleEdit = (camp: any) => {
        setSelectedCamp(camp);
        setIsFormOpen(true);
    };

    const handleDelete = (camp: any) => {
        setSelectedCamp(camp);
        setIsAlertOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedCamp) return;
        await deleteDoc(doc(db, "camps", selectedCamp.id));
        toast({ title: 'Camp Deleted', description: `${selectedCamp.name} has been deleted.` });
        setIsAlertOpen(false);
        setSelectedCamp(null);
    };
    
    const handleApproveSuggestion = (suggestion: any) => {
        setSelectedSuggestion(suggestion);
        setIsFormOpen(true);
    }
    
    const handleRejectSuggestion = async (suggestion: any) => {
        await deleteDoc(doc(db, "campSuggestions", suggestion.id));
        toast({ title: 'Suggestion Rejected', description: 'The suggestion has been removed.' });
         if (suggestion.suggestedBy?.id) {
            await createNotification(suggestion.suggestedBy.id, 'Camp Suggestion Update', `Your suggestion for a camp at ${suggestion.location} was not approved.`);
        }
    }
    
    const handleVleResponse = async (camp: any, newStatus: 'accepted' | 'rejected') => {
        if (!userProfile || userProfile.role !== 'vle') return;

        const campRef = doc(db, "camps", camp.id);
        try {
            await runTransaction(db, async (transaction) => {
                const campDoc = await transaction.get(campRef);
                if (!campDoc.exists()) {
                    throw "Camp does not exist!";
                }
                const campData = campDoc.data();
                const assignedVles = campData.assignedVles || [];
                const vleIndex = assignedVles.findIndex((v:any) => v.id === userProfile.id);

                if (vleIndex === -1) {
                    throw "You are not assigned to this camp.";
                }

                assignedVles[vleIndex].status = newStatus;
                transaction.update(campRef, { assignedVles });
            });
            
            toast({
                title: `Invitation ${newStatus}`,
                description: `You have ${newStatus} the invitation for the camp: ${camp.name}.`
            });
            
            await createNotificationForAdmins(
                `Camp Invitation ${newStatus}`,
                `${userProfile.name} has ${newStatus} the invitation for the camp "${camp.name}".`
            );

        } catch (error: any) {
            console.error("Error responding to invitation:", error);
            toast({
                title: 'Error',
                description: error.message || 'Could not update your status.',
                variant: 'destructive',
            });
        }
    };


    const handleFormFinished = () => {
        setIsFormOpen(false);
        setSelectedCamp(null);
        setSelectedSuggestion(null);
    }

    if (authLoading || loadingData) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!userProfile) {
        return null; // Redirect logic in useEffect handles this
    }
    
    const AdminCampTable = ({ data, title }: { data: any[], title: string }) => (
        <Card>
            {title && <CardHeader><CardTitle>{title}</CardTitle></CardHeader>}
            <CardContent className={cn(!title && 'pt-6')}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Services</TableHead>
                            <TableHead>Assigned VLEs</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length > 0 ? data.map((camp) => (
                            <TableRow key={camp.id}>
                                <TableCell className="font-medium">{camp.name}</TableCell>
                                <TableCell>{camp.location}</TableCell>
                                <TableCell>{format(new Date(camp.date), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                        {camp.services?.map((service: string) => <Badge key={service} variant="outline">{service}</Badge>)}
                                        {camp.otherServices && <Badge key="other" variant="secondary">{camp.otherServices}</Badge>}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center -space-x-2">
                                        {camp.assignedVles?.slice(0, 3).map((vle: any) => (
                                             <TooltipProvider key={vle.id}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                                                            {vle.name.charAt(0)}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{vle.name} - <span className="capitalize">{vle.status || 'pending'}</span></p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ))}
                                         {camp.assignedVles?.length > 3 && (
                                            <span className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                                                +{camp.assignedVles.length - 3}
                                            </span>
                                         )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEdit(camp)}><UserCog className="mr-2 h-4 w-4"/>Manage VLEs / Edit</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDelete(camp)} className="text-destructive focus:text-destructive"><Trash className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">No camps to display.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );

    const AdminView = () => (
        <div className="space-y-4">
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will permanently delete the "{selectedCamp?.name}" camp.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSelectedCamp(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog open={isFormOpen} onOpenChange={(open) => {
                if (!open) handleFormFinished();
                else setIsFormOpen(open);
            }}>
                <DialogContent
                    className="sm:max-w-lg"
                    onInteractOutside={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('[data-radix-popper-content-wrapper]')) {
                        e.preventDefault();
                      }
                    }}
                >
                    <CampFormDialog 
                        camp={selectedCamp} 
                        suggestion={selectedSuggestion} 
                        vles={vles} 
                        onFinished={handleFormFinished} 
                    />
                </DialogContent>
            </Dialog>

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Camp Management</h1>
                <Button onClick={() => { setSelectedCamp(null); setSelectedSuggestion(null); setIsFormOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Camp
                </Button>
            </div>
            
            <Tabs defaultValue='upcoming' className="w-full">
                <TabsList>
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="suggestions">VLE Suggestions <Badge className="ml-2">{campSuggestions.length}</Badge></TabsTrigger>
                    <TabsTrigger value="past">Past</TabsTrigger>
                </TabsList>
                <TabsContent value="upcoming" className="mt-4">
                    <AdminCampTable data={upcomingCamps} title="Upcoming Camps" />
                </TabsContent>
                <TabsContent value="suggestions" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>VLE Camp Suggestions</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Suggested By</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Services</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {campSuggestions.length > 0 ? campSuggestions.map(camp => (
                                        <TableRow key={camp.id}>
                                            <TableCell>{camp.suggestedBy?.name || 'Unknown'}</TableCell>
                                            <TableCell>{camp.location}</TableCell>
                                            <TableCell>{format(new Date(camp.date), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1 max-w-xs">
                                                    {camp.services?.map((service: string) => <Badge key={service} variant="outline">{service}</Badge>)}
                                                    {camp.otherServices && <Badge key="other" variant="secondary">{camp.otherServices}</Badge>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="outline" onClick={() => handleApproveSuggestion(camp)}><UserPlus className="mr-2 h-4 w-4" />Approve</Button>
                                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRejectSuggestion(camp)}><Trash className="mr-2 h-4 w-4" />Reject</Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={5} className="h-24 text-center">No new suggestions.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="past" className="mt-4">
                     <AdminCampTable data={pastCamps} title="Past Camps" />
                </TabsContent>
            </Tabs>
        </div>
    );
    
    const VleView = () => (
         <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Your Camps</h1>
                <Dialog open={isSuggestFormOpen} onOpenChange={setIsSuggestFormOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Suggest a Camp
                        </Button>
                    </DialogTrigger>
                        <DialogContent
                        className="sm:max-w-lg"
                    >
                        <SuggestCampDialog onFinished={() => setIsSuggestFormOpen(false)} services={services} />
                    </DialogContent>
                </Dialog>
            </div>
             <Tabs defaultValue="invitations">
                <TabsList>
                    <TabsTrigger value="invitations">Invitations <Badge className="ml-2">{myInvitations.length}</Badge></TabsTrigger>
                    <TabsTrigger value="confirmed">Confirmed Camps</TabsTrigger>
                </TabsList>
                <TabsContent value="invitations" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>New Camp Invitations</CardTitle>
                            <CardDescription>You have been invited to join the following camps. Please respond.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>Camp Name</TableHead>
                                       <TableHead>Location</TableHead>
                                       <TableHead>Date</TableHead>
                                       <TableHead className="text-right">Actions</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {myInvitations.length > 0 ? myInvitations.map(camp => (
                                       <TableRow key={camp.id}>
                                           <TableCell>{camp.name}</TableCell>
                                           <TableCell>{camp.location}</TableCell>
                                           <TableCell>{format(new Date(camp.date), 'dd/MM/yyyy')}</TableCell>
                                           <TableCell className="text-right space-x-2">
                                               <Button size="sm" variant="outline" onClick={() => handleVleResponse(camp, 'accepted')}><CheckCircle2 className="mr-2 h-4 w-4"/>Accept</Button>
                                               <Button size="sm" variant="destructive" onClick={() => handleVleResponse(camp, 'rejected')}><XCircle className="mr-2 h-4 w-4"/>Reject</Button>
                                           </TableCell>
                                       </TableRow>
                                   )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No pending invitations.</TableCell></TableRow>}
                               </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="confirmed" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Confirmed Camps</CardTitle>
                            <CardDescription>These are the upcoming camps you have confirmed your attendance for.</CardDescription>
                        </CardHeader>
                         <CardContent>
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>Camp Name</TableHead>
                                       <TableHead>Location</TableHead>
                                       <TableHead>Date</TableHead>
                                       <TableHead>Services Offered</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {myConfirmedCamps.length > 0 ? myConfirmedCamps.map(camp => (
                                       <TableRow key={camp.id}>
                                           <TableCell>{camp.name}</TableCell>
                                           <TableCell>{camp.location}</TableCell>
                                           <TableCell>{format(new Date(camp.date), 'dd/MM/yyyy')}</TableCell>
                                           <TableCell>
                                                <div className="flex flex-wrap gap-1 max-w-xs">
                                                    {camp.services?.map((service: string) => <Badge key={service} variant="outline">{service}</Badge>)}
                                                    {camp.otherServices && <Badge key="other" variant="secondary">{camp.otherServices}</Badge>}
                                                </div>
                                           </TableCell>
                                       </TableRow>
                                   )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">You have not confirmed attendance for any camps.</TableCell></TableRow>}
                               </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
             </Tabs>
         </div>
    );

    const CustomerView = () => (
         <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Upcoming Camps</h1>
            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Camp Name</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Services Offered</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {upcomingCamps.length > 0 ? upcomingCamps.map((camp) => (
                                <TableRow key={camp.id}>
                                    <TableCell className="font-medium">{camp.name.startsWith('Suggested by') ? `Goa Sarathi Camp at ${camp.location}` : camp.name}</TableCell>
                                    <TableCell>{camp.location}</TableCell>
                                    <TableCell>{format(new Date(camp.date), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-xs">
                                            {camp.services?.map((service: string) => <Badge key={service} variant="outline">{service}</Badge>)}
                                            {camp.otherServices && <Badge key="other" variant="secondary">{camp.otherServices}</Badge>}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">No upcoming camps scheduled.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
         </div>
    );

    const GovernmentView = () => (
         <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Upcoming Camps</h1>
                <Dialog open={isSuggestFormOpen} onOpenChange={setIsSuggestFormOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Suggest a Camp
                        </Button>
                    </DialogTrigger>
                        <DialogContent
                        className="sm:max-w-lg"
                    >
                        <SuggestCampDialog onFinished={() => setIsSuggestFormOpen(false)} services={services} />
                    </DialogContent>
                </Dialog>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Camp Name</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Assigned VLEs</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {upcomingCamps.length > 0 ? upcomingCamps.map((camp) => (
                                <TableRow key={camp.id}>
                                    <TableCell className="font-medium">{camp.name.startsWith('Suggested by') ? `Goa Sarathi Camp at ${camp.location}` : camp.name}</TableCell>
                                    <TableCell>{camp.location}</TableCell>
                                    <TableCell>{format(new Date(camp.date), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-2">
                                            {camp.assignedVles?.filter((vle:any) => vle.status === 'accepted').map((vle: any) => (
                                                <div key={vle.id} className="text-sm">
                                                    <p className="font-medium">{vle.name}</p>
                                                    <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3 w-3" />{vle.mobile}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">No upcoming camps scheduled.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
         </div>
    );
    
    if (userProfile.isAdmin) {
        return <AdminView />;
    }
    if (userProfile.role === 'vle') {
        return <VleView />;
    }
    if (userProfile.role === 'government') {
        return <GovernmentView />;
    }
    return <CustomerView />;
}
