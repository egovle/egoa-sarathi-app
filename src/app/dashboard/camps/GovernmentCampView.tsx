
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { SuggestCampDialog } from '@/components/dashboard/camps/CampDialogs';
import type { Camp, Service, GovernmentProfile, VLEProfile } from '@/lib/types';


export default function GovernmentCampView({ 
    allCamps, services, vles, userProfile,
    onNextPage, onPrevPage, isFirstPage, isLastPage
}: { 
    allCamps: Camp[], services: Service[], vles: VLEProfile[], userProfile: GovernmentProfile,
    onNextPage: () => void, onPrevPage: () => void, isFirstPage: boolean, isLastPage: boolean
}) {
    const [isSuggestFormOpen, setIsSuggestFormOpen] = useState(false);
    
    return (
     <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight">Upcoming Camps</h1>
            <Dialog open={isSuggestFormOpen} onOpenChange={setIsSuggestFormOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Suggest a Camp
                    </Button>
                </DialogTrigger>
                <SuggestCampDialog onFinished={() => setIsSuggestFormOpen(false)} services={services} userProfile={userProfile} />
            </Dialog>
        </div>
        <Card>
            <CardContent className="pt-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Camp Name</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Assigned VLEs</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {allCamps.length > 0 ? allCamps.map((camp) => (
                            <TableRow key={camp.id}>
                                <TableCell className="font-medium">{camp.name}</TableCell>
                                <TableCell>{camp.location}</TableCell>
                                <TableCell>{format(new Date(camp.date), 'dd MMM yyyy')}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-2">
                                        {camp.assignedVles?.filter((vle) => vle.status === 'accepted').map((assignedVle) => {
                                            const vleProfile = vles.find(v => v.id === assignedVle.vleId);
                                            if (!vleProfile) return null;
                                            return (
                                                <div key={vleProfile.id} className="text-sm">
                                                    <p className="font-medium">{vleProfile.name}</p>
                                                    <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3 w-3" />{vleProfile.mobile}</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">No upcoming camps scheduled.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
             <CardFooter className="flex justify-end gap-2">
                 <Button variant="outline" size="sm" onClick={onPrevPage} disabled={isFirstPage}><ChevronLeft className="mr-2 h-4 w-4"/>Previous</Button>
                 <Button variant="outline" size="sm" onClick={onNextPage} disabled={isLastPage}>Next<ChevronRight className="ml-2 h-4 w-4"/></Button>
            </CardFooter>
        </Card>
     </div>
    );
}
