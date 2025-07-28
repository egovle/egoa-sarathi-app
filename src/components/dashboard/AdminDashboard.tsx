
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, UserPlus, MoreHorizontal, Eye, GitFork, AlertTriangle, Mail, Phone, Search, Trash2, CircleDollarSign, Briefcase, Users, Users2, Wallet, Send, XCircle, ChevronLeft, ChevronRight, Download, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc, writeBatch, query, arrayUnion, getDoc, runTransaction, getDocs, where, collection, onSnapshot, orderBy, startAt, endAt, startAfter, endBefore, limit, Query, DocumentData,getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createNotification, processPayout, resetApplicationData } from '@/app/actions';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Task, VLEProfile, CustomerProfile, PaymentRequest, Complaint as ComplaintType } from '@/lib/types';


// Debounce hook
function useDebounce(value: string, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

const PAGE_SIZE = 10;

export default function AdminDashboard() {
    const { toast } = useToast();
    const { user, userProfile } = useAuth();
    
    // UI State
    const [activeTab, setActiveTab] = useState('clients');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 500);

    const [customers, setCustomers] = useState<CustomerProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'users'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as CustomerProfile);
            setCustomers(usersData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filteredCustomers = useMemo(() => {
        if (!debouncedSearch) return customers;
        return customers.filter(c => 
            c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            c.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            c.mobile.includes(debouncedSearch)
        );
    }, [customers, debouncedSearch]);


    return (
        <div className="flex flex-col h-full space-y-4">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">NUTENIQ SOLUTIONS PRIVATE LIMITED (R)</h1>
                </div>
                <div className="flex items-center gap-2">
                     <Button variant="outline">Change Client</Button>
                     <Button>Go to My Firm</Button>
                </div>
            </header>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="flex items-center">
                    <TabsList>
                        <TabsTrigger value="clients">My Clients</TabsTrigger>
                        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                        <TabsTrigger value="gst-returns">GST Returns</TabsTrigger>
                        <TabsTrigger value="reports">Reports</TabsTrigger>
                        <TabsTrigger value="jsons">JSONs</TabsTrigger>
                        <TabsTrigger value="acknowledgements">Acknowledgements</TabsTrigger>
                    </TabsList>
                    <div className="ml-auto flex items-center gap-2">
                        <RadioGroup defaultValue="password" className="flex items-center">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="password" id="r-pass" />
                                <Label htmlFor="r-pass">Password</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="otp" id="r-otp" />
                                <Label htmlFor="r-otp">OTP</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>

                <TabsContent value="clients" className="flex-1 flex flex-col mt-4">
                    <Card className="flex-1 flex flex-col">
                        <CardHeader>
                            <div className="flex flex-wrap items-center gap-4">
                               <div className="flex items-center gap-2">
                                 <Label htmlFor="enabled-disabled" className="whitespace-nowrap">Enabled/Disabled?</Label>
                                 <Select defaultValue="both">
                                     <SelectTrigger className="w-[180px]">
                                         <SelectValue placeholder="Select status" />
                                     </SelectTrigger>
                                     <SelectContent>
                                         <SelectItem value="enabled">Enabled</SelectItem>
                                         <SelectItem value="disabled">Disabled</SelectItem>
                                         <SelectItem value="both">Both</SelectItem>
                                     </SelectContent>
                                 </Select>
                               </div>
                                <div className="flex-1 min-w-[200px]">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="search"
                                            placeholder="Search..."
                                            className="pl-8 w-full"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button>Add Client</Button>
                                    <Button variant="outline">Add Bulk Clients</Button>
                                    <Button variant="outline" className="bg-green-100 border-green-300 text-green-800 hover:bg-green-200">
                                        <Download className="mr-2 h-4 w-4"/>
                                        Download Excel for Bulk Clients
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10">
                                    <TableRow>
                                        <TableHead className="w-[500px]">Client</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                        <TableHead>Account</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell></TableRow>
                                    ) : filteredCustomers.map(customer => (
                                        <TableRow key={customer.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 border-2 border-blue-500">
                                                        <Check className="h-5 w-5 text-blue-600"/>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-green-600">{customer.name}</div>
                                                        <div className="text-sm text-muted-foreground">GSTIN: {customer.id.slice(0, 15).toUpperCase()}</div>
                                                        <div className="text-sm text-muted-foreground">GSTN Portal Username: {customer.email.split('@')[0]}</div>
                                                        <div className="text-sm text-muted-foreground">Type: REGULAR</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Check className="h-4 w-4 text-green-500" />
                                                    <span className="text-green-500">GSTIN Activated</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="grid grid-cols-1 gap-2">
                                                    <Button size="sm" variant="outline">Download Certificates</Button>
                                                    <Button size="sm" variant="outline">Change GSTN Password</Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button size="sm" variant="outline">Edit Details</Button>
                                                    <Button size="sm" variant="outline">Saved Password</Button>
                                                    <Button size="sm" variant="outline" className="col-span-2">Disable Client</Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter className="justify-end border-t pt-4">
                            <p className="text-sm text-muted-foreground">TOTAL ROWS: {filteredCustomers.length}</p>
                        </CardFooter>
                    </Card>
                </TabsContent>
                <TabsContent value="dashboard"><p>Dashboard content goes here.</p></TabsContent>
                 <TabsContent value="gst-returns"><p>GST Returns content goes here.</p></TabsContent>
                 <TabsContent value="reports"><p>Reports content goes here.</p></TabsContent>
                 <TabsContent value="jsons"><p>JSONs content goes here.</p></TabsContent>
                 <TabsContent value="acknowledgements"><p>Acknowledgements content goes here.</p></TabsContent>
            </Tabs>
        </div>
    );
}
