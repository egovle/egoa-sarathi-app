'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import AdminDashboard from '@/components/dashboard/AdminDashboard';
import VleDashboard from '@/components/dashboard/VleDashboard';
import CustomerDashboard from '@/components/dashboard/CustomerDashboard';
import GovernmentDashboard from '@/components/dashboard/GovernmentDashboard';
import ProfileView from '@/components/dashboard/ProfileView';

import type { Task, Service, UserProfile, VLEProfile, CustomerProfile, PaymentRequest } from '@/lib/types';


export default function DashboardPage() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [allUsers, setAllUsers] = useState<(VLEProfile | CustomerProfile)[]>([]);
    const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    
    const activeTab = useMemo(() => {
        const tabFromUrl = searchParams.get('tab');
        if (tabFromUrl) return tabFromUrl;
        if (userProfile?.isAdmin) return 'overview';
        return 'tasks';
    }, [searchParams, userProfile]);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);


    useEffect(() => {
        if (!user || !userProfile) {
            return;
        }

        let unsubscribers: (() => void)[] = [];
        const servicesQuery = query(collection(db, "services"), orderBy("name"));
        unsubscribers.push(onSnapshot(servicesQuery, (snapshot) => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Service));
        }));

        if (userProfile.isAdmin) {
            unsubscribers.push(onSnapshot(query(collection(db, "tasks"), orderBy("date", "desc")), (s) => setAllTasks(s.docs.map(d => ({ id: d.id, ...d.data() }) as Task))));
            
            const unsubUsers = onSnapshot(query(collection(db, "users")), (userSnapshot) => {
                 const customerData = userSnapshot.docs.map(d => ({ id: d.id, ...d.data() }) as CustomerProfile);
                 const unsubVles = onSnapshot(query(collection(db, 'vles')), (vleSnapshot) => {
                    const vleData = vleSnapshot.docs.map(d => ({ id: d.id, ...d.data() }) as VLEProfile);
                    setAllUsers([...customerData, ...vleData]);
                 });
                 unsubscribers.push(unsubVles);
            });
            unsubscribers.push(unsubUsers);
            
            unsubscribers.push(onSnapshot(query(collection(db, "paymentRequests"), where("status", "==", "pending")), (s) => setPaymentRequests(s.docs.map(d => ({ id: d.id, ...d.data() }) as PaymentRequest))));
        } else if (userProfile.role === 'vle') {
            const assignedTasksQuery = query(collection(db, "tasks"), where("assignedVleId", "==", user.uid));
            unsubscribers.push(onSnapshot(assignedTasksQuery, (snapshot) => {
                const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
                fetched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setAllTasks(fetched);
            }));

            const myLeadsQuery = query(collection(db, "tasks"), where("creatorId", "==", user.uid));
             unsubscribers.push(onSnapshot(myLeadsQuery, (snapshot) => {
                const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...d.data() }) as Task);
                // Combine with assigned tasks for a full view
                setAllTasks(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newLeads = fetched.filter(f => !existingIds.has(f.id));
                    const updatedTasks = [...prev, ...newLeads];
                    updatedTasks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    return updatedTasks;
                });
            }));
        } else if (userProfile.role === 'customer') {
            const tasksQuery = query(collection(db, "tasks"), where("creatorId", "==", user.uid));
            unsubscribers.push(onSnapshot(tasksQuery, (snapshot) => {
                 const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
                fetched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setAllTasks(fetched);
            }));
        }
        
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [user, userProfile]);

    const { vles, customers } = useMemo(() => {
        const vles: VLEProfile[] = [];
        const customers: CustomerProfile[] = [];
        allUsers.forEach(user => {
            if (user.role === 'vle') {
                vles.push(user as VLEProfile);
            } else if (user.role === 'customer') {
                customers.push(user as CustomerProfile);
            }
        });
        return { vles, customers };
    }, [allUsers]);

    if (loading || !user || !userProfile) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        )
    }

    const renderContent = () => {
        if (activeTab === 'profile') {
            return <ProfileView userId={user!.uid} profileData={userProfile} services={services} />
        }

        switch (userProfile.role) {
            case 'admin':
                return <AdminDashboard allTasks={allTasks} vles={vles} customers={customers} paymentRequests={paymentRequests} />;
            case 'vle':
                const assignedTasks = allTasks.filter(t => t.assignedVleId === user.uid);
                const myLeads = allTasks.filter(t => t.creatorId === user.uid);
                return <VleDashboard assignedTasks={assignedTasks} myLeads={myLeads} services={services} />;
            case 'customer':
                const customerTasks = allTasks.filter(t => t.creatorId === user.uid);
                return <CustomerDashboard tasks={customerTasks} services={services} />;
            case 'government':
                return <GovernmentDashboard />;
            default:
                 return (
                    <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                )
        }
    }

    return renderContent();
}
