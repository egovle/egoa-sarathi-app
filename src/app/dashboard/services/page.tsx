
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Edit, Trash, MoreHorizontal, Database, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Service } from '@/lib/types';
import { deleteService, seedDatabase } from './actions';
import { ServiceFormDialog } from './ServiceFormDialog';

export default function ServiceManagementPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [services, setServices] = useState<Service[]>([]);
    const [loadingServices, setLoadingServices] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [isSeedAlertOpen, setIsSeedAlertOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [prefilledParentId, setPrefilledParentId] = useState<string | null>(null);
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
        setIsSeedAlertOpen(false);
        
        const result = await seedDatabase();

        if (result.success) {
            toast({ title: "Database Seeded", description: "Common services have been added." });
        } else {
            console.error("Error seeding database:", result.error);
            toast({ title: "Error", description: "Could not seed the database. Check console for details.", variant: "destructive" });
        }
        setIsSeeding(false);
    };

    const handleAddSubCategory = (parentService: Service) => {
        setSelectedService(null);
        setPrefilledParentId(parentService.id);
        setIsFormOpen(true);
    };

    const handleEdit = (service: Service) => {
        setSelectedService(service);
        setPrefilledParentId(null);
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
        setPrefilledParentId(null);
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
                    <AlertDialogAction onClick={confirmDelete} className={cn("bg-destructive hover:bg-destructive/90")}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog open={isFormOpen} onOpenChange={(open) => {
                if (!open) {
                    handleFormFinished();
                } else {
                    setIsFormOpen(true);
                }
            }}>
                <ServiceFormDialog service={selectedService} parentServices={parentServices} prefilledParentId={prefilledParentId} onFinished={handleFormFinished} />
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
                            <Button onClick={() => { setSelectedService(null); setPrefilledParentId(null); setIsFormOpen(true); }}>
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
                                             {service.isVariable ? 'N/A' : (service.customerRate > 0 ? `₹${service.customerRate}` : <span className="text-muted-foreground">-</span>)}
                                        </TableCell>
                                         <TableCell>
                                             {service.isVariable ? 'N/A' : (service.vleRate > 0 ? `₹${service.vleRate}` : <span className="text-muted-foreground">-</span>)}
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
                                                    {!service.parentId && (
                                                        <DropdownMenuItem onClick={() => handleAddSubCategory(service)}>
                                                            <PlusCircle className="mr-2 h-4 w-4" />Add Sub-category
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem onClick={() => handleDelete(service)} className="text-destructive focus:text-destructive"><Trash className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
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
                                                <Button size="sm" onClick={() => { setSelectedService(null); setPrefilledParentId(null); setIsFormOpen(true); }}>
                                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Service
                                                </Button>

                                                <AlertDialog open={isSeedAlertOpen} onOpenChange={setIsSeedAlertOpen}>
                                                    <AlertDialogTrigger asChild>
                                                         <Button size="sm" variant="outline" disabled={isSeeding}>
                                                            {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                                                            Seed Common Services
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action will permanently delete ALL current services and replace them with the default list. This cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={handleSeedClick} className={cn("bg-destructive hover:bg-destructive/90")}>Yes, Delete and Seed</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>

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

    