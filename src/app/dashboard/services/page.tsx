
'use client';

import { useState, useEffect, type FormEvent, useMemo, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, setDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Edit, Trash2, Upload, Download, FileText, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Service, DocumentGroup, DocumentOption } from '@/lib/types';
import { bulkUploadServices } from '@/app/actions';
import * as XLSX from 'xlsx';


const ServiceForm = ({ service, onFinished, services }: { service?: Service | null, onFinished: () => void, services: Service[] }) => {
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [customerRate, setCustomerRate] = useState('');
    const [vleRate, setVleRate] = useState('');
    const [governmentFee, setGovernmentFee] = useState('');
    const [isVariable, setIsVariable] = useState(false);
    const [parentId, setParentId] = useState('none');
    const [documentGroups, setDocumentGroups] = useState<DocumentGroup[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (service) {
            setName(service.name ?? '');
            setIsVariable(service.isVariable ?? false);
            setParentId(service.parentId ?? 'none');
            setDocumentGroups(service.documentGroups ?? []);
            setCustomerRate(service.customerRate?.toString() ?? '');
            setVleRate(service.vleRate?.toString() ?? '');
            setGovernmentFee(service.governmentFee?.toString() ?? '');
        } else {
            setName('');
            setCustomerRate('');
            setVleRate('');
            setGovernmentFee('');
            setIsVariable(false);
            setParentId('none');
            setDocumentGroups([]);
        }
    }, [service]);


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const serviceData = {
            name,
            customerRate: parseFloat(customerRate) || 0,
            vleRate: parseFloat(vleRate) || 0,
            governmentFee: parseFloat(governmentFee) || 0,
            isVariable,
            parentId: parentId === 'none' ? null : parentId,
            documentGroups,
        };

        try {
            if (service) {
                await updateDoc(doc(db, "services", service.id), serviceData as any);
                toast({ title: 'Service Updated', description: 'The service has been successfully updated.' });
            } else {
                const docRef = doc(collection(db, "services"));
                await setDoc(docRef, { ...serviceData, id: docRef.id });
                toast({ title: 'Service Created', description: 'The new service has been added.' });
            }
            onFinished();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };
    
    // Document Group Management
    const addGroup = () => setDocumentGroups([...documentGroups, { key: '', label: '', isOptional: false, type: 'documents', options: [] }]);
    const removeGroup = (index: number) => setDocumentGroups(documentGroups.filter((_, i) => i !== index));
    const updateGroup = (index: number, field: keyof DocumentGroup, value: any) => {
        const newGroups = [...documentGroups];
        (newGroups[index] as any)[field] = value;
        setDocumentGroups(newGroups);
    };

    // Document Option Management
    const addOption = (groupIndex: number) => {
        const newGroups = [...documentGroups];
        newGroups[groupIndex].options.push({ key: '', label: '', type: 'document', isOptional: false });
        setDocumentGroups(newGroups);
    };
    const removeOption = (groupIndex: number, optionIndex: number) => {
        const newGroups = [...documentGroups];
        newGroups[groupIndex].options = newGroups[groupIndex].options.filter((_, i) => i !== optionIndex);
        setDocumentGroups(newGroups);
    };
    const updateOption = (groupIndex: number, optionIndex: number, field: keyof DocumentOption, value: any) => {
        const newGroups = [...documentGroups];
        (newGroups[groupIndex].options[optionIndex] as any)[field] = value;
        setDocumentGroups(newGroups);
    };


    return (
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>{service ? 'Edit Service' : 'Create New Service'}</DialogTitle>
                <DialogDescription>Fill in the details for the service.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="name">Service Name</Label>
                            <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                             <Label>Parent Category</Label>
                             <Select value={parentId} onValueChange={setParentId}>
                                <SelectTrigger><SelectValue placeholder="Select a parent (optional)"/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None (Is a Parent Category)</SelectItem>
                                    {services.filter(s => !s.parentId && s.id !== service?.id).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                             </Select>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox id="isVariable" checked={isVariable} onCheckedChange={checked => setIsVariable(!!checked)} />
                        <Label htmlFor="isVariable">Is this a variable rate service? (Admin sets price per task)</Label>
                    </div>
                    {!isVariable && (
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="customerRate">Customer Rate (₹)</Label>
                                <Input id="customerRate" type="number" value={customerRate} onChange={e => setCustomerRate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vleRate">VLE Base Rate (₹)</Label>
                                <Input id="vleRate" type="number" value={vleRate} onChange={e => setVleRate(e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="governmentFee">Government Fee (₹)</Label>
                                <Input id="governmentFee" type="number" value={governmentFee} onChange={e => setGovernmentFee(e.target.value)} />
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <h3 className="text-lg font-semibold mt-4 mb-2">Required Documents & Information</h3>
                        <div className="space-y-4">
                            {documentGroups.map((group, gIndex) => (
                                <Card key={gIndex} className="p-4 bg-muted/50">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-semibold">Group {gIndex + 1}</h4>
                                        <Button type="button" variant="destructive" size="sm" onClick={() => removeGroup(gIndex)}>Remove Group</Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input placeholder="Group Key (e.g., identity_proof)" value={group.key} onChange={e => updateGroup(gIndex, 'key', e.target.value)} />
                                        <Input placeholder="Group Label (e.g., Identity Proof)" value={group.label} onChange={e => updateGroup(gIndex, 'label', e.target.value)} />
                                        <Input placeholder="Min Required (e.g., 1)" type="number" value={group.minRequired || ''} onChange={e => updateGroup(gIndex, 'minRequired', parseInt(e.target.value) || 0)} />
                                        <Select value={group.type} onValueChange={val => updateGroup(gIndex, 'type', val)}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="documents">Documents</SelectItem>
                                                <SelectItem value="text">Text Fields</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <div className="flex items-center space-x-2"><Checkbox checked={group.isOptional} onCheckedChange={val => updateGroup(gIndex, 'isOptional', !!val)} /><Label>Is Optional Group</Label></div>
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        <h5 className="font-medium">Options</h5>
                                        {group.options.map((option, oIndex) => (
                                            <div key={oIndex} className="grid grid-cols-3 gap-2 border-t pt-2">
                                                <Input placeholder="Option Key" value={option.key} onChange={e => updateOption(gIndex, oIndex, 'key', e.target.value)} />
                                                <Input placeholder="Option Label" value={option.label} onChange={e => updateOption(gIndex, oIndex, 'label', e.target.value)} />
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2"><Checkbox checked={option.isOptional} onCheckedChange={val => updateOption(gIndex, oIndex, 'isOptional', !!val)} /><Label>Optional</Label></div>
                                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeOption(gIndex, oIndex)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </div>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" onClick={() => addOption(gIndex)}>Add Option</Button>
                                    </div>
                                </Card>
                            ))}
                            <Button type="button" onClick={addGroup} variant="secondary">Add Document/Info Group</Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onFinished}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Service
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
};

const BulkUploadDialog = ({ onFinished }: { onFinished: () => void }) => {
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDownloadTemplate = () => {
        const panCardSample = {
            id: 'pan_new_application_sample',
            name: 'New Application (Form 49A)',
            customerRate: 200,
            vleRate: 100,
            governmentFee: 107,
            isVariable: false,
            parentId: 'pan_card_services',
            documentGroups_json: JSON.stringify([
              {
                "key": "identity_proof",
                "label": "Identity Proof",
                "isOptional": false,
                "minRequired": 1,
                "type": "documents",
                "options": [{ "key": "aadhaar_card", "label": "Aadhaar Card", "type": "document", "isOptional": false }]
              },
              {
                "key": "address_proof",
                "label": "Address Proof",
                "isOptional": false,
                "minRequired": 1,
                "type": "documents",
                "options": [{ "key": "aadhaar_card_address", "label": "Aadhaar Card", "type": "document", "isOptional": false }]
              },
              {
                "key": "dob_proof",
                "label": "Date of Birth Proof",
                "isOptional": false,
                "minRequired": 1,
                "type": "documents",
                "options": [{ "key": "aadhaar_card_dob", "label": "Aadhaar Card", "type": "document", "isOptional": false }]
              },
              {
                "key": "photograph",
                "label": "Photograph",
                "isOptional": false,
                "minRequired": 1,
                "type": "documents",
                "options": [{ "key": "photo_upload", "label": "Photograph", "type": "document", "isOptional": false }]
              }
            ], null, 2),
        };
        
        const otherSample = {
             id: 'some_other_service_id',
             name: 'Some Other Service',
             customerRate: 100,
             vleRate: 80,
             governmentFee: 20,
             isVariable: false,
             parentId: 'other_services',
             documentGroups_json: '[]'
        }

        const templateData = [panCardSample, otherSample];
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Services");
        XLSX.writeFile(workbook, "services-template.xlsx");
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast({ title: "No file selected", description: "Please select an Excel file to upload.", variant: "destructive" });
            return;
        }
        setLoading(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result;
            if (content instanceof ArrayBuffer) {
                const result = await bulkUploadServices(content);
                if (result.success) {
                    toast({ title: "Upload Successful", description: result.message });
                    onFinished();
                } else {
                    toast({ title: "Upload Failed", description: result.error, variant: "destructive", duration: 7000 });
                }
            }
            setLoading(false);
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Bulk Upload Services</DialogTitle>
                <DialogDescription>
                    Use the Excel template to add or update services. The `documentGroups_json` column must contain valid, complete JSON.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label>Step 1: Download Template</Label>
                    <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                        <Download className="mr-2 h-4 w-4" /> Download Excel Template
                    </Button>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="xlsx-upload">Step 2: Upload Completed File</Label>
                    <Input id="xlsx-upload" type="file" accept=".xlsx, .xls" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
                    <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        {file ? <span className="text-foreground">{file.name}</span> : 'Choose File'}
                    </Button>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleUpload} disabled={!file || loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Upload and Process
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};


export default function ServicesPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    useEffect(() => {
        if (!authLoading && !userProfile?.isAdmin) {
            router.push('/dashboard');
        }
    }, [userProfile, authLoading, router]);

    useEffect(() => {
        const servicesQuery = query(collection(db, "services"), orderBy("name"));
        const unsubscribe = onSnapshot(servicesQuery, (snapshot) => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Service));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching services:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleEdit = (service: Service) => {
        setSelectedService(service);
        setIsFormOpen(true);
    };

    const handleCreate = () => {
        setSelectedService(null);
        setIsFormOpen(true);
    };

    const handleDelete = async (serviceId: string) => {
        if (window.confirm("Are you sure you want to delete this service?")) {
            await deleteDoc(doc(db, "services", serviceId));
            toast({ title: "Service Deleted" });
        }
    };
    
    const serviceCategories = useMemo(() => {
        const parents = services.filter(s => !s.parentId);
        return parents.map(parent => ({
            ...parent,
            children: services.filter(s => s.parentId === parent.id)
        }));
    }, [services]);

    if (authLoading || loading) {
        return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Service Management</h1>
                <div className="flex gap-2">
                    <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Bulk Actions</Button>
                        </DialogTrigger>
                        <BulkUploadDialog onFinished={() => setIsBulkUploadOpen(false)} />
                    </Dialog>
                    <Dialog open={isFormOpen} onOpenChange={(open) => {
                        if (!open) setSelectedService(null);
                        setIsFormOpen(open);
                    }}>
                        <DialogTrigger asChild>
                            <Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4" /> Create New Service</Button>
                        </DialogTrigger>
                        <ServiceForm service={selectedService} services={services} onFinished={() => setIsFormOpen(false)} />
                    </Dialog>
                </div>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Services</CardTitle>
                    <CardDescription>Manage all available services on the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" className="w-full">
                        {serviceCategories.map(category => (
                            <AccordionItem value={category.id} key={category.id}>
                                <AccordionTrigger className="font-semibold text-lg flex justify-between w-full hover:no-underline">
                                    <span>{category.name}</span>
                                    <div className="flex items-center space-x-2 mr-4 no-underline">
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(category); }}><Edit className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(category.id); }}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-2 pl-4">
                                        {category.children.length > 0 ? category.children.map(service => (
                                            <div key={service.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                                                <div>
                                                    <p className="font-medium">{service.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Cust: ₹{service.customerRate} | VLE: ₹{service.vleRate} | Govt: ₹{service.governmentFee}
                                                        {service.isVariable && <span className="text-blue-500 ml-2">(Variable)</span>}
                                                    </p>
                                                </div>
                                                <div className="space-x-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(service)}><Edit className="h-4 w-4"/></Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(service.id)}><Trash2 className="h-4 w-4"/></Button>
                                                </div>
                                            </div>
                                        )) : <p className="text-sm text-muted-foreground p-2">No sub-services in this category.</p>}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    );
}
