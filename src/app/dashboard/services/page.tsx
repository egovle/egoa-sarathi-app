
'use client';

import { useState, useEffect, type FormEvent, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { services as seedServices } from '@/lib/seed';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, Edit, Trash, MoreHorizontal, Database, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

// --- Client-side Service Functions ---

async function addService(data: { name: string; rate: number; documents: string[], parentId: string | null, isVariable: boolean }) {
    try {
        await addDoc(collection(db, "services"), data);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

async function updateService(id: string, data: { name: string; rate: number; documents: string[], parentId: string | null, isVariable: boolean }) {
    try {
        const serviceRef = doc(db, "services", id);
        await updateDoc(serviceRef, data);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

async function deleteService(id: string) {
    try {
        await deleteDoc(doc(db, "services", id));
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


// --- Service Form Dialog ---
const ServiceFormDialog = ({ service, parentServices, onFinished }: { service?: any, parentServices: any[], onFinished: () => void }) => {
    const { toast } = useToast();
    const [name, setName] = useState(service?.name || '');
    const [rate, setRate] = useState(service?.rate || '');
    const [documents, setDocuments] = useState(service?.documents?.join(', ') || '');
    const [parentId, setParentId] = useState(service?.parentId || 'none');
    const [isVariable, setIsVariable] = useState(service?.isVariable || false);
    const [loading, setLoading] = useState(false);
    
    const isSubCategory = parentId !== 'none';

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const serviceData = {
            name,
            rate: parseFloat(rate) || 0,
            documents: documents.split(',').map(d => d.trim()).filter(d => d),
            parentId: parentId === 'none' ? null : parentId,
            isVariable: isVariable
        };

        const result = service
            ? await updateService(service.id, serviceData)
            : await addService(serviceData);

        if (result.success) {
            toast({
                title: service ? 'Service Updated' : 'Service Added',
                description: `${name} has been successfully ${service ? 'updated' : 'added'}.`,
            });
            onFinished();
        } else {
            toast({
                title: 'Error',
                description: result.error || 'An unknown error occurred.',
                variant: 'destructive',
            });
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit}>
            <DialogHeader>
                <DialogTitle>{service ? 'Edit Service' : 'Add New Service'}</DialogTitle>
                <DialogDescription>
                    {service ? 'Update the details for this service.' : 'Fill in the details for the new service.'}
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="parent" className="text-right">Category</Label>
                    <div className="col-span-3">
                        <Select value={parentId} onValueChange={setParentId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Main Category (leave empty)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None (This is a Main Category)</SelectItem>
                                {parentServices.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">{isSubCategory ? 'Sub-Category Name' : 'Category Name'}</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={isSubCategory ? "e.g., New Application" : "e.g., PAN Card Services"} required className="col-span-3"/>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="rate" className="text-right">Rate (₹)</Label>
                    <Input id="rate" type="text" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g., 150 or 1000-2000" required className="col-span-3"/>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Variable Rate</Label>
                    <div className="col-span-3 flex items-center">
                       <Switch id="isVariable" checked={isVariable} onCheckedChange={setIsVariable} />
                        <Label htmlFor="isVariable" className="ml-2 text-sm text-muted-foreground">
                            {isVariable ? 'Yes, price is determined by admin' : 'No, price is fixed'}
                        </Label>
                    </div>
                 </div>
                 <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="documents" className="text-right pt-2">Required Documents</Label>
                    <div className="col-span-3">
                         <Textarea
                            id="documents"
                            value={documents}
                            onChange={(e) => setDocuments(e.target.value)}
                            placeholder="Aadhar Card, PAN Card, Photo"
                        />
                        <p className="text-xs text-muted-foreground pt-1">Enter document names separated by a comma.</p>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {service ? 'Save Changes' : 'Add Service'}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default function ServiceManagementPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [services, setServices] = useState<any[]>([]);
    const [loadingServices, setLoadingServices] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Effect for handling authorization and redirection
    useEffect(() => {
        if (!authLoading && userProfile && !userProfile.isAdmin) {
            toast({ title: "Access Denied", description: "You don't have permission to view this page.", variant: "destructive" });
            router.push('/dashboard');
        }
    }, [userProfile, authLoading, router, toast]);

    // Effect for fetching data only if user is an admin
    useEffect(() => {
        if (authLoading || !userProfile?.isAdmin) {
            if(!authLoading) setLoadingServices(false);
            return;
        }

        setLoadingServices(true);
        const q = query(collection(db, 'services'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const servicesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setServices(servicesData);
            setLoadingServices(false);
        }, (error) => {
            console.error("Error fetching services: ", error);
            toast({ title: "Error", description: "Could not fetch services.", variant: "destructive" });
            setLoadingServices(false);
        });

        return () => unsubscribe();
    }, [userProfile, authLoading, toast]);
    
    const { orderedServices, parentServices } = useMemo(() => {
        const parentServices = services.filter(s => !s.parentId);
        const childServicesMap = services.reduce((acc, service) => {
            if (service.parentId) {
                if (!acc[service.parentId]) {
                    acc[service.parentId] = [];
                }
                acc[service.parentId].push(service);
            }
            return acc;
        }, {} as { [key: string]: any[] });
        
        parentServices.sort((a, b) => a.name.localeCompare(b.name));
        
        const orderedServices = parentServices.reduce((acc, parent) => {
            acc.push(parent);
            if (childServicesMap[parent.id]) {
                childServicesMap[parent.id].sort((a, b) => a.name.localeCompare(b.name));
                acc.push(...childServicesMap[parent.id]);
            }
            return acc;
        }, [] as any[]);
        
        return { orderedServices, parentServices };
    }, [services]);

    const filteredServices = useMemo(() => {
        if (!searchQuery) return orderedServices;
        const query = searchQuery.toLowerCase();
        
        // Find parent services that match
        const matchingParentIds = services
            .filter(s => !s.parentId && s.name.toLowerCase().includes(query))
            .map(s => s.id);
        
        return orderedServices.filter(service =>
            service.name.toLowerCase().includes(query) ||
            (service.parentId && matchingParentIds.includes(service.parentId))
        );

    }, [orderedServices, services, searchQuery]);


    const handleSeedClick = async () => {
        setIsSeeding(true);
        try {
            const servicesCollectionRef = collection(db, 'services');
            const existingServicesSnapshot = await getDocs(query(servicesCollectionRef));
    
            if (existingServicesSnapshot.empty) {
                const batch = writeBatch(db);
                seedServices.forEach(service => {
                    const { id, ...serviceData } = service; // Exclude hardcoded ID from seed data
                    const docRef = id ? doc(db, "services", id) : doc(collection(db, "services"));
                    batch.set(docRef, serviceData);
                });
                await batch.commit();

                toast({ title: "Database Seeded", description: "Common services have been added." });
            } else {
                toast({ title: "Database Not Empty", description: "Services already exist. Seeding skipped." });
            }
        } catch (error) {
            console.error("Error seeding database:", error);
            toast({ title: "Error", description: "Could not seed the database. Check console for details.", variant: "destructive" });
        } finally {
            setIsSeeding(false);
        }
    };


    const handleEdit = (service: any) => {
        setSelectedService(service);
        setIsFormOpen(true);
    };

    const handleDelete = (service: any) => {
        setSelectedService(service);
        setIsAlertOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedService) return;
        const result = await deleteService(selectedService.id);
        if (result.success) {
            toast({ title: 'Service Deleted', description: `${selectedService.name} has been deleted.` });
        } else {
            toast({ title: 'Error', description: result.error || 'Could not delete service.', variant: 'destructive' });
        }
        setIsAlertOpen(false);
        setSelectedService(null);
    };

    const handleFormFinished = () => {
        setIsFormOpen(false);
        setSelectedService(null);
    }
    
    if (authLoading || (!userProfile && !authLoading)) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!userProfile?.isAdmin) {
        return null; // Redirect logic handles this, this prevents flash of content
    }

    return (
        <div className="space-y-4">
             <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the "{selectedService?.name}" service and any sub-services.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSelectedService(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog open={isFormOpen} onOpenChange={(open) => {
                if (!open) {
                    setSelectedService(null);
                }
                setIsFormOpen(open);
            }}>
                 <DialogContent className="sm:max-w-md">
                    <ServiceFormDialog service={selectedService} parentServices={parentServices} onFinished={handleFormFinished} />
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <div className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Service Management</CardTitle>
                            <CardDescription>Add, edit, or remove service categories and sub-categories.</CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search services..." 
                                    className="pl-8 w-64"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button onClick={() => { setSelectedService(null); setIsFormOpen(true); }}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add New Service
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">Sr.</TableHead>
                                <TableHead>Service Name</TableHead>
                                <TableHead>Rate</TableHead>
                                <TableHead>Required Documents</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingServices ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredServices.length > 0 ? (
                                filteredServices.map((service, index) => (
                                    <TableRow key={service.id} className={!service.parentId ? 'bg-muted/50' : ''}>
                                        <TableCell>{!service.parentId ? `${parentServices.findIndex(p => p.id === service.id) + 1}.` : ''}</TableCell>
                                        <TableCell className={cn("font-medium", service.parentId && 'pl-8')}>
                                            {service.name}
                                        </TableCell>
                                        <TableCell>
                                            {service.isVariable ? 
                                                <Badge variant="outline">Variable</Badge> : 
                                                (service.rate > 0 ? `₹${service.rate}` : <span className="text-muted-foreground">-</span>)
                                            }
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1 max-w-sm">
                                                {service.documents.map((doc: string, i: number) => (
                                                    <Badge key={i} variant="secondary">{doc}</Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEdit(service)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(service)} className="text-destructive"><Trash className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg bg-muted/50 my-4">
                                            <h3 className="text-lg font-semibold">No Services Found</h3>
                                            <p className="text-muted-foreground mt-2 mb-4 max-w-md">
                                                It looks like you don't have any services configured yet. You can add them manually or seed the database with a list of common services to get started.
                                            </p>
                                            <div className="flex flex-wrap justify-center gap-4">
                                                <Button size="sm" onClick={() => { setSelectedService(null); setIsFormOpen(true); }}>
                                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Service
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={handleSeedClick} disabled={isSeeding}>
                                                    {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                                                    Seed Common Services
                                                </Button>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
