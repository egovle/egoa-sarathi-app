
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createNotificationForAdmins } from '@/app/actions';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SuggestCampDialog } from './CampDialogs';
import type { Camp, Service, VLEProfile } from '@/lib/types';


export default function VleCampView({ allCamps, services, userProfile }: { allCamps: Camp[], services: Service[], userProfile: VLEProfile }) {
    const { toast } = useToast();
    const [isSuggestFormOpen, setIsSuggestFormOpen] = useState(false);

    const handleVleResponse = async (camp: Camp, newStatus: 'accepted' | 'rejected') => {
        if (!userProfile) return;

        const campRef = doc(db, "camps", camp.id);
        try {
            await runTransaction(db, async (transaction) => {
                const campDoc = await transaction.get(campRef);
                if (!campDoc.exists()) {
                    throw "Camp does not exist!";
                }
                const campData = campDoc.data() as Camp;
                const assignedVles = campData.assignedVles || [];
                const vleIndex = assignedVles.findIndex((v) => v.id === userProfile.id);

                if (vleIndex === -1) {
                    throw "You are not assigned to this camp.";
                }

                assignedVles[vleIndex].status = newStatus;
                transaction.update(campRef, { assignedVles });
            });
            
            toast({
                title: `Invitation ${newStatus}`,
                description: `You have ${newStatus} the invitation for the camp: ${camp.name}.`
            });
            
            await createNotificationForAdmins(
                `Camp Invitation ${newStatus}`,
                `${userProfile.name} has ${newStatus} the invitation for the camp "${camp.name}".`
            );

        } catch (error: any) {
            console.error("Error responding to invitation:", error);
            toast({
                title: 'Error',
                description: error.message || 'Could not update your status.',
                variant: 'destructive',
            });
        }
    };
    
    const todayStr = new Date().toLocaleDateString('en-CA'); // Timezone-proof

    const myInvitations = allCamps.filter(camp => {
        if (camp.date.substring(0, 10) < todayStr) return false;
        const myAssignment = camp.assignedVles?.find(vle => vle.id === userProfile.id);
        return myAssignment?.status === 'pending';
    });
    
    const myConfirmedCamps = allCamps.filter(camp => {
        if (camp.date.substring(0, 10) < todayStr) return false;
        const myAssignment = camp.assignedVles?.find(vle => vle.id === userProfile.id);
        return myAssignment?.status === 'accepted';
    });
    
    return (
     <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight">Your Camps</h1>
            <Dialog open={isSuggestFormOpen} onOpenChange={setIsSuggestFormOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Suggest a Camp
                    </Button>
                </DialogTrigger>
                <SuggestCampDialog onFinished={() => setIsSuggestFormOpen(false)} services={services} userProfile={userProfile} />
            </Dialog>
        </div>
         <Tabs defaultValue="invitations">
            <TabsList>
                <TabsTrigger value="invitations">Invitations <Badge className="ml-2">{myInvitations.length}</Badge></TabsTrigger>
                <TabsTrigger value="confirmed">Confirmed Camps</TabsTrigger>
            </TabsList>
            <TabsContent value="invitations" className="mt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>New Camp Invitations</CardTitle>
                        <CardDescription>You have been invited to join the following camps. Please respond.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Table>
                           <TableHeader>
                               <TableRow>
                                   <TableHead>Camp Name</TableHead>
                                   <TableHead>Location</TableHead>
                                   <TableHead>Date</TableHead>
                                   <TableHead className="text-right">Actions</TableHead>
                               </TableRow>
                           </TableHeader>
                           <TableBody>
                               {myInvitations.length > 0 ? myInvitations.map(camp => (
                                   <TableRow key={camp.id}>
                                       <TableCell>{camp.name}</TableCell>
                                       <TableCell>{camp.location}</TableCell>
                                       <TableCell>{format(new Date(camp.date), 'dd/MM/yyyy')}</TableCell>
                                       <TableCell className="text-right space-x-2">
                                           <Button size="sm" variant="outline" onClick={() => handleVleResponse(camp, 'accepted')}><CheckCircle2 className="mr-2 h-4 w-4"/>Accept</Button>
                                           <Button size="sm" variant="destructive" onClick={() => handleVleResponse(camp, 'rejected')}><XCircle className="mr-2 h-4 w-4"/>Reject</Button>
                                       </TableCell>
                                   </TableRow>
                               )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No pending invitations.</TableCell></TableRow>}
                           </TableBody>
                       </Table>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="confirmed" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Your Confirmed Camps</CardTitle>
                        <CardDescription>These are the upcoming camps you have confirmed your attendance for.</CardDescription>
                    </CardHeader>
                     <CardContent>
                       <Table>
                           <TableHeader>
                               <TableRow>
                                   <TableHead>Camp Name</TableHead>
                                   <TableHead>Location</TableHead>
                                   <TableHead>Date</TableHead>
                                   <TableHead>Services Offered</TableHead>
                               </TableRow>
                           </TableHeader>
                           <TableBody>
                               {myConfirmedCamps.length > 0 ? myConfirmedCamps.map(camp => (
                                   <TableRow key={camp.id}>
                                       <TableCell>{camp.name}</TableCell>
                                       <TableCell>{camp.location}</TableCell>
                                       <TableCell>{format(new Date(camp.date), 'dd/MM/yyyy')}</TableCell>
                                       <TableCell>
                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                                {camp.services?.map((service: string) => <Badge key={service} variant="outline">{service}</Badge>)}
                                                {camp.otherServices && <Badge key="other" variant="secondary">{camp.otherServices}</Badge>}
                                            </div>
                                       </TableCell>
                                   </TableRow>
                               )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">You have not confirmed attendance for any camps.</TableCell></TableRow>}
                           </TableBody>
                       </Table>
                    </CardContent>
                </Card>
            </TabsContent>
         </Tabs>
     </div>
    );
}
