
'use client';

import { useState, type FormEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const AddBalanceRequestDialog = ({ trigger, onBalanceRequest }: { trigger: React.ReactNode, onBalanceRequest: (amount: number) => void }) => {
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
        onBalanceRequest(amountToAdd);
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
                        <DialogTitle>Add Balance to Wallet</DialogTitle>
                        <DialogDescription>
                            Please transfer funds to the details below and then create a request here. An admin will verify and credit your wallet.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 grid gap-6">
                        <Card className="bg-muted/50">
                            <CardHeader className='p-4'>
                                <CardTitle className="text-base">Payment Details</CardTitle>
                            </CardHeader>
                            <CardContent className='p-4 pt-0 text-sm space-y-2'>
                                <p><b>UPI ID:</b> admin-upi@ybl</p>
                                <p><b>Bank:</b> HDFC Bank</p>
                                <p><b>Account:</b> 1234567890</p>
                            </CardContent>
                        </Card>
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount Transferred (₹)</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="e.g., 500"
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Submit Request</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
