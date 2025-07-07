
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import type { Camp, CampSuggestion, Service, VLEProfile, UserProfile, GovernmentProfile } from '@/lib/types';
import AdminCampView from '@/app/dashboard/camps/AdminCampView';
import VleCampView from '@/app/dashboard/camps/VleCampView';
import CustomerCampView from '@/app/dashboard/camps/CustomerCampView';
import GovernmentCampView from '@/app/dashboard/camps/GovernmentCampView';

export default function CampManagementPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    
    const [allCamps, setAllCamps] = useState<Camp[]>([]);
    const [campSuggestions, setCampSuggestions] = useState<CampSuggestion[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [vles, setVles] = useState<VLEProfile[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!userProfile) return;
        setLoadingData(true);

        const campsQuery = query(collection(db, 'camps'), orderBy('date', 'asc'));
        const unsubCamps = onSnapshot(campsQuery, (snapshot) => {
             setAllCamps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Camp));
             // Customer is the only role that doesn't need to wait for VLE list
             if (userProfile?.role === 'customer') {
                setLoadingData(false);
             }
        }, (error) => {
            console.error("Error fetching camps: ", error);
            setLoadingData(false);
        });
        
        const servicesQuery = query(collection(db, "services"), orderBy("name"));
        const unsubServices = onSnapshot(servicesQuery, (snapshot) => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Service));
        }, (error) => console.error("Error fetching services:", error));

        let unsubSuggestions: () => void = () => {};
        let unsubVles: () => void = () => {};

        // Fetch VLEs for Admin, Government, and VLE roles
        if (userProfile.isAdmin || userProfile.role === 'government' || userProfile.role === 'vle') {
             if (userProfile.isAdmin) {
                const suggestionsQuery = query(collection(db, 'campSuggestions'), orderBy('date', 'asc'));
                unsubSuggestions = onSnapshot(suggestionsQuery, (snapshot) => {
                    setCampSuggestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as CampSuggestion));
                }, (error) => console.error("Error fetching camp suggestions:", error));
            }
            
            const vlesQuery = query(collection(db, 'vles'), where('isAdmin', '==', false));
            unsubVles = onSnapshot(vlesQuery, (snapshot) => {
                const fetchedVles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as VLEProfile);
                fetchedVles.sort((a, b) => a.name.localeCompare(b.name));
                setVles(fetchedVles);
                setLoadingData(false); // Set loading to false for these roles after VLEs are fetched
            }, (error) => {
                console.error("Error fetching VLEs:", error)
                setLoadingData(false);
            });
        }
        
        return () => { unsubCamps(); unsubServices(); unsubSuggestions(); unsubVles(); };
    }, [userProfile]);

    if (authLoading || loadingData) {
        return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!userProfile) {
        return null; // Redirect logic in useEffect handles this
    }
    
    if (userProfile.isAdmin) {
        return <AdminCampView allCamps={allCamps} suggestions={campSuggestions} vles={vles} userProfile={userProfile} />;
    }
    if (userProfile.role === 'vle') {
        return <VleCampView allCamps={allCamps} services={services} userProfile={userProfile as VLEProfile} vles={vles} />;
    }
    if (userProfile.role === 'government') {
        return <GovernmentCampView allCamps={allCamps} services={services} vles={vles} userProfile={userProfile as GovernmentProfile} />;
    }
    return <CustomerCampView allCamps={allCamps} />;
}
