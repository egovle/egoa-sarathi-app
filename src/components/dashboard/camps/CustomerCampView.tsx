
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Camp } from '@/lib/types';

export default function CustomerCampView({ allCamps }: { allCamps: Camp[] }) {
    const todayStr = new Date().toLocaleDateString('en-CA'); // Timezone-proof
    const upcomingCamps = allCamps.filter(camp => camp.date.substring(0, 10) >= todayStr);

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
                        {upcomingCamps.length > 0 ? upcomingCamps.map((camp) => (
                            <TableRow key={camp.id}>
                                <TableCell className="font-medium">{camp.name.startsWith('Suggested by') ? `Goa Sarathi Camp at ${camp.location}` : camp.name}</TableCell>
                                <TableCell>{camp.location}</TableCell>
                                <TableCell>{format(new Date(camp.date), 'dd/MM/yyyy')}</TableCell>
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
        </Card>
     </div>
    );
}
