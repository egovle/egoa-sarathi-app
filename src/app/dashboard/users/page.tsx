
'use client';

import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, CheckCircle, Clock, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { CustomerProfile, VLEProfile, GovernmentProfile, PaymentRequest, UserProfile } from '@/lib/types';
import { AddBalanceDialog } from '@/components/dashboard/dialogs/AdminDialogs';
import { createNotification, createNotificationForAdmins } from '@/app/actions';


type UserTypes = CustomerProfile | VLEProfile | GovernmentProfile;

const UsersTable = ({ users, onApprove, onAddBalance, userType }: { users: UserTypes[], onApprove?: (userId: string) => void, onAddBalance?: (userId: string, amount: number) => void, userType: 'vle' | 'customer' | 'government' }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Location</TableHead>
                {userType === 'vle' && <TableHead>Status</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {users.length > 0 ? users.map(user => (
                <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.mobile}</TableCell>
                    <TableCell className="max-w-xs truncate">{user.location}</TableCell>
                    {userType === 'vle' && (
                        <TableCell>
                            <Badge variant={(user as VLEProfile).status === 'Approved' ? 'default' : 'secondary'}>
                                {(user as VLEProfile).status}
                            </Badge>
                        </TableCell>
                    )}
                    <TableCell className="text-right space-x-2">
                        {userType === 'vle' && (user as VLEProfile).status === 'Pending' && onApprove && (
                            <Button size="sm" onClick={() => onApprove(user.id)}><UserCheck className="mr-2 h-4 w-4"/>Approve</Button>
                        )}
                        {onAddBalance && (
                            <AddBalanceDialog 
                                trigger={<Button size="sm" variant="outline">Add Balance</Button>}
                                vleName={user.name}
                                onAddBalance={(amount) => onAddBalance(user.id, amount)}
                            />
                        )}
                    </TableCell>
                </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={userType === 'vle' ? 6 : 5} className="h-24 text-center">
                        No users found.
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
);


const PaymentRequestsTable = ({ requests, onApprove, onReject }: { requests: PaymentRequest[], onApprove: (req: PaymentRequest) => void, onReject: (reqId: string) => void }) => {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Amount (₹)</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                 {requests.length > 0 ? requests.map(req => (
                    <TableRow key={req.id}>
                        <TableCell>{req.userName}</TableCell>
                        <TableCell className="capitalize">{req.userRole}</TableCell>
                        <TableCell>{req.amount.toFixed(2)}</TableCell>
                        <TableCell>{new Date(req.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right space-x-2">
                            <Button size="sm" onClick={() => onApprove(req)}><CheckCircle className="mr-2 h-4 w-4" />Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => onReject(req.id)}><Clock className="mr-2 h-4 w-4" />Reject</Button>
                        </TableCell>
                    </TableRow>
                 )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">No pending payment requests.</TableCell>
                    </TableRow>
                 )}
            </TableBody>
        </Table>
    );
};

export default function UserManagementPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [customers, setCustomers] = useState<CustomerProfile[]>([]);
    const [vles, setVles] = useState<VLEProfile[]>([]);
    const [government, setGovernment] = useState<GovernmentProfile[]>([]);
    const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);

    const [loadingData, setLoadingData] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('vles');

    useEffect(() => {
        if (!authLoading && !userProfile?.isAdmin) {
            router.push('/dashboard');
        }
    }, [userProfile, authLoading, router]);

    useEffect(() => {
        const unsubCustomers = onSnapshot(collection(db, "users"), (snapshot) => {
            setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomerProfile)));
            setLoadingData(false);
        });
        const unsubVles = onSnapshot(collection(db, "vles"), (snapshot) => {
            setVles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VLEProfile)));
             setLoadingData(false);
        });
        const unsubGov = onSnapshot(collection(db, "government"), (snapshot) => {
            setGovernment(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GovernmentProfile)));
             setLoadingData(false);
        });
        const unsubPayments = onSnapshot(query(collection(db, "paymentRequests"), where('status', '==', 'pending')), (snapshot) => {
            setPaymentRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRequest)));
        });

        return () => { unsubCustomers(); unsubVles(); unsubGov(); unsubPayments() };
    }, []);

    const handleApproveVle = async (userId: string) => {
        const vleRef = doc(db, "vles", userId);
        try {
            await updateDoc(vleRef, { status: 'Approved', available: true });
            await createNotification(userId, 'Account Approved!', 'Your VLE account has been approved. You can now accept tasks and generate leads.');
            toast({ title: "VLE Approved", description: "The VLE has been approved and notified." });
        } catch (error) {
            toast({ title: "Error", description: "Could not approve VLE.", variant: "destructive" });
        }
    };
    
    const handleAddBalance = async (userId: string, amount: number) => {
        const user = [...vles, ...customers].find(u => u.id === userId);
        if (!user) return;
        
        const collectionName = user.role === 'vle' ? 'vles' : 'users';
        const docRef = doc(db, collectionName, userId);

        try {
            await updateDoc(docRef, { walletBalance: (user.walletBalance || 0) + amount });
            await createNotification(userId, 'Wallet Balance Added', `₹${amount.toFixed(2)} has been added to your wallet by an admin.`);
            toast({ title: "Balance Added", description: `₹${amount.toFixed(2)} added to ${user.name}'s wallet.` });
        } catch (error) {
            toast({ title: "Error", description: "Failed to add balance.", variant: "destructive" });
        }
    };
    
    const handleApprovePaymentRequest = async (req: PaymentRequest) => {
        const collectionName = req.userRole === 'vle' ? 'vles' : 'users';
        const userRef = doc(db, collectionName, req.userId);
        const reqRef = doc(db, 'paymentRequests', req.id);

        try {
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) throw new Error("User not found");
            const currentBalance = userSnap.data().walletBalance || 0;
            
            const batch = writeBatch(db);
            batch.update(userRef, { walletBalance: currentBalance + req.amount });
            batch.update(reqRef, { status: 'approved', approvedBy: userProfile?.id, approvedAt: new Date().toISOString() });
            await batch.commit();
            
            await createNotification(req.userId, 'Balance Request Approved', `Your request to add ₹${req.amount.toFixed(2)} has been approved.`);
            toast({ title: "Request Approved", description: `Balance added to ${req.userName}'s wallet.` });
        } catch (error: any) {
             toast({ title: "Error", description: error.message || "Could not approve request.", variant: "destructive" });
        }
    };
    
    const handleRejectPaymentRequest = async (reqId: string) => {
         const reqRef = doc(db, 'paymentRequests', reqId);
         await updateDoc(reqRef, { status: 'rejected' });
         toast({ title: "Request Rejected" });
    };

    const filteredData = useMemo(() => {
        let data: UserTypes[] = [];
        if (activeTab === 'customers') data = customers;
        else if (activeTab === 'vles') data = vles;
        else if (activeTab === 'government') data = government;

        if (!searchQuery) return data;
        return data.filter(user =>
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.mobile.includes(searchQuery)
        );
    }, [customers, vles, government, searchQuery, activeTab]);

    if (authLoading || loadingData) {
        return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>User Management</CardTitle>
                        <CardDescription>View, approve, and manage all users on the platform.</CardDescription>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, email, or mobile..."
                            className="pl-8 w-72"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="vles">VLEs <Badge className="ml-2">{vles.length}</Badge></TabsTrigger>
                        <TabsTrigger value="customers">Customers <Badge className="ml-2">{customers.length}</Badge></TabsTrigger>
                        <TabsTrigger value="government">Government <Badge className="ml-2">{government.length}</Badge></TabsTrigger>
                        <TabsTrigger value="payments">Payment Requests <Badge className="ml-2">{paymentRequests.length}</Badge></TabsTrigger>
                    </TabsList>
                    <TabsContent value="vles" className="mt-4">
                        <UsersTable users={filteredData as VLEProfile[]} onApprove={handleApproveVle} onAddBalance={handleAddBalance} userType="vle" />
                    </TabsContent>
                    <TabsContent value="customers" className="mt-4">
                         <UsersTable users={filteredData as CustomerProfile[]} onAddBalance={handleAddBalance} userType="customer" />
                    </TabsContent>
                    <TabsContent value="government" className="mt-4">
                         <UsersTable users={filteredData as GovernmentProfile[]} userType="government" />
                    </TabsContent>
                    <TabsContent value="payments" className="mt-4">
                        <PaymentRequestsTable requests={paymentRequests} onApprove={handleApprovePaymentRequest} onReject={handleRejectPaymentRequest} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
