
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
import { Loader2, PlusCircle, Edit, Trash, MoreHorizontal, Database, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { Service } from '@/lib/types';

// --- Client-side Service Functions ---

async function addService(data: Omit<Service, 'id'>) {
    try {
        await addDoc(collection(db, "services"), data);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

async function updateService(id: string, data: Partial<Omit<Service, 'id'>>) {
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
const ServiceFormDialog = ({ service, parentServices, onFinished }: { service?: Service, parentServices: Service[], onFinished: () => void }) => {
    const { toast } = useToast();
    const [name, setName] = useState(service?.name || '');
    const [customerRate, setCustomerRate] = useState(service?.customerRate?.toString() || '');
    const [vleRate, setVleRate] = useState(service?.vleRate?.toString() || '');
    const [governmentFee, setGovernmentFee] = useState(service?.governmentFee?.toString() || '');
    const [parentId, setParentId] = useState(service?.parentId || 'none');
    const [isVariable, setIsVariable] = useState(service?.isVariable || false);
    const [loading, setLoading] = useState(false);

    const initialDocs = useMemo(() => {
        if (!service?.documents) return [];
        return service.documents.map((doc: any) => {
            if (typeof doc === 'string') {
                return { key: doc.toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]/g, ''), label: doc };
            }
            return doc;
        });
    }, [service]);

    const [documents, setDocuments] = useState<{key: string; label: string}[]>(initialDocs);
    
    useEffect(() => {
        if (isVariable) {
            setCustomerRate('');
            setVleRate('');
        }
    }, [isVariable]);
    
    const isSubCategory = parentId !== 'none';

    const handleDocChange = (index: number, field: 'key' | 'label', value: string) => {
        const newDocs = [...documents];
        const currentDoc = { ...newDocs[index], [field]: value };
        if (field === 'key') {
            currentDoc.key = value.toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]/g, '');
        }
        newDocs[index] = currentDoc;
        setDocuments(newDocs);
    };

    const addDocField = () => {
        setDocuments([...documents, { key: '', label: '' }]);
    };

    const removeDocField = (index: number) => {
        setDocuments(documents.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const filteredDocuments = documents.filter(doc => doc.key.trim() && doc.label.trim());

        if (filteredDocuments.some(doc => !doc.key || !doc.label)) {
            toast({
                title: 'Invalid Document Fields',
                description: 'Both a Key and a Label are required for each document.',
                variant: 'destructive',
            });
            setLoading(false);
            return;
        }

        const serviceData: Omit<Service, 'id'> = {
            name,
            customerRate: parseFloat(customerRate) || 0,
            vleRate: parseFloat(vleRate) || 0,
            governmentFee: parseFloat(governmentFee) || 0,
            documents: filteredDocuments,
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
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
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
                    <Label className="text-right">Variable Rate</Label>
                    <div className="col-span-3 flex items-center">
                       <Switch id="isVariable" checked={isVariable} onCheckedChange={setIsVariable} />
                        <Label htmlFor="isVariable" className="ml-2 text-sm text-muted-foreground">
                            {isVariable ? 'Yes, price is determined by admin' : 'No, price is fixed'}
                        </Label>
                    </div>
                 </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="customerRate" className={cn("text-right", isVariable && "text-muted-foreground/50")}>Customer Rate (₹)</Label>
                    <Input 
                        id="customerRate" 
                        type="number" 
                        value={customerRate} 
                        onChange={(e) => setCustomerRate(e.target.value)} 
                        placeholder={isVariable ? "N/A" : "e.g., 300"}
                        required={!isVariable} 
                        disabled={isVariable}
                        className="col-span-3"
                    />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="vleRate" className={cn("text-right", isVariable && "text-muted-foreground/50")}>VLE Rate (₹)</Label>
                    <Input 
                        id="vleRate" 
                        type="number" 
                        value={vleRate} 
                        onChange={(e) => setVleRate(e.target.value)} 
                        placeholder={isVariable ? "N/A" : "e.g., 200"}
                        required={!isVariable} 
                        disabled={isVariable}
                        className="col-span-3"
                    />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="governmentFee" className="text-right">Govt. Fee (₹)</Label>
                    <Input id="governmentFee" type="number" value={governmentFee} onChange={(e) => setGovernmentFee(e.target.value)} placeholder="e.g., 107 (optional)" className="col-span-3"/>
                </div>
                 <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">Required Documents</Label>
                    <div className="col-span-3 space-y-2">
                         {documents.map((doc, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input 
                                    placeholder="Key (e.g., aadhar_card)" 
                                    value={doc.key} 
                                    onChange={(e) => handleDocChange(index, 'key', e.target.value)} 
                                    className="flex-1"
                                    required
                                />
                                <Input 
                                    placeholder="Label (e.g., Aadhaar Card)" 
                                    value={doc.label} 
                                    onChange={(e) => handleDocChange(index, 'label', e.target.value)} 
                                    className="flex-1"
                                    required
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeDocField(index)}>
                                    <Trash className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addDocField}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Document
                        </Button>
                        <p className="text-xs text-muted-foreground pt-1">The 'Key' is a unique ID for the system (no spaces). The 'Label' is what the user will see.</p>
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
    
    const [services, setServices] = useState<Service[]>([]);
    const [loadingServices, setLoadingServices] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!authLoading && userProfile && !userProfile.isAdmin) {
            toast({ title: "Access Denied", description: "You don't have permission to view this page.", variant: "destructive" });
            router.push('/dashboard');
        }
    }, [userProfile, authLoading, router, toast]);

    useEffect(() => {
        if (authLoading || !userProfile?.isAdmin) {
            if(!authLoading) setLoadingServices(false);
            return;
        }

        setLoadingServices(true);
        const q = query(collection(db, 'services'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const servicesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Service);
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
        const parents = services.filter(s => !s.parentId);
        const childServicesMap = services.reduce((acc, service) => {
            if (service.parentId) {
                if (!acc[service.parentId]) {
                    acc[service.parentId] = [];
                }
                acc[service.parentId].push(service);
            }
            return acc;
        }, {} as { [key: string]: Service[] });
        
        parents.sort((a, b) => a.name.localeCompare(b.name));
        
        const ordered = parents.reduce((acc, parent) => {
            acc.push(parent);
            if (childServicesMap[parent.id]) {
                childServicesMap[parent.id].sort((a, b) => a.name.localeCompare(b.name));
                acc.push(...childServicesMap[parent.id]);
            }
            return acc;
        }, [] as Service[]);
        
        return { orderedServices: ordered, parentServices: parents };
    }, [services]);

    const filteredServices = useMemo(() => {
        if (!searchQuery) return orderedServices;
        const query = searchQuery.toLowerCase();
        
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
    
            const batch = writeBatch(db);
            existingServicesSnapshot.docs.forEach(doc => batch.delete(doc.ref));

            seedServices.forEach(service => {
                const { id, ...serviceData } = service;
                const docRef = id ? doc(db, "services", id) : doc(collection(db, "services"));
                batch.set(docRef, serviceData);
            });
            await batch.commit();

            toast({ title: "Database Seeded", description: "Common services have been added." });
        } catch (error) {
            console.error("Error seeding database:", error);
            toast({ title: "Error", description: "Could not seed the database. Check console for details.", variant: "destructive" });
        } finally {
            setIsSeeding(false);
        }
    };


    const handleEdit = (service: Service) => {
        setSelectedService(service);
        setIsFormOpen(true);
    };

    const handleDelete = (service: Service) => {
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
                 <DialogContent className="sm:max-w-lg">
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
                                <TableHead>Service Name</TableHead>
                                <TableHead className="whitespace-nowrap">Customer Rate</TableHead>
                                <TableHead className="whitespace-nowrap">VLE Rate</TableHead>
                                <TableHead className="whitespace-nowrap">Govt. Fee</TableHead>
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
                                filteredServices.map((service) => (
                                    <TableRow key={service.id} className={!service.parentId ? 'bg-muted/50' : ''}>
                                        <TableCell className={cn("font-medium", service.parentId && 'pl-8')}>
                                            {service.name}
                                            {service.isVariable && <Badge variant="outline" className="ml-2">Variable</Badge>}
                                        </TableCell>
                                        <TableCell>
                                             {service.customerRate > 0 ? `₹${service.customerRate}` : <span className="text-muted-foreground">-</span>}
                                        </TableCell>
                                         <TableCell>
                                             {service.vleRate > 0 ? `₹${service.vleRate}` : <span className="text-muted-foreground">-</span>}
                                        </TableCell>
                                         <TableCell>
                                             {service.governmentFee > 0 ? `₹${service.governmentFee}` : <span className="text-muted-foreground">-</span>}
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
