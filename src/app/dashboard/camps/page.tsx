
'use client';

import { useState, useEffect, type FormEvent, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, where, getDocs, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Edit, Trash, MoreHorizontal, Tent, UserPlus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DayPicker } from 'react-day-picker';
import "react-day-picker/dist/style.css";
import { createNotification, createNotificationForAdmins } from '@/app/dashboard/page';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// --- Camp Dialog Components ---

const CampFormDialog = ({ camp, onFinished }: { camp?: any; onFinished: () => void; }) => {
    const { toast } = useToast();
    const [name, setName] = useState(camp?.name || '');
    const [location, setLocation] = useState(camp?.location || '');
    const [date, setDate] = useState<Date | undefined>(camp?.date ? new Date(camp.date) : undefined);
    const [loading, setLoading] = useState(false);
    
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
            status: camp?.status || 'Upcoming',
        };

        try {
            if (camp) {
                await updateDoc(doc(db, "camps", camp.id), campData);
                 toast({ title: 'Camp Updated', description: `${name} has been successfully updated.` });
            } else {
                await addDoc(collection(db, "camps"), campData);
                await createNotificationForAdmins('New Camp Created', `A new camp "${name}" has been scheduled at ${location}.`, `/dashboard/camps`);
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
    const [loading, setLoading] = useState(false);
    
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
            status: 'Suggested',
            suggestedBy: {
                id: userProfile.id,
                name: userProfile.name,
            },
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
    
    const [allCamps, setAllCamps] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSuggestFormOpen, setIsSuggestFormOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [selectedCamp, setSelectedCamp] = useState<any | null>(null);

    // Effect for authorization
    useEffect(() => {
        if (!authLoading && !userProfile) {
            router.push('/');
        }
    }, [userProfile, authLoading, router]);

    // Effect for fetching data
    useEffect(() => {
        if (!userProfile) return;

        setLoadingData(true);
        const campsQuery = query(collection(db, 'camps'), orderBy('date', 'asc'));

        const unsubCamps = onSnapshot(campsQuery, (snapshot) => {
             setAllCamps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
             setLoadingData(false);
        }, (error) => {
            console.error("Error fetching camps: ", error);
            // This toast is helpful for debugging permissions, but can be annoying.
            // toast({ title: "Error", description: "Could not fetch camps. Check Firestore rules.", variant: "destructive" });
            setLoadingData(false);
        });
        
        return () => { unsubCamps() };

    }, [userProfile, toast]);
    
    const upcomingCamps = useMemo(() => allCamps.filter(c => new Date(c.date) >= new Date() && c.status !== 'Suggested'), [allCamps]);
    const pastCamps = useMemo(() => allCamps.filter(c => new Date(c.date) < new Date()), [allCamps]);
    const suggestedCamps = useMemo(() => allCamps.filter(c => c.status === 'Suggested'), [allCamps]);


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
    
    if (!userProfile) {
        return null; // Redirect logic in useEffect handles this
    }
    
    const CampTable = ({ data, title }: { data: any[], title: string }) => (
        <Card>
            {title && <CardHeader><CardTitle>{title}</CardTitle></CardHeader>}
            <CardContent className={cn(!title && 'pt-6')}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Date</TableHead>
                             {userProfile.isAdmin && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length > 0 ? data.map((camp) => (
                            <TableRow key={camp.id}>
                                <TableCell className="font-medium">{camp.name}</TableCell>
                                <TableCell>{camp.location}</TableCell>
                                <TableCell>{new Date(camp.date).toLocaleDateString()}</TableCell>
                                {userProfile.isAdmin && (
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
                                )}
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={userProfile.isAdmin ? 4 : 3} className="h-24 text-center">No camps to display.</TableCell>
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
                if (!open) setSelectedCamp(null);
                setIsFormOpen(open);
            }}>
                <DialogContent
                    className="sm:max-w-lg"
                    onInteractOutside={(e) => {
                      const target = e.target as HTMLElement;
                      // Allow interaction with popover content
                      if (target.closest('[data-radix-popper-content-wrapper]')) {
                        e.preventDefault();
                      }
                    }}
                >
                    <CampFormDialog camp={selectedCamp} onFinished={handleFormFinished} />
                </DialogContent>
            </Dialog>

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Camp Management</h1>
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
                                            <TableCell>{camp.suggestedBy?.name}</TableCell>
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
    
    const PublicView = () => (
         <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Upcoming Camps</h1>
                {userProfile.role === 'vle' && (
                    <>
                        <Dialog open={isSuggestFormOpen} onOpenChange={setIsSuggestFormOpen}>
                             <DialogContent
                                className="sm:max-w-lg"
                                onInteractOutside={(e) => {
                                  const target = e.target as HTMLElement;
                                  if (target.closest('[data-radix-popper-content-wrapper]')) {
                                    e.preventDefault();
                                  }
                                }}
                            >
                                <SuggestCampDialog onFinished={() => setIsSuggestFormOpen(false)} />
                            </DialogContent>
                        </Dialog>
                        <Button onClick={() => setIsSuggestFormOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Suggest a Camp
                        </Button>
                    </>
                )}
            </div>
            <CampTable data={upcomingCamps} title="" />
         </div>
    );

    return userProfile.isAdmin ? <AdminView /> : <PublicView />;
}

    