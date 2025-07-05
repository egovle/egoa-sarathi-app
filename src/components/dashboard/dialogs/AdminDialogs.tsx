
'use client';

import { useState, type FormEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


export const AssignVleDialog = ({ trigger, taskId, availableVles, onAssign }: { trigger: React.ReactNode, taskId: string, availableVles: any[], onAssign: (taskId: string, vleId: string, vleName: string) => void }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [selectedVleId, setSelectedVleId] = useState('');

    const handleAssign = async () => {
        if (!selectedVleId) {
            toast({ title: 'Select a VLE', description: 'Please select a VLE to assign the task.', variant: 'destructive' });
            return;
        }
        const vle = availableVles.find(v => v.id === selectedVleId);
        
        try {
            await onAssign(taskId, selectedVleId, vle.name);
            toast({ title: 'Task Assigned', description: `Task ${taskId.slice(-6).toUpperCase()} has been assigned.`});
            setOpen(false);
        } catch (error) {
            console.error("Assignment failed, dialog will remain open.");
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
                    <DialogDescription>Select an available VLE to assign this task to.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Select onValueChange={setSelectedVleId} value={selectedVleId}>
                        <SelectTrigger><SelectValue placeholder="Select an available VLE" /></SelectTrigger>
                        <SelectContent>
                            {availableVles.map(vle => (
                                <SelectItem key={vle.id} value={vle.id}>{vle.name} - {vle.location}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button onClick={handleAssign}>Assign VLE</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export const AddBalanceDialog = ({ trigger, vleName, onAddBalance }: { trigger: React.ReactNode, vleName: string, onAddBalance: (amount: number) => void }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const amountToAdd = parseFloat(amount);
        if (isNaN(amountToAdd) || amountToAdd <= 0) {
            toast({ title: 'Invalid Amount', description: 'Please enter a valid positive number.', variant: 'destructive' });
            return;
        }
        onAddBalance(amountToAdd);
        toast({ title: 'Balance Added', description: `₹${amountToAdd.toFixed(2)} has been added to ${vleName}'s wallet.` });
        setOpen(false);
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setAmount('');
        }
        setOpen(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add Balance to {vleName}'s Wallet</DialogTitle>
                        <DialogDescription>Enter the amount you wish to add. This will be added to the VLE's current balance.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 grid gap-4">
                        <Label htmlFor="amount">Amount to Add (₹)</Label>
                        <Input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="e.g., 500"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit">Add Balance</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
