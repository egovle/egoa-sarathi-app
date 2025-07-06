
'use client';

import { useState, useEffect, type FormEvent, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Trash } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { Service } from '@/lib/types';
import { addService, updateService } from './actions';

export const ServiceFormDialog = ({ service, parentServices, onFinished }: { service?: Service | null, parentServices: Service[], onFinished: () => void }) => {
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
        <DialogContent className="sm:max-w-lg">
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>{service ? 'Edit Service' : 'Add New Service'}</DialogTitle>
                    <DialogDescription>
                        {service ? 'Update the details for this service.' : 'Fill in the details for the new service.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
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
        </DialogContent>
    );
};
