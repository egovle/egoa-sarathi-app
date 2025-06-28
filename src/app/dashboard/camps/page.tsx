
'use client';

import { useState, useEffect, type FormEvent, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Edit, Trash, MoreHorizontal, Check, ChevronsUpDown, Tent, UserPlus, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { DayPicker } from 'react-day-picker';
import "react-day-picker/dist/style.css";
import { createNotification, createNotificationForAdmins } from '@/app/dashboard/page';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


// --- Multi-Select Component ---
type MultiSelectItem = {
    value: string;
    label: string;
};

const MultiSelect = ({
  options,
  selected,
  onChange,
  className,
  placeholder = "Select options...",
}: {
  options: MultiSelectItem[];
  selected: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  className?: string;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);

  const handleUnselect = (value: string) => {
    onChange(selected.filter((s) => s !== value));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between h-auto ${selected.length > 0 ? 'h-auto' : 'h-10'}`}
          onClick={() => setOpen(!open)}
        >
            <div className="flex gap-1 flex-wrap">
                {selected.length > 0 ? options
                    .filter(option => selected.includes(option.value))
                    .map(option => (
                        <Badge
                            variant="secondary"
                            key={option.value}
                            className="mr-1"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleUnselect(option.value)
                            }}
                        >
                        {option.label}
                        <span className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                         onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleUnselect(option.value);
                            }
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={() => handleUnselect(option.value)}
                        >
                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </span>
                        </Badge>
                    )) : placeholder }
            </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command className={className}>
          <CommandInput placeholder="Search..." />
          <CommandEmpty>No options found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
                {options.map((option) => (
                    <CommandItem
                    key={option.value}
                    onSelect={() => {
                        onChange(
                        selected.includes(option.value)
                            ? selected.filter((item) => item !== option.value)
                            : [...selected, option.value]
                        );
                        setOpen(true);
                    }}
                    >
                    <Check
                        className={cn(
                        "mr-2 h-4 w-4",
                        selected.includes(option.value) ? "opacity-100" : "opacity-0"
                        )}
                    />
                    {option.label}
                    </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};


// --- Camp Dialog Components ---

const CampFormDialog = ({ camp, services, vles, onFinished }: { camp?: any; services: any[]; vles: any[]; onFinished: () => void; }) => {
    const { toast } = useToast();
    const [name, setName] = useState(camp?.name || '');
    const [location, setLocation] = useState(camp?.location || '');
    const [date, setDate] = useState<Date | undefined>(camp?.date ? new Date(camp.date) : undefined);
    const [selectedServices, setSelectedServices] = useState<string[]>(camp?.servicesOffered || []);
    const [assignedVles, setAssignedVles] = useState<string[]>(camp?.assignedVleIds || []);
    const [loading, setLoading] = useState(false);
    
    const serviceOptions = services.map(s => ({ value: s.name, label: s.name }));
    const vleOptions = vles.filter(v => !v.isAdmin).map(v => ({ value: v.id, label: v.name }));

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!date) {
            toast({ title: "Date required", description: "Please select a date for the camp.", variant: "destructive" });
            setLoading(false);
            return;
        }

        const campData = {
            name,
            location,
            date: date.toISOString(),
            servicesOffered: selectedServices,
            assignedVleIds: assignedVles,
            status: camp?.status || 'Upcoming', // Default to Upcoming if new
        };

        try {
            if (camp) {
                await updateDoc(doc(db, "camps", camp.id), campData);
                 toast({ title: 'Camp Updated', description: `${name} has been successfully updated.` });
            } else {
                await addDoc(collection(db, "camps"), campData);
                toast({ title: 'Camp Created', description: `${name} has been successfully created.` });
            }
            onFinished();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'An unknown error occurred.', variant: 'destructive' });
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit}>
            <DialogHeader>
                <DialogTitle>{camp ? 'Edit Camp' : 'Create New Camp'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <DayPicker mode="single" selected={date} onSelect={setDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Services Offered</Label>
                    <div className="col-span-3">
                        <MultiSelect options={serviceOptions} selected={selectedServices} onChange={setSelectedServices} placeholder="Select services..."/>
                    </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Assign VLEs</Label>
                    <div className="col-span-3">
                         <MultiSelect options={vleOptions} selected={assignedVles} onChange={setAssignedVles} placeholder="Select VLEs..." />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {camp ? 'Save Changes' : 'Create Camp'}
                </Button>
            </DialogFooter>
        </form>
    );
};

const SuggestCampDialog = ({ onFinished }: { onFinished: () => void; }) => {
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const [location, setLocation] = useState('');
    const [date, setDate] = useState<Date | undefined>();
    const [services, setServices] = useState<string[]>([]);
    const [serviceOptions, setServiceOptions] = useState<MultiSelectItem[]>([]);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        const q = query(collection(db, 'services'));
        const unsub = onSnapshot(q, (snapshot) => {
            setServiceOptions(snapshot.docs.map(doc => ({ value: doc.data().name, label: doc.data().name })));
        });
        return () => unsub();
    }, []);

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
            servicesOffered: services,
            status: 'Suggested',
            suggestedBy: {
                id: userProfile.id,
                name: userProfile.name,
            },
            assignedVleIds: [],
        };

        try {
            await addDoc(collection(db, "camps"), suggestionData);
            await createNotificationForAdmins('New Camp Suggested', `${userProfile.name} suggested a camp at ${location}.`);
            toast({ title: 'Suggestion Sent!', description: 'Your camp suggestion has been sent to the admin for review.' });
            onFinished();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Could not send suggestion.', variant: 'destructive' });
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
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <DayPicker mode="single" selected={date} onSelect={setDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Services</Label>
                    <div className="col-span-3">
                        <MultiSelect options={serviceOptions} selected={services} onChange={setServices} placeholder="Suggest services..."/>
                    </div>
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
    const { userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [camps, setCamps] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [vles, setVles] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSuggestFormOpen, setIsSuggestFormOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [selectedCamp, setSelectedCamp] = useState<any | null>(null);

    // Effect for authorization
    useEffect(() => {
        if (!authLoading && userProfile && userProfile.role === 'customer') {
            toast({ title: "Access Denied", description: "You don't have permission to view this page.", variant: "destructive" });
            router.push('/dashboard');
        }
    }, [userProfile, authLoading, router, toast]);

    // Effect for fetching data
    useEffect(() => {
        if (authLoading || !userProfile) {
            if (!authLoading) setLoadingData(false);
            return;
        }

        if (userProfile.role === 'customer') {
            setLoadingData(false);
            return;
        }

        setLoadingData(true);

        if (userProfile.isAdmin) {
            const q = query(collection(db, 'camps'), orderBy('date', 'desc'));
            const unsubCamps = onSnapshot(q, (snapshot) => {
                setCamps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoadingData(false);
            }, (error) => {
                console.error("Error fetching admin camps: ", error);
                toast({ title: "Error", description: "Could not fetch camps.", variant: "destructive" });
                setLoadingData(false);
            });
            
            const serviceQuery = query(collection(db, 'services'));
            const unsubServices = onSnapshot(serviceQuery, (snapshot) => {
                setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            const vleQuery = query(collection(db, 'vles'));
            const unsubVles = onSnapshot(vleQuery, (snapshot) => {
                setVles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            return () => { unsubCamps(); unsubServices(); unsubVles(); };
        }

        if (userProfile.role === 'vle') {
            // Parallel listeners for VLE to prevent permission errors
            const assignedQuery = query(collection(db, 'camps'), where('assignedVleIds', 'array-contains', userProfile.id));
            const upcomingQuery = query(collection(db, 'camps'), where('status', '==', 'Upcoming'));

            let assignedCamps: any[] = [];
            let upcomingCamps: any[] = [];
            let assignedListenerFired = false;
            let upcomingListenerFired = false;

            const mergeAndSetState = () => {
                if (!assignedListenerFired || !upcomingListenerFired) return;

                const allCampsById = new Map();
                assignedCamps.forEach(camp => allCampsById.set(camp.id, camp));
                upcomingCamps.forEach(camp => {
                    if (!allCampsById.has(camp.id)) {
                        allCampsById.set(camp.id, camp);
                    }
                });

                const mergedCamps = Array.from(allCampsById.values());
                mergedCamps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                
                setCamps(mergedCamps);
                setLoadingData(false);
            };
            
            const handleError = (error: Error, type: string) => {
                console.error(`Error fetching VLE camps (${type}): `, error);
                toast({ title: "Data Fetch Error", description: `Could not fetch ${type} camps.`, variant: "destructive" });
                setLoadingData(false);
            };

            const unsubAssigned = onSnapshot(assignedQuery, (snapshot) => {
                assignedCamps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                assignedListenerFired = true;
                mergeAndSetState();
            }, (err) => handleError(err, 'assigned'));
            
            const unsubUpcoming = onSnapshot(upcomingQuery, (snapshot) => {
                upcomingCamps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                upcomingListenerFired = true;
                mergeAndSetState();
            }, (err) => handleError(err, 'upcoming'));

            return () => {
                unsubAssigned();
                unsubUpcoming();
            };
        }
    }, [userProfile, authLoading, toast]);
    
    const upcomingCamps = camps.filter(c => c.status === 'Upcoming');
    const pastCamps = camps.filter(c => c.status === 'Completed' || new Date(c.date) < new Date());
    const suggestedCamps = camps.filter(c => c.status === 'Suggested');

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

    const handleApproveSuggestion = async (suggestion: any) => {
        const campRef = doc(db, 'camps', suggestion.id);
        await updateDoc(campRef, { status: 'Upcoming' });
        toast({ title: 'Suggestion Approved', description: 'The camp is now listed as upcoming.' });
    }

    const handleFormFinished = () => {
        setIsFormOpen(false);
        setSelectedCamp(null);
    }

    if (authLoading || loadingData) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!userProfile || userProfile.role === 'customer') {
        return null;
    }

    const CampTable = ({ data, title }: { data: any[], title: string }) => (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Assigned VLEs</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length > 0 ? data.map((camp) => {
                             const assignedVleNames = vles
                                .filter(v => camp.assignedVleIds?.includes(v.id))
                                .map(v => v.name)
                                .join(', ');

                            return (
                                <TableRow key={camp.id}>
                                    <TableCell className="font-medium">{camp.name}</TableCell>
                                    <TableCell>{camp.location}</TableCell>
                                    <TableCell>{new Date(camp.date).toLocaleDateString()}</TableCell>
                                     <TableCell>{assignedVleNames || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(camp)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(camp)} className="text-destructive"><Trash className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        }) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">No camps to display.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
    
    const VleCampTable = ({ data, title }: { data: any[], title: string }) => (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Services</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {data.length > 0 ? data.map(camp => (
                            <TableRow key={camp.id}>
                                <TableCell className="font-medium">{camp.name}</TableCell>
                                <TableCell>{camp.location}</TableCell>
                                <TableCell>{new Date(camp.date).toLocaleDateString()}</TableCell>
                                <TableCell className="max-w-xs">
                                    <div className="flex flex-wrap gap-1">
                                        {camp.servicesOffered.map((s: string, i: number) => <Badge key={i} variant="secondary">{s}</Badge>)}
                                    </div>
                                </TableCell>
                            </TableRow>
                         )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No camps found.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )


    // ADMIN VIEW
    if (userProfile.isAdmin) {
         return (
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
                    if (!open) setSelectedCamp(null);
                    setIsFormOpen(open);
                }}>
                    <DialogContent className="sm:max-w-lg">
                        <CampFormDialog camp={selectedCamp} services={services} vles={vles} onFinished={handleFormFinished} />
                    </DialogContent>
                </Dialog>

                <div className="flex justify-end">
                    <Button onClick={() => { setSelectedCamp(null); setIsFormOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Create New Camp
                    </Button>
                </div>
                
                <Tabs defaultValue='upcoming' className="w-full">
                    <TabsList>
                        <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                        <TabsTrigger value="suggestions">VLE Suggestions <Badge className="ml-2">{suggestedCamps.length}</Badge></TabsTrigger>
                        <TabsTrigger value="past">Past</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upcoming" className="mt-4">
                        <CampTable data={upcomingCamps} title="Upcoming Camps" />
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
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {suggestedCamps.length > 0 ? suggestedCamps.map(camp => (
                                            <TableRow key={camp.id}>
                                                <TableCell>{camp.suggestedBy.name}</TableCell>
                                                <TableCell>{camp.location}</TableCell>
                                                <TableCell>{new Date(camp.date).toLocaleDateString()}</TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button size="sm" variant="outline" onClick={() => handleApproveSuggestion(camp)}><UserPlus className="mr-2 h-4 w-4" />Approve</Button>
                                                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(camp)}><Trash className="mr-2 h-4 w-4" />Reject</Button>
                                                </TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No new suggestions.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="past" className="mt-4">
                         <CampTable data={pastCamps} title="Past Camps" />
                    </TabsContent>
                </Tabs>
            </div>
        );
    }
    
    // VLE VIEW
    if (userProfile.role === 'vle') {
        const myCamps = camps.filter(c => c.assignedVleIds?.includes(userProfile.id));
        const otherUpcomingCamps = camps.filter(c => c.status === 'Upcoming' && !c.assignedVleIds?.includes(userProfile.id));

        return (
             <div className="space-y-6">
                <Dialog open={isSuggestFormOpen} onOpenChange={setIsSuggestFormOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <SuggestCampDialog onFinished={() => setIsSuggestFormOpen(false)} />
                    </DialogContent>
                </Dialog>

                 <div className="flex justify-end">
                    <Button onClick={() => setIsSuggestFormOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Suggest a Camp
                    </Button>
                </div>
                
                <VleCampTable data={myCamps} title="Your Assigned Camps"/>
                <VleCampTable data={otherUpcomingCamps} title="Other Upcoming Camps"/>
             </div>
        )
    }

    return null;
}
