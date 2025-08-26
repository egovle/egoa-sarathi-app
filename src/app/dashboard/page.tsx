
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

import type { Task, Service, Camp } from '@/lib/types';


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

        // All users need services for creating tasks or viewing profiles
        const servicesQuery = query(collection(db, "services"), orderBy("name"));
        unsubscribers.push(onSnapshot(servicesQuery, (snapshot) => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Service));
        }));
        
        // Fetch all upcoming camps for VLEs (for invitations)
        const campsQuery = query(collection(db, 'camps'), where('date', '>=', new Date().toISOString()), orderBy('date', 'asc'));
        unsubscribers.push(onSnapshot(campsQuery, (snapshot) => {
            setCamps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Camp));
        }));


        // Fetch tasks based on user role
        let tasksQuery;
        if (userProfile.isAdmin) {
            // AdminDashboard fetches its own specific data, so no primary task list needed here
            // but we can fetch all for other potential uses if needed. For now, it's handled inside the component.
        } else if (userProfile.role === 'vle') {
            tasksQuery = query(collection(db, "tasks"), where("assignedVleId", "==", user.uid));
        } else if (userProfile.role === 'customer') {
            tasksQuery = query(collection(db, "tasks"), where("creatorId", "==", user.uid), orderBy("date", "desc"));
        }
        
        if (tasksQuery) {
            unsubscribers.push(onSnapshot(tasksQuery, (snapshot) => {
                const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
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
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                )
        }
    }

    return renderContent();
}
