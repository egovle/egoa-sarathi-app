
'use client';

import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Send, FileUp } from 'lucide-react';
import { validateFiles } from '@/lib/utils';


export const ComplaintResponseDialog = ({ trigger, complaint, taskId, customerId, onResponseSubmit }: { trigger: React.ReactNode, complaint: any, taskId: string, customerId: string, onResponseSubmit: (taskId: string, customerId: string, response: any) => void }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [responseText, setResponseText] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const response = {
            text: responseText,
            documents: selectedFiles.map(f => ({ name: f.name, url: '' })), // Placeholder for storage URL
            date: new Date().toISOString(),
        };
        onResponseSubmit(taskId, customerId, response);
        toast({ title: 'Response Sent', description: 'The customer has been notified.' });
        setOpen(false);
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const validation = validateFiles(files);
            if (!validation.isValid) {
                toast({ title: 'Validation Error', description: validation.message, variant: 'destructive' });
                return;
            }
            setSelectedFiles(prev => [...prev, ...files]);
        }
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setResponseText('');
            setSelectedFiles([]);
        }
        setOpen(isOpen);
    }
    
    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Respond to Complaint</DialogTitle>
                        <DialogDescription>
                            Provide a response to the customer's complaint for Task ID: {taskId.slice(-6).toUpperCase()}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 grid gap-4">
                        <div className="mt-2 text-sm bg-muted/80 p-3 rounded-md"><b>Customer's complaint:</b> "{complaint.text}"</div>
                        <Textarea id="response" value={responseText} onChange={(e) => setResponseText(e.target.value)} placeholder="Type your response here..." rows={4} required />
                        <div>
                             <Label>Attach Documents (Optional)</Label>
                             <div className="flex items-center gap-2 mt-2">
                                <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                    <FileUp className="mr-2 h-4 w-4"/> Choose Files
                                </Button>
                             </div>
                             <Input id="documents" type="file" multiple onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                            {selectedFiles.length > 0 && (
                                <div className="text-xs text-muted-foreground space-y-1 mt-2">
                                    <p className='font-medium'>Selected files:</p>
                                    {selectedFiles.map((file, i) => <p key={i}>{file.name}</p>)}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit"><Send className="mr-2 h-4 w-4" /> Send Response</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

    