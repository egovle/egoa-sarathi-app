
'use client';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Camp } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CustomerCampView({ 
    allCamps, onNextPage, onPrevPage, isFirstPage, isLastPage 
}: { 
    allCamps: Camp[],
    onNextPage: () => void,
    onPrevPage: () => void,
    isFirstPage: boolean,
    isLastPage: boolean
}) {

    return (
     <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Upcoming Camps</h1>
        <Card>
            <CardContent className="pt-6">
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
                        {allCamps.length > 0 ? allCamps.map((camp) => (
                            <TableRow key={camp.id}>
                                <TableCell className="font-medium">{camp.name}</TableCell>
                                <TableCell>{camp.location}</TableCell>
                                <TableCell>{format(new Date(camp.date), 'dd MMM yyyy')}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                        {camp.services?.map((service: string) => <Badge key={service} variant="outline">{service}</Badge>)}
                                        {camp.otherServices && <Badge key="other" variant="secondary">{camp.otherServices}</Badge>}
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
