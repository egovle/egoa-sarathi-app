
'use client';

import { useState, type FormEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';


const StarRating = ({ rating, setRating, readOnly = false }: { rating: number; setRating?: (rating: number) => void; readOnly?: boolean }) => {
    const fullStars = Math.floor(rating);
    return (
        <div className={cn("flex items-center gap-1", readOnly && "justify-center")}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={`h-6 w-6 ${!readOnly ? 'cursor-pointer' : ''} ${fullStars >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
                    onClick={() => !readOnly && setRating && setRating(star)}
                />
            ))}
        </div>
    );
};

export const FeedbackDialog = ({ trigger, taskId, onFeedbackSubmit }: { trigger: React.ReactNode, taskId: string, onFeedbackSubmit: (taskId: string, feedback: any) => void }) => {
    const { toast } = useToast();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [open, setOpen] = useState(false);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const newFeedback = {
            rating,
            comment,
            date: new Date().toISOString(),
        }
        onFeedbackSubmit(taskId, newFeedback);
        setOpen(false);
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setRating(0);
            setComment('');
        }
        setOpen(isOpen);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Provide Feedback</DialogTitle>
                        <DialogDescription>Rate your experience with this service request.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex justify-center">
                           <StarRating rating={rating} setRating={setRating} />
                        </div>
                        <Textarea id="feedback" value={comment} onChange={e => setComment(e.target.value)} placeholder="Any additional comments? (Optional)" rows={3} />
                    </div>
                    <DialogFooter>
                        <Button type="submit">Submit Feedback</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

    