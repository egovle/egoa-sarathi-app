
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, CheckCircle2, XCircle, MoreHorizontal, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { createNotificationForAdmins } from '@/app/actions';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SuggestCampDialog } from '@/components/dashboard/camps/CampDialogs';
import { CampDetailsDialog } from '@/components/dashboard/camps/CampDetailsDialog';
import type { Camp, Service, VLEProfile } from '@/lib/types';


export default function VleCampView({ 
    allCamps, services, userProfile, vles,
    onNextPage, onPrevPage, isFirstPage, isLastPage
}: { 
    allCamps: { invitations: Camp[], confirmed: Camp[], rejected: Camp[], past: Camp[] },
    services: Service[], userProfile: VLEProfile, vles: VLEProfile[],
    onNextPage: () => void, onPrevPage: () => void,
    isFirstPage: boolean, isLastPage: boolean
}) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isSuggestFormOpen, setIsSuggestFormOpen] = useState(false);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
    const [selectedCampForDetails, setSelectedCampForDetails] = useState<Camp | null>(null);

    const handleViewDetails = (camp: Camp) => {
        setSelectedCampForDetails(camp);
        setIsDetailsDialogOpen(true);
    };

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
                const vleIndex = assignedVles.findIndex((v) => v.vleId === userProfile.id);

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
    
    const { invitations, confirmed, rejected, past } = allCamps;
    
    return (
     <div className="space-y-6">
        {user && (
            <CampDetailsDialog 
                open={isDetailsDialogOpen}
                onOpenChange={setIsDetailsDialogOpen}
                camp={selectedCampForDetails}
                allVles={vles}
                user={user}
                userProfile={userProfile}
            />
        )}
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
                <TabsTrigger value="invitations">Invitations <Badge className="ml-2">{invitations.length}</Badge></TabsTrigger>
                <TabsTrigger value="confirmed">Confirmed Camps <Badge className="ml-2">{confirmed.length}</Badge></TabsTrigger>
                <TabsTrigger value="rejected">Rejected <Badge className="ml-2">{rejected.length}</Badge></TabsTrigger>
                <TabsTrigger value="past">Past Camps <Badge className="ml-2">{past.length}</Badge></TabsTrigger>
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
                               {invitations.length > 0 ? invitations.map(camp => (
                                   <TableRow key={camp.id}>
                                       <TableCell>{camp.name}</TableCell>
                                       <TableCell>{camp.location}</TableCell>
                                       <TableCell>{format(new Date(camp.date), 'dd MMM yyyy')}</TableCell>
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
                                   <TableHead className="text-right">Actions</TableHead>
                               </TableRow>
                           </TableHeader>
                           <TableBody>
                               {confirmed.length > 0 ? confirmed.map(camp => (
                                   <TableRow key={camp.id}>
                                       <TableCell>{camp.name}</TableCell>
                                       <TableCell>{camp.location}</TableCell>
                                       <TableCell>{format(new Date(camp.date), 'dd MMM yyyy')}</TableCell>
                                       <TableCell>
                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                                {camp.services?.map((service: string) => <Badge key={service} variant="outline">{service}</Badge>)}
                                                {camp.otherServices && <Badge key="other" variant="secondary">{camp.otherServices}</Badge>}
                                            </div>
                                       </TableCell>
                                       <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleViewDetails(camp)}>
                                                        <MessageSquare className="mr-2 h-4 w-4"/>View Details & Chat
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                       </TableCell>
                                   </TableRow>
                               )) : <TableRow><TableCell colSpan={5} className="h-24 text-center">You have not confirmed attendance for any camps.</TableCell></TableRow>}
                           </TableBody>
                       </Table>
                    </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="rejected" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Your Rejected Invitations</CardTitle>
                        <CardDescription>These are upcoming camp invitations that you have rejected.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Table>
                           <TableHeader>
                               <TableRow>
                                   <TableHead>Camp Name</TableHead>
                                   <TableHead>Location</TableHead>
                                   <TableHead>Date</TableHead>
                               </TableRow>
                           </TableHeader>
                           <TableBody>
                               {rejected.length > 0 ? rejected.map(camp => (
                                   <TableRow key={camp.id}>
                                       <TableCell>{camp.name}</TableCell>
                                       <TableCell>{camp.location}</TableCell>
                                       <TableCell>{format(new Date(camp.date), 'dd MMM yyyy')}</TableCell>
                                   </TableRow>
                               )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">You have not rejected any camp invitations.</TableCell></TableRow>}
                           </TableBody>
                       </Table>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="past" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Past Camps</CardTitle>
                        <CardDescription>A history of camps you have attended.</CardDescription>
                    </CardHeader>
                     <CardContent>
                       <Table>
                           <TableHeader>
                               <TableRow>
                                   <TableHead>Camp Name</TableHead>
                                   <TableHead>Location</TableHead>
                                   <TableHead>Date</TableHead>
                                   <TableHead>Status</TableHead>
                               </TableRow>
                           </TableHeader>
                           <TableBody>
                               {past.length > 0 ? past.map(camp => (
                                   <TableRow key={camp.id}>
                                       <TableCell>{camp.name}</TableCell>
                                       <TableCell>{camp.location}</TableCell>
                                       <TableCell>{format(new Date(camp.date), 'dd MMM yyyy')}</TableCell>
                                       <TableCell><Badge variant={camp.status === 'Paid Out' ? 'default' : 'secondary'}>{camp.status}</Badge></TableCell>
                                   </TableRow>
                               )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">You have no past camps to display.</TableCell></TableRow>}
                           </TableBody>
                       </Table>
                    </CardContent>
                     <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={onPrevPage} disabled={isFirstPage}><ChevronLeft className="mr-2 h-4 w-4"/>Previous</Button>
                        <Button variant="outline" size="sm" onClick={onNextPage} disabled={isLastPage}>Next<ChevronRight className="ml-2 h-4 w-4"/></Button>
                    </CardFooter>
                </Card>
            </TabsContent>
         </Tabs>
     </div>
    );
}
