
'use client';

import { useState, type FormEvent, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Trash } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { Service, DocumentGroup, DocumentOption, AllowedFileTypes } from '@/lib/types';
import { addService, updateService } from './actions';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

const fileTypes: AllowedFileTypes[] = ['pdf', 'png', 'jpg'];

export const ServiceFormDialog = ({ service, parentServices, prefilledParentId, onFinished }: { service?: Service | null, parentServices: Service[], prefilledParentId?: string | null, onFinished: () => void }) => {
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [customerRate, setCustomerRate] = useState('');
    const [vleRate, setVleRate] = useState('');
    const [governmentFee, setGovernmentFee] = useState('');
    const [parentId, setParentId] = useState('none');
    const [isVariable, setIsVariable] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const [documentGroups, setDocumentGroups] = useState<DocumentGroup[]>([]);
    
    useEffect(() => {
        if (service) { // Editing an existing service
            setName(service.name || '');
            setCustomerRate(service.customerRate?.toString() || '');
            setVleRate(service.vleRate?.toString() || '');
            setGovernmentFee(service.governmentFee?.toString() || '');
            setParentId(service.parentId || 'none');
            setIsVariable(service.isVariable || false);
            setDocumentGroups(service.documentGroups || []);
        } else { // Creating a NEW service (main or sub)
            // Reset all fields to default first
            setName('');
            setCustomerRate('');
            setVleRate('');
            setGovernmentFee('');
            setIsVariable(false);
            setDocumentGroups([]);
            // Then, if a parent is pre-selected, apply it.
            setParentId(prefilledParentId || 'none');
        }
    }, [service, prefilledParentId]);
    
    const isSubCategory = parentId !== 'none';

    const handleGroupChange = (index: number, field: keyof DocumentGroup, value: any) => {
        const newGroups = [...documentGroups];
        const currentGroup = { ...newGroups[index] };
    
        if (field === 'key') {
            currentGroup.key = (value as string).toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]/g, '');
        } else if (field === 'type') {
            currentGroup.type = value;
            // Reset options when type changes
            currentGroup.options = [{ key: '', label: '', type: value === 'documents' ? 'document' : 'text', isOptional: false, allowedFileTypes: ['pdf', 'png', 'jpg'] }];
        } else if (field === 'isOptional') {
            currentGroup.isOptional = value;
            // If group is optional, min required is irrelevant
            if (value) {
                currentGroup.minRequired = 0;
            }
        } else if (field === 'minRequired') {
             currentGroup.minRequired = parseInt(value, 10) || 0;
        } else {
             (currentGroup as any)[field] = value;
        }
    
        newGroups[index] = currentGroup;
        setDocumentGroups(newGroups);
    };

    const addGroup = () => {
        setDocumentGroups([...documentGroups, { key: '', label: '', isOptional: false, type: 'documents', minRequired: 1, options: [{ key: '', label: '', type: 'document', isOptional: false, allowedFileTypes: ['pdf', 'png', 'jpg'] }] }]);
    };
    
    const removeGroup = (index: number) => {
        setDocumentGroups(documentGroups.filter((_, i) => i !== index));
    };
    
    const handleOptionChange = (groupIndex: number, optionIndex: number, field: keyof DocumentOption, value: any) => {
        const newGroups = [...documentGroups];
        const group = { ...newGroups[groupIndex] };
        const newOptions = [...group.options];
        const currentOption = { ...newOptions[optionIndex] };

        if (field === 'key') {
            currentOption.key = (value as string).toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]/g, '');
        } else {
            (currentOption as any)[field] = value;
        }
        newOptions[optionIndex] = currentOption;
        group.options = newOptions;
        newGroups[groupIndex] = group;
        setDocumentGroups(newGroups);
    };

    const handleFileTypeChange = (groupIndex: number, optionIndex: number, fileType: AllowedFileTypes) => {
         const newGroups = [...documentGroups];
        const group = newGroups[groupIndex];
        const option = group.options[optionIndex];
        const currentTypes = option.allowedFileTypes || [];
        
        if(currentTypes.includes(fileType)) {
            option.allowedFileTypes = currentTypes.filter(t => t !== fileType);
        } else {
            option.allowedFileTypes = [...currentTypes, fileType];
        }
        setDocumentGroups(newGroups);
    }

    const addOption = (groupIndex: number) => {
        const newGroups = [...documentGroups];
        const group = { ...newGroups[groupIndex] };
        const newType = group.type === 'documents' ? 'document' : 'text';
        group.options.push({ key: '', label: '', type: newType, isOptional: false, allowedFileTypes: ['pdf', 'png', 'jpg'] });
        newGroups[groupIndex] = group;
        setDocumentGroups(newGroups);
    };

    const removeOption = (groupIndex: number, optionIndex: number) => {
        const newGroups = [...documentGroups];
        const group = { ...newGroups[groupIndex] };
        group.options = group.options.filter((_, i) => i !== optionIndex);
        newGroups[groupIndex] = group;
        setDocumentGroups(newGroups);
    };


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const filteredGroups = documentGroups.map(group => ({
            ...group,
            options: group.options.filter(opt => opt.key.trim() && opt.label.trim())
        })).filter(group => group.key.trim() && group.label.trim() && group.options.length > 0);
        
        const serviceData: Omit<Service, 'id'> = {
            name,
            customerRate: parseFloat(customerRate) || 0,
            vleRate: parseFloat(vleRate) || 0,
            governmentFee: parseFloat(governmentFee) || 0,
            documentGroups: filteredGroups,
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
        <DialogContent className="sm:max-w-3xl">
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

                    <Separator className="my-2" />

                    <div className="grid grid-cols-4 items-start gap-4 pt-2">
                        <Label className="text-right pt-2">Form Fields</Label>
                        <div className="col-span-3 space-y-4">
                            {documentGroups.map((group, groupIndex) => (
                                <Card key={groupIndex} className="p-4 bg-muted/50">
                                    <CardContent className="p-0 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-semibold">Group {groupIndex + 1}</h4>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeGroup(groupIndex)}>
                                                <Trash className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1"><Label>Group Label</Label><Input placeholder="e.g. Identity Proof" value={group.label} onChange={e => handleGroupChange(groupIndex, 'label', e.target.value)} required /></div>
                                            <div className="space-y-1"><Label>Group Key</Label><Input placeholder="e.g. identity_proof" value={group.key} onChange={e => handleGroupChange(groupIndex, 'key', e.target.value)} required /></div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Group Rules</Label>
                                            <div className="flex items-center space-x-4">
                                                <div className="flex items-center space-x-2">
                                                    <Switch id={`optional-${groupIndex}`} checked={group.isOptional} onCheckedChange={checked => handleGroupChange(groupIndex, 'isOptional', checked)} />
                                                    <Label htmlFor={`optional-${groupIndex}`}>Group is optional</Label>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Label htmlFor={`min-required-${groupIndex}`} className={cn(group.isOptional && 'text-muted-foreground')}>Min. Required</Label>
                                                    <Input 
                                                        id={`min-required-${groupIndex}`} 
                                                        type="number" 
                                                        className="w-20"
                                                        value={group.minRequired || 0}
                                                        onChange={(e) => handleGroupChange(groupIndex, 'minRequired', e.target.value)}
                                                        disabled={group.isOptional}
                                                        min="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Group Type</Label>
                                            <RadioGroup value={group.type} onValueChange={value => handleGroupChange(groupIndex, 'type', value)} className="flex gap-4">
                                                <div className="flex items-center space-x-2"><RadioGroupItem value="documents" id={`type-docs-${groupIndex}`} /><Label htmlFor={`type-docs-${groupIndex}`}>Document Uploads</Label></div>
                                                <div className="flex items-center space-x-2"><RadioGroupItem value="text" id={`type-text-${groupIndex}`} /><Label htmlFor={`type-text-${groupIndex}`}>Text Inputs</Label></div>
                                            </RadioGroup>
                                        </div>
                                        
                                        <Separator />

                                        <div className="space-y-2">
                                            <Label className="font-medium">Fields in this group</Label>
                                            {group.options.map((option, optionIndex) => (
                                                <div key={optionIndex} className="flex items-start gap-2 p-2 border rounded-md">
                                                    <div className="flex-1 space-y-3">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="space-y-1"><Label className="text-xs">Field Label</Label><Input placeholder="e.g. Aadhaar Card" value={option.label} onChange={e => handleOptionChange(groupIndex, optionIndex, 'label', e.target.value)} required /></div>
                                                            <div className="space-y-1"><Label className="text-xs">Field Key</Label><Input placeholder="e.g. aadhar_card" value={option.key} onChange={e => handleOptionChange(groupIndex, optionIndex, 'key', e.target.value)} required /></div>
                                                        </div>
                                                         <div className="flex items-center space-x-2 pt-1">
                                                            <Switch id={`option-optional-${groupIndex}-${optionIndex}`} checked={option.isOptional} onCheckedChange={checked => handleOptionChange(groupIndex, optionIndex, 'isOptional', checked)} />
                                                            <Label htmlFor={`option-optional-${groupIndex}-${optionIndex}`} className="text-xs font-normal">This field is optional</Label>
                                                        </div>
                                                        {group.type === 'documents' ? (
                                                            <div>
                                                                <Label className="text-xs">Allowed File Types</Label>
                                                                <div className="flex gap-4 pt-2">
                                                                    {fileTypes.map(type => (
                                                                        <div key={type} className="flex items-center space-x-2">
                                                                            <Checkbox id={`${groupIndex}-${optionIndex}-${type}`} checked={option.allowedFileTypes?.includes(type)} onCheckedChange={() => handleFileTypeChange(groupIndex, optionIndex, type)} />
                                                                            <Label htmlFor={`${groupIndex}-${optionIndex}-${type}`} className="text-xs font-normal uppercase">{type}</Label>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-1"><Label className="text-xs">Placeholder</Label><Input placeholder="e.g. Enter father's full name" value={option.placeholder || ''} onChange={e => handleOptionChange(groupIndex, optionIndex, 'placeholder', e.target.value)} /></div>
                                                        )}
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(groupIndex, optionIndex)}><Trash className="h-4 w-4" /></Button>
                                                </div>
                                            ))}
                                            <Button type="button" size="sm" variant="link" onClick={() => addOption(groupIndex)}><PlusCircle className="mr-2 h-4 w-4" /> Add Field</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={addGroup}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Field Group
                            </Button>
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
