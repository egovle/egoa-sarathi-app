
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

import type { Task, Service, UserProfile, VLEProfile, CustomerProfile, PaymentRequest, Camp } from '@/lib/types';


export default function DashboardPage() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [tasks, setTasks] = useState<Task[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [camps, setCamps] = useState<Camp[]>([]);
    
    const activeTab = useMemo(() => {
        const tabFromUrl = searchParams.get('tab');
        if (tabFromUrl) return tabFromUrl;
        return 'overview';
    }, [searchParams]);

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
             // Admin data is now fetched inside the AdminDashboard component for scalability.
        } else if (userProfile.role === 'vle') {
            const assignedTasksQuery = query(collection(db, "tasks"), where("assignedVleId", "==", user.uid));
            unsubscribers.push(onSnapshot(assignedTasksQuery, snapshot => {
                setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task));
            }));

            const campsQuery = query(collection(db, 'camps'), orderBy('date', 'asc'));
            unsubscribers.push(onSnapshot(campsQuery, (snapshot) => {
                setCamps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Camp));
            }));
        
        } else if (userProfile.role === 'customer') {
            const tasksQuery = query(collection(db, "tasks"), where("creatorId", "==", user.uid));
            unsubscribers.push(onSnapshot(tasksQuery, (snapshot) => {
                const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
                fetchedTasks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setTasks(fetchedTasks);
            }));
        }
        
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [user, userProfile]);


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

        if (userProfile.isAdmin) {
            return <AdminDashboard />;
        }

        switch (userProfile.role) {
            case 'vle':
                return <VleDashboard assignedTasks={tasks} services={services} camps={camps} />;
            case 'customer':
                return <CustomerDashboard tasks={tasks} services={services} />;
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
