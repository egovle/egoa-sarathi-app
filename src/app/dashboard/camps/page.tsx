
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, orderBy, where, getDocs, limit, startAfter, Query, DocumentData, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import type { Camp, CampSuggestion, Service, VLEProfile, GovernmentProfile, UserProfile } from '@/lib/types';
import AdminCampView from '@/app/dashboard/camps/AdminCampView';
import VleCampView from './VleCampView';
import CustomerCampView from '@/app/dashboard/camps/CustomerCampView';
import GovernmentCampView from '@/app/dashboard/camps/GovernmentCampView';

const PAGE_SIZE = 10;

export default function CampManagementPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [allCamps, setAllCamps] = useState<any>({ upcoming: [], past: [], invitations: [], confirmed: [], rejected: [] });
    const [campSuggestions, setCampSuggestions] = useState<CampSuggestion[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [vles, setVles] = useState<VLEProfile[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const [lastVisible, setLastVisible] = useState<{ [key: string]: DocumentData | null }>({});
    const [page, setPage] = useState<any>({});

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    const fetchPaginatedData = useCallback(async (category: string, direction: 'next' | 'prev' | 'initial') => {
        if (!userProfile) return;
        setLoadingData(true);

        const collectionName = category === 'suggestions' ? 'campSuggestions' : 'camps';
        let baseQuery: Query<DocumentData>;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        if (category === 'upcoming') {
            baseQuery = query(collection(db, collectionName), where('date', '>=', todayTimestamp.toDate().toISOString()), orderBy('date', 'asc'));
        } else if (category === 'past') {
            baseQuery = query(collection(db, collectionName), where('date', '<', todayTimestamp.toDate().toISOString()), orderBy('date', 'desc'));
        } else if (category === 'vle_past') {
             const vleId = userProfile?.id;
             baseQuery = query(collection(db, 'camps'), 
                 where('assignedVles', 'array-contains', {vleId: vleId, status: 'accepted'}), 
                 where('date', '<', todayTimestamp.toDate().toISOString()), 
                 orderBy('date', 'desc')
             );
        } else { // suggestions or other general queries
            baseQuery = query(collection(db, collectionName), orderBy('date', 'asc'));
        }

        let q: Query<DocumentData>;
        if (direction === 'next' && lastVisible[category]) {
            q = query(baseQuery, startAfter(lastVisible[category]), limit(PAGE_SIZE));
        } else {
            q = query(baseQuery, limit(PAGE_SIZE));
        }

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (!snapshot.empty) {
            setLastVisible((prev) => ({ ...prev, [category]: snapshot.docs[snapshot.docs.length - 1] }));
        }
        
        if (category === 'suggestions') {
            setCampSuggestions(data as CampSuggestion[]);
        } else if (category === 'vle_past') {
            setAllCamps((prev: any) => ({ ...prev, past: data }));
        } else {
            setAllCamps((prev: any) => ({ ...prev, [category]: data }));
        }

        setLoadingData(false);
    }, [userProfile, lastVisible]);
    
    useEffect(() => {
        if (!userProfile) return;

        const initialFetch = async () => {
             setPage({ upcoming: 1, past: 1, suggestions: 1, vle_past: 1 });
            if (userProfile.isAdmin) {
                await fetchPaginatedData('upcoming', 'initial');
                await fetchPaginatedData('past', 'initial');
                await fetchPaginatedData('suggestions', 'initial');
            } else if (userProfile.role === 'customer' || userProfile.role === 'government') {
                 await fetchPaginatedData('upcoming', 'initial');
            } else if (userProfile.role === 'vle') {
                 const vleId = userProfile.id;
                 const todayStr = new Date().toLocaleDateString('en-CA');
                 
                 await fetchPaginatedData('vle_past', 'initial');
                 
                 const campsQuery = query(collection(db, 'camps'), orderBy('date', 'asc'));
                 const unsubscribe = onSnapshot(campsQuery, (snapshot) => {
                     const allCampsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Camp);
                     const myInvitations = allCampsData.filter(camp => camp.date.substring(0, 10) >= todayStr && camp.assignedVles?.some(v => v.vleId === vleId && v.status === 'pending'));
                     const myConfirmed = allCampsData.filter(camp => camp.date.substring(0, 10) >= todayStr && camp.assignedVles?.some(v => v.vleId === vleId && v.status === 'accepted'));
                     const myRejected = allCampsData.filter(camp => camp.date.substring(0, 10) >= todayStr && camp.assignedVles?.some(v => v.vleId === vleId && v.status === 'rejected'));
                     
                     setAllCamps((prev : any) => ({ ...prev, invitations: myInvitations, confirmed: myConfirmed, rejected: myRejected }));
                     setLoadingData(false);
                 });
                 return () => unsubscribe();
            }
        };

        initialFetch();
    }, [userProfile, fetchPaginatedData]);


    const handleNext = (category: string) => {
        fetchPaginatedData(category, 'next');
        setPage((prev: any) => ({...prev, [category]: prev[category] + 1}));
    };

    const handlePrev = (category: string) => {
        // Firestore SDK doesn't efficiently support previous pages without complex logic,
        // so we'll just refetch the first page for simplicity.
        setLastVisible(prev => ({...prev, [category]: null}));
        fetchPaginatedData(category, 'initial');
        setPage((prev: any) => ({...prev, [category]: 1}));
    };

    useEffect(() => {
        const servicesQuery = query(collection(db, "services"), orderBy("name"));
        const unsubServices = onSnapshot(servicesQuery, (snapshot) => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Service));
        }, (error) => console.error("Error fetching services:", error));

        const vlesQuery = query(collection(db, 'vles'), where('isAdmin', '==', false), orderBy('name'));
        const unsubVles = onSnapshot(vlesQuery, (snapshot) => {
            setVles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as VLEProfile));
        }, (error) => console.error("Error fetching VLEs:", error));

        return () => { unsubServices(); unsubVles(); };
    }, []);

    if (authLoading || loadingData || !userProfile) {
        return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    const isFirstPage = (category: string) => page[category] === 1;
    const isLastPage = (category: string) => {
      const dataSet = category === 'suggestions' ? campSuggestions : allCamps[category];
      return (dataSet?.length ?? 0) < PAGE_SIZE;
    }
    
    const renderView = () => {
        if (userProfile.isAdmin) {
            return (
                <AdminCampView 
                    allCamps={{ upcoming: allCamps.upcoming, past: allCamps.past }}
                    suggestions={campSuggestions} 
                    vles={vles} 
                    userProfile={userProfile} 
                    onNextPage={() => handleNext('upcoming')}
                    onPrevPage={() => handlePrev('upcoming')}
                    isFirstPage={isFirstPage('upcoming')}
                    isLastPage={isLastPage('upcoming')}
                    onNextSuggestionPage={() => handleNext('suggestions')}
                    onPrevSuggestionPage={() => handlePrev('suggestions')}
                    isFirstSuggestionPage={isFirstPage('suggestions')}
                    isLastPage={isLastPage('suggestions')}
                    onNextPastPage={() => handleNext('past')}
                    onPrevPastPage={() => handlePrev('past')}
                    isFirstPastPage={isFirstPage('past')}
                    isLastPage={isLastPage('past')}
                />
            );
        }
        if (userProfile.role === 'vle') {
            return (
                 <VleCampView 
                    allCamps={allCamps}
                    services={services} 
                    userProfile={userProfile as VLEProfile} 
                    vles={vles}
                    onNextPage={() => handleNext('vle_past')}
                    onPrevPage={() => handlePrev('vle_past')}
                    isFirstPage={isFirstPage('vle_past')}
                    isLastPage={isLastPage('vle_past')}
                />
            );
        }
        if (userProfile.role === 'government') {
            return (
                <GovernmentCampView 
                    allCamps={allCamps.upcoming} 
                    services={services} 
                    vles={vles} 
                    userProfile={userProfile as GovernmentProfile} 
                    onNextPage={() => handleNext('upcoming')}
                    onPrevPage={() => handlePrev('upcoming')}
                    isFirstPage={isFirstPage('upcoming')}
                    isLastPage={isLastPage('upcoming')}
                />
            );
        }
        return (
             <CustomerCampView 
                allCamps={allCamps.upcoming}
                onNextPage={() => handleNext('upcoming')}
                onPrevPage={() => handlePrev('upcoming')}
                isFirstPage={isFirstPage('upcoming')}
                isLastPage={isLastPage('upcoming')}
            />
        );
    };

    return (
        <div className="space-y-4">
            {renderView()}
        </div>
    );
}
