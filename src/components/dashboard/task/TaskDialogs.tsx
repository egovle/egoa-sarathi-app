
'use client';

import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { db, storage } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createNotification, createNotificationForAdmins } from '@/app/actions';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, PenSquare, MessageSquarePlus, CheckCircle, UploadCloud, FileUp, FileText } from 'lucide-react';
import { validateFiles } from '@/lib/utils';
import type { VLEProfile } from '@/lib/types';

export const AssignVleDialog = ({ trigger, taskId, availableVles, onAssign }: { trigger: React.ReactNode, taskId: string, availableVles: VLEProfile[], onAssign: (vleId: string, vleName: string) => void }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [selectedVleId, setSelectedVleId] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);

    const handleAssign = async () => {
        if (!selectedVleId) {
            toast({ title: 'Select a VLE', description: 'Please select a VLE to assign the task.', variant: 'destructive' });
            return;
        }
        setIsAssigning(true);
        const vle = availableVles.find(v => v.id === selectedVleId);
        if (!vle) {
             toast({ title: 'Error', description: 'Selected VLE not found.', variant: 'destructive' });
             setIsAssigning(false);
             return;
        }
        
        try {
            await onAssign(vle.id, vle.name);
            setOpen(false);
        } catch (error) {
            console.error("Assignment failed from dialog:", error);
        } finally {
            setIsAssigning(false);
        }
    }

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setSelectedVleId('');
        }
        setOpen(isOpen);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Task {taskId.slice(-6).toUpperCase()}</DialogTitle>
                    <DialogDescription>Select an available VLE to assign this task to. Only VLEs who offer this service are shown.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Select onValueChange={setSelectedVleId} value={selectedVleId}>
                        <SelectTrigger><SelectValue placeholder="Select an available VLE" /></SelectTrigger>
                        <SelectContent>
                            {availableVles.length > 0 ? availableVles.map(vle => (
                                <SelectItem key={vle.id} value={vle.id}>{vle.name} - {vle.location}</SelectItem>
                            )) : <p className="p-4 text-sm text-muted-foreground">No VLEs available for this service.</p>}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button onClick={handleAssign} disabled={isAssigning || !selectedVleId}>
                        {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Assign VLE
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export const SetPriceDialog = ({ taskId, customerId, onPriceSet, adminId }: { taskId: string, customerId: string, onPriceSet: () => void, adminId: string }) => {
    const [open, setOpen] = useState(false);
    const [price, setPrice] = useState('');
    const { toast } = useToast();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const finalRate = parseFloat(price);
        if (isNaN(finalRate) || finalRate <= 0) {
            toast({ title: "Invalid Price", description: "Please enter a valid positive number.", variant: "destructive" });
            return;
        }

        const taskRef = doc(db, "tasks", taskId);
        const historyEntry = {
            timestamp: new Date().toISOString(),
            actorId: adminId,
            actorRole: 'Admin',
            action: 'Final Price Set',
            details: `Final price set to ₹${finalRate.toFixed(2)}.`,
        };

        try {
            await updateDoc(taskRef, {
                status: 'Awaiting Payment',
                totalPaid: finalRate,
                history: arrayUnion(historyEntry)
            });
            await createNotification(
                customerId,
                'Final Price Set for Your Task',
                `The final price for task ${taskId.slice(-6).toUpperCase()} is ₹${finalRate.toFixed(2)}. Please complete the payment.`,
                `/dashboard/task/${taskId}`
            );
            toast({ title: 'Price Set Successfully', description: 'The customer has been notified.' });
            onPriceSet();
            setPrice('');
            setOpen(false);
        } catch (error) {
            console.error("Error setting price:", error);
            toast({ title: "Error", description: "Failed to set price.", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><PenSquare />Set Final Price</Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Set Final Price</DialogTitle>
                        <DialogDescription>
                            Enter the final calculated price for this service. The customer will be notified to make the payment.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="final-price">Final Price (₹)</Label>
                        <Input
                            id="final-price"
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="e.g., 2500"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit">Notify Customer</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export const RequestInfoDialog = ({ taskId, vleId, customerId }: { taskId:string, vleId: string, customerId: string }) => {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const { toast } = useToast();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!message.trim()) {
            toast({ title: "Message required", description: "Please enter the details of what you need.", variant: "destructive" });
            return;
        }

        const taskRef = doc(db, "tasks", taskId);
        const historyEntry = {
            timestamp: new Date().toISOString(),
            actorId: vleId,
            actorRole: 'VLE',
            action: 'Information Requested',
            details: message,
        };

        try {
            await updateDoc(taskRef, {
                status: 'Awaiting Documents',
                history: arrayUnion(historyEntry)
            });
             await createNotification(
                customerId,
                'Action Required on Your Task',
                `More information has been requested for task ${taskId.slice(-6).toUpperCase()}.`,
                `/dashboard/task/${taskId}`
            );
            await createNotificationForAdmins(
                `Info Requested for Task #${taskId.slice(-6).toUpperCase()}`,
                `A VLE has requested more information from the customer.`,
                `/dashboard/task/${taskId}`
            );
            toast({ title: 'Request Sent', description: 'The customer and admins have been notified.' });
            setMessage('');
            setOpen(false);
        } catch (error) {
            console.error("Error requesting info:", error);
            toast({ title: "Error", description: "Failed to send request.", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><MessageSquarePlus />Request More Information</Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Request Additional Information</DialogTitle>
                        <DialogDescription>
                            Specify what additional documents or information are required from the customer.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="request-message" className="sr-only">Message</Label>
                        <Textarea
                            id="request-message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="e.g., 'Please upload a clearer copy of your Aadhar card and the electricity bill for the current address.'"
                            rows={5}
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit"><Send /> Send Request</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export const SubmitAcknowledgementDialog = ({ taskId, vleId, customerId }: { taskId: string, vleId: string, customerId: string }) => {
    const [open, setOpen] = useState(false);
    const [ackNumber, setAckNumber] = useState('');
    const { toast } = useToast();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!ackNumber.trim()) {
            toast({ title: "Acknowledgement number required", variant: "destructive" });
            return;
        }

        const taskRef = doc(db, "tasks", taskId);
        const historyEntry = {
            timestamp: new Date().toISOString(),
            actorId: vleId,
            actorRole: 'VLE',
            action: 'Acknowledgement Submitted',
            details: `Acknowledgement No: ${ackNumber}`,
        };

        try {
            await updateDoc(taskRef, {
                status: 'In Progress',
                acknowledgementNumber: ackNumber,
                history: arrayUnion(historyEntry)
            });
             await createNotification(
                customerId,
                'Your Task is In Progress',
                `An acknowledgement number has been submitted for task ${taskId.slice(-6).toUpperCase()}.`,
                `/dashboard/task/${taskId}`
            );
            toast({ title: 'Acknowledgement Submitted', description: 'The task is now in progress.' });
            setAckNumber('');
            setOpen(false);
        } catch (error) {
            console.error("Error submitting acknowledgement:", error);
            toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><CheckCircle />Submit Acknowledgement</Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Submit Acknowledgement</DialogTitle>
                        <DialogDescription>
                            Enter the acknowledgement number from the government portal. This will mark the task as 'In Progress'.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="ack-number">Acknowledgement Number / Details</Label>
                        <Input
                            id="ack-number"
                            value={ackNumber}
                            onChange={(e) => setAckNumber(e.target.value)}
                            placeholder="e.g., AKN123456789"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit">Submit</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export const UploadCertificateDialog = ({ taskId, vleId, customerId, onUploadComplete }: { taskId: string, vleId: string, customerId: string, onUploadComplete: () => void }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState<File | null>(null);
    const [isCertUploading, setIsCertUploading] = useState(false);
    const vleFileInputRef = useRef<HTMLInputElement>(null);

    const handleVleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const validation = validateFiles([file], ['application/pdf']); // Only allow PDF
            if (!validation.isValid) {
                toast({ title: 'Validation Error', description: validation.message, variant: 'destructive' });
                return;
            }
            setSelectedCertificate(file);
        }
    };

    const handleCertificateUpload = async () => {
        if (!selectedCertificate || !vleId) {
            toast({ title: "Cannot Upload", description: "Please select a certificate file.", variant: "destructive" });
            return;
        }
        setIsCertUploading(true);
        
        try {
            const storageRef = ref(storage, `tasks/${taskId}/certificate/${selectedCertificate.name}`);
            const metadata = { customMetadata: { uploaderId: vleId } };
            await uploadBytes(storageRef, selectedCertificate, metadata);
            const downloadURL = await getDownloadURL(storageRef);
            const finalCertificate = { name: selectedCertificate.name, url: downloadURL };

            const taskRef = doc(db, 'tasks', taskId as string);
            const historyEntry = {
                timestamp: new Date().toISOString(),
                actorId: vleId,
                actorRole: 'VLE',
                action: 'Task Completed & Certificate Uploaded',
                details: `Uploaded: ${finalCertificate.name}`,
            };
            
            await updateDoc(taskRef, {
                finalCertificate: finalCertificate,
                status: 'Completed',
                history: arrayUnion(historyEntry),
            });

            await createNotification(
                customerId,
                'Your Certificate is Ready!',
                `The final certificate for task ${String(taskId).slice(-6).toUpperCase()} is available.`,
                `/dashboard/task/${taskId}`
            );
            
            toast({ title: "Certificate Uploaded", description: "The customer has been notified and the task is now complete." });
            setOpen(false);
            onUploadComplete();
        } catch (error: any) {
            console.error("Error uploading certificate:", error);
            toast({ title: "Upload Failed", description: "There was an error uploading the certificate.", variant: "destructive" });
        } finally {
            setIsCertUploading(false);
        }
    };
    
    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setSelectedCertificate(null);
            setIsCertUploading(false);
        }
        setOpen(isOpen);
    }
    
    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button><UploadCloud /> Upload Final Certificate</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upload Final Certificate</DialogTitle>
                    <DialogDescription>Upload the final document for the customer. This will mark the task as "Completed". Only PDF files up to 1MB are allowed.</DialogDescription>
                </DialogHeader>
                 <div className="py-4 space-y-2">
                    <Button type="button" onClick={() => vleFileInputRef.current?.click()} size="sm" variant="secondary" className='w-full'>
                        <FileUp /> Choose File
                    </Button>
                    <Input id="vle-documents" type="file" onChange={handleVleFileChange} ref={vleFileInputRef} className="hidden" accept="application/pdf" />
                    {selectedCertificate && (
                        <div className="text-xs text-muted-foreground space-y-1 pt-1">
                            <p className='font-medium'>Selected file:</p>
                            <div className="flex items-center gap-2"><FileText className="h-3 w-3" /><span>{selectedCertificate.name}</span></div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={handleCertificateUpload} disabled={isCertUploading || !selectedCertificate} className='w-full'>
                        {isCertUploading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
                        Upload & Complete Task
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
