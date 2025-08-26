
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import AdminDashboard from '@/components/dashboard/AdminDashboard';
import VleDashboard from '@/components/dashboard/VleDashboard';
import CustomerDashboard from '@/components/dashboard/CustomerDashboard';
import GovernmentDashboard from '@/components/dashboard/GovernmentDashboard';
import ProfileView from '@/components/dashboard/ProfileView';

import type { Task, Service, Camp } from '@/lib/types';


export default function DashboardPage() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [tasks, setTasks] = useState<Task[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [camps, setCamps] = useState<Camp[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    
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
            setDataLoading(false);
            return;
        }

        setDataLoading(true);
        let unsubscribers: (() => void)[] = [];

        const servicesQuery = query(collection(db, "services"), orderBy("name"));
        unsubscribers.push(onSnapshot(servicesQuery, (snapshot) => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Service));
        }));
        
        const campsQuery = query(collection(db, 'camps'), where('date', '>=', new Date().toISOString().substring(0, 10)), orderBy('date', 'asc'));
        unsubscribers.push(onSnapshot(campsQuery, (snapshot) => {
            setCamps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Camp));
        }));


        let tasksQuery;
        if (userProfile.isAdmin) {
            tasksQuery = query(collection(db, "tasks"), orderBy("date", "desc"));
        } else if (userProfile.role === 'vle') {
            // For VLE dashboard, we only need tasks they are assigned to, regardless of status, to show invitations.
            tasksQuery = query(collection(db, "tasks"), where("assignedVleId", "==", user.uid), orderBy("date", "desc"));
        } else if (userProfile.role === 'customer') {
            tasksQuery = query(collection(db, "tasks"), where("creatorId", "==", user.uid), orderBy("date", "desc"));
        }
        
        if (tasksQuery) {
            unsubscribers.push(onSnapshot(tasksQuery, (snapshot) => {
                const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
                setTasks(fetchedTasks);
                setDataLoading(false);
            }, (error) => {
                console.error("Error fetching tasks:", error);
                setDataLoading(false);
            }));
        } else {
             setDataLoading(false);
        }
        
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [user, userProfile]);


    if (loading || dataLoading || !user || !userProfile) {
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
                return <VleDashboard 
                    allAssignedTasks={tasks} 
                    camps={camps}
                 />;
            case 'customer':
                return <CustomerDashboard tasks={tasks} services={services} />;
            case 'government':
                return <GovernmentDashboard />;
            default:
                 return (
                    <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                        <p>No dashboard view available for your role.</p>
                    </div>
                )
        }
    }

    return renderContent();
}

