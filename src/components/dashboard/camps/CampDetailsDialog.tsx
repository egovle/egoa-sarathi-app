'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Phone, Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { CampChat } from './CampChat';
import type { Camp, VLEProfile, User, UserProfile } from '@/lib/types';


export const CampDetailsDialog = ({ open, onOpenChange, camp, allVles, user, userProfile }: { open: boolean, onOpenChange: (open: boolean) => void, camp: Camp | null, allVles: VLEProfile[], user: User, userProfile: UserProfile }) => {
    
    const confirmedVles = useMemo(() => {
        if (!camp) return [];
        const confirmedVleIds = camp.assignedVles.filter(v => v.status === 'accepted').map(v => v.vleId);
        return allVles.filter(vle => confirmedVleIds.includes(vle.id));
    }, [camp, allVles]);

    if (!camp || !user || !userProfile) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle>Camp Details: {camp.name}</DialogTitle>
                    <DialogDescription>
                        Coordinate with other participants and view camp information.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden p-6 pt-2">
                    <div className="col-span-1 flex flex-col gap-4 overflow-y-auto pr-4">
                        <div>
                             <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><Users className="h-5 w-5" />Confirmed VLEs</h3>
                             <Separator />
                             <div className="space-y-3 mt-4">
                                {confirmedVles.length > 0 ? confirmedVles.map(vle => (
                                    <div key={vle.id} className="text-sm">
                                        <p className="font-medium">{vle.name}</p>
                                        <a href={`tel:${vle.mobile}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                                            <Phone className="h-3 w-3" />
                                            {vle.mobile}
                                        </a>
                                    </div>
                                )) : <p className="text-sm text-muted-foreground">No other VLEs have confirmed yet.</p>}
                            </div>
                        </div>
                    </div>
                    <div className="col-span-2 flex flex-col h-full">
                       <CampChat camp={camp} user={user} userProfile={userProfile} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
