'use client';

import { useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash, MoreHorizontal, UserCog, UserPlus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createNotification } from '@/app/actions';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CampFormDialog } from './CampDialogs';
import type { Camp, CampSuggestion, VLEProfile, UserProfile } from '@/lib/types';


const AdminCampTable = ({ data, vles, onEdit, onDelete }: { data: Camp[], vles: VLEProfile[], onEdit: (camp: Camp) => void, onDelete: (camp: Camp) => void }) => (
    <Card>
        <CardContent className="pt-6">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Services</TableHead>
                        <TableHead>Assigned VLEs</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length > 0 ? data.map((camp) => (
                        <TableRow key={camp.id}>
                            <TableCell className="font-medium">{camp.type === 'suggested' ? `Goa Sarathi Camp at ${camp.location}` : camp.name}</TableCell>
                            <TableCell>{camp.location}</TableCell>
                            <TableCell>{format(new Date(camp.date), 'dd MMM yyyy')}</TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                    {camp.services?.map((service: string) => <Badge key={service} variant="outline">{service}</Badge>)}
                                    {camp.otherServices && <Badge key="other" variant="secondary">{camp.otherServices}</Badge>}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center -space-x-2">
                                    {camp.assignedVles?.slice(0, 3).map((assignedVle) => {
                                         const vleProfile = vles.find(v => v.id === assignedVle.vleId);
                                         if (!vleProfile) return null;
                                         return (
                                            <TooltipProvider key={vleProfile.id}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                                                            {vleProfile.name.charAt(0)}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{vleProfile.name} - <span className="capitalize">{assignedVle.status || 'pending'}</span></p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                         )
                                    })}
                                     {camp.assignedVles?.length > 3 && (
                                        <span className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                                            +{camp.assignedVles.length - 3}
                                        </span>
                                     )}
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onEdit(camp)}><UserCog className="mr-2 h-4 w-4"/>Manage VLEs / Edit</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onDelete(camp)} className="text-destructive focus:text-destructive"><Trash className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">No camps to display.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);


export default function AdminCampView({ allCamps, suggestions, vles, userProfile }: { allCamps: Camp[], suggestions: CampSuggestion[], vles: VLEProfile[], userProfile: UserProfile | null }) {
    const { toast } = useToast();
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);
    const [selectedSuggestion, setSelectedSuggestion] = useState<CampSuggestion | null>(null);

    const handleEdit = (camp: Camp) => {
        setSelectedCamp(camp);
        setSelectedSuggestion(null);
        setIsFormOpen(true);
    };

    const handleDelete = (camp: Camp) => {
        setSelectedCamp(camp);
        setIsAlertOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedCamp) return;
        await deleteDoc(doc(db, "camps", selectedCamp.id));
        toast({ title: 'Camp Deleted', description: `${selectedCamp.name} has been deleted.` });
        setIsAlertOpen(false);
        setSelectedCamp(null);
    };
    
    const handleApproveSuggestion = (suggestion: CampSuggestion) => {
        setSelectedSuggestion(suggestion);
        setSelectedCamp(null);
        setIsFormOpen(true);
    }
    
    const handleRejectSuggestion = async (suggestion: CampSuggestion) => {
        await deleteDoc(doc(db, "campSuggestions", suggestion.id));
        toast({ title: 'Suggestion Rejected', description: 'The suggestion has been removed.' });
         if (suggestion.suggestedBy?.id) {
            await createNotification(suggestion.suggestedBy.id, 'Camp Suggestion Update', `Your suggestion for a camp at ${suggestion.location} was not approved.`);
        }
    }

    const handleFormFinished = () => {
        setIsFormOpen(false);
        setSelectedCamp(null);
        setSelectedSuggestion(null);
    }

    const todayStr = new Date().toLocaleDateString('en-CA');
    const upcomingCamps = allCamps.filter(camp => camp.date.substring(0, 10) >= todayStr);
    const pastCamps = allCamps.filter(camp => camp.date.substring(0, 10) < todayStr).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-4">
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will permanently delete the "{selectedCamp?.name}" camp.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSelectedCamp(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog open={isFormOpen} onOpenChange={(open) => {
                if (!open) handleFormFinished();
                else setIsFormOpen(open);
            }}>
                <CampFormDialog 
                    camp={selectedCamp} 
                    suggestion={selectedSuggestion} 
                    vles={vles} 
                    adminProfile={userProfile}
                    onFinished={handleFormFinished} 
                />
            </Dialog>

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Camp Management</h1>
                <Button onClick={() => { setSelectedCamp(null); setSelectedSuggestion(null); setIsFormOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Camp
                </Button>
            </div>
            
            <Tabs defaultValue='upcoming' className="w-full">
                <TabsList>
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="suggestions">VLE Suggestions <Badge className="ml-2">{suggestions.length}</Badge></TabsTrigger>
                    <TabsTrigger value="past">Past</TabsTrigger>
                </TabsList>
                <TabsContent value="upcoming" className="mt-4">
                    <AdminCampTable data={upcomingCamps} vles={vles} onEdit={handleEdit} onDelete={handleDelete} />
                </TabsContent>
                <TabsContent value="suggestions" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>VLE Camp Suggestions</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Suggested By</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Services</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {suggestions.length > 0 ? suggestions.map(camp => (
                                        <TableRow key={camp.id}>
                                            <TableCell>{camp.suggestedBy?.name || 'Unknown'}</TableCell>
                                            <TableCell>{camp.location}</TableCell>
                                            <TableCell>{format(new Date(camp.date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1 max-w-xs">
                                                    {camp.services?.map((service: string) => <Badge key={service} variant="outline">{service}</Badge>)}
                                                    {camp.otherServices && <Badge key="other" variant="secondary">{camp.otherServices}</Badge>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="outline" onClick={() => handleApproveSuggestion(camp)}><UserPlus className="mr-2 h-4 w-4" />Approve</Button>
                                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRejectSuggestion(camp)}><Trash className="mr-2 h-4 w-4" />Reject</Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={5} className="h-24 text-center">No new suggestions.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="past" className="mt-4">
                     <AdminCampTable data={pastCamps} vles={vles} onEdit={handleEdit} onDelete={handleDelete} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
