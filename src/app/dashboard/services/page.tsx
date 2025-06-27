
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { addService, updateService, deleteService } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, Edit, Trash, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

// --- Service Form Dialog ---
const ServiceFormDialog = ({ service, onFinished }: { service?: any, onFinished: () => void }) => {
    const { toast } = useToast();
    const [name, setName] = useState(service?.name || '');
    const [rate, setRate] = useState(service?.rate || '');
    const [documents, setDocuments] = useState(service?.documents?.join(', ') || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const serviceData = {
            name,
            rate: parseFloat(rate),
            documents: documents.split(',').map(d => d.trim()).filter(d => d),
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
                <div className="space-y-2">
                    <Label htmlFor="name">Service Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., PAN Card Application" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="rate">Rate (₹)</Label>
                    <Input id="rate" type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g., 150" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="documents">Required Documents</Label>
                    <Textarea
                        id="documents"
                        value={documents}
                        onChange={(e) => setDocuments(e.target.value)}
                        placeholder="Aadhar Card, PAN Card, Photo"
                    />
                    <p className="text-xs text-muted-foreground">Enter document names separated by a comma.</p>
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
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<any | null>(null);

    useEffect(() => {
        if (authLoading) return; // Wait until auth state is resolved.

        if (!userProfile?.isAdmin) {
            toast({ title: "Access Denied", description: "You don't have permission to view this page.", variant: "destructive" });
            router.push('/dashboard');
            return;
        }

        // If we reach here, user is an admin. Fetch services.
        const q = query(collection(db, 'services'), orderBy('name'));
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
    }, [userProfile, authLoading, router, toast]);

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
    
    if (authLoading || loadingServices) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!userProfile?.isAdmin) {
        return null; // or a dedicated access denied component
    }

    return (
        <div className="space-y-4">
             <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the "{selectedService?.name}" service.
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
                 <DialogContent>
                    <ServiceFormDialog service={selectedService} onFinished={handleFormFinished} />
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Service Management</CardTitle>
                        <CardDescription>Add, edit, or remove services offered on the platform.</CardDescription>
                    </div>
                     <Button onClick={() => { setSelectedService(null); setIsFormOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Service
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Service Name</TableHead>
                                <TableHead>Rate</TableHead>
                                <TableHead>Required Documents</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {services.length > 0 ? (
                                services.map(service => (
                                    <TableRow key={service.id}>
                                        <TableCell className="font-medium">{service.name}</TableCell>
                                        <TableCell>₹{service.rate}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
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
                                    <TableCell colSpan={4} className="h-24 text-center">No services created yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
