
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { SuggestCampDialog } from './CampDialogs';
import type { Camp, Service, GovernmentProfile } from '@/lib/types';


export default function GovernmentCampView({ allCamps, services, userProfile }: { allCamps: Camp[], services: Service[], userProfile: GovernmentProfile }) {
    const [isSuggestFormOpen, setIsSuggestFormOpen] = useState(false);
    
    const todayStr = new Date().toLocaleDateString('en-CA');
    const upcomingCamps = allCamps.filter(camp => camp.date.substring(0, 10) >= todayStr);

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
                        {upcomingCamps.length > 0 ? upcomingCamps.map((camp) => (
                            <TableRow key={camp.id}>
                                <TableCell className="font-medium">{camp.name.startsWith('Suggested by') ? `Goa Sarathi Camp at ${camp.location}` : camp.name}</TableCell>
                                <TableCell>{camp.location}</TableCell>
                                <TableCell>{format(new Date(camp.date), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-2">
                                        {camp.assignedVles?.filter((vle) => vle.status === 'accepted').map((vle) => (
                                            <div key={vle.id} className="text-sm">
                                                <p className="font-medium">{vle.name}</p>
                                                <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3 w-3" />{vle.mobile}</p>
                                            </div>
                                        ))}
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
        </Card>
     </div>
    );
}
