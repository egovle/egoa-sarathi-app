
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, orderBy, where, getDocs, limit, startAfter, endBefore, Query, DocumentData, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Search } from 'lucide-react';
import type { Camp, CampSuggestion, Service, VLEProfile, GovernmentProfile } from '@/lib/types';
import AdminCampView from '@/app/dashboard/camps/AdminCampView';
import VleCampView from '@/app/dashboard/camps/VleCampView';
import CustomerCampView from '@/app/dashboard/camps/CustomerCampView';
import GovernmentCampView from '@/app/dashboard/camps/GovernmentCampView';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 10;

export default function CampManagementPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [allCamps, setAllCamps] = useState<any>({ upcoming: [], past: [], invitations: [], confirmed: [], rejected: [] });
    const [campSuggestions, setCampSuggestions] = useState<CampSuggestion[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [vles, setVles] = useState<VLEProfile[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const [lastVisible, setLastVisible] = useState<any>({});
    const [firstVisible, setFirstVisible] = useState<any>({});
    const [isFirstPage, setIsFirstPage] = useState<any>({});
    const [isLastPage, setIsLastPage] = useState<any>({});
    const [pageDirection, setPageDirection] = useState<'next' | 'prev' | 'initial'>('initial');
    const [pageIndex, setPageIndex] = useState<any>({});

    const [locationFilter, setLocationFilter] = useState('');
    const [serviceFilter, setServiceFilter] = useState('');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    const buildQuery = (baseQuery: Query<DocumentData>, category: string, direction: 'next' | 'prev' | 'initial') => {
        let q = baseQuery;
        if (locationFilter) {
            q = query(q, where('location', '==', locationFilter));
        }
        if (serviceFilter) {
            q = query(q, where('services', 'array-contains', serviceFilter));
        }

        if (direction === 'next' && lastVisible[category]) {
            return query(q, startAfter(lastVisible[category]), limit(PAGE_SIZE));
        }
        if (direction === 'prev' && firstVisible[category]) {
            return query(q, endBefore(firstVisible[category]), limit(PAGE_SIZE));
        }
        return query(q, limit(PAGE_SIZE));
    };

    const fetchCamps = useCallback(async (category: string, direction: 'next' | 'prev' | 'initial' = 'initial') => {
        if (!userProfile) return;
        setLoadingData(true);

        let baseQuery;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        switch(category) {
            case 'upcoming':
                baseQuery = query(collection(db, 'camps'), where('date', '>=', todayTimestamp.toDate().toISOString()), orderBy('date', 'asc'));
                break;
            case 'past':
                 baseQuery = query(collection(db, 'camps'), where('date', '<', todayTimestamp.toDate().toISOString()), orderBy('date', 'desc'));
                break;
            case 'suggestions':
                baseQuery = query(collection(db, 'campSuggestions'), orderBy('date', 'asc'));
                break;
            default:
                baseQuery = query(collection(db, 'camps'), orderBy('date', 'asc'));
        }
        
        const q = buildQuery(baseQuery, category, direction);
        const snapshot = await getDocs(q);
        const campsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

        if (!snapshot.empty) {
            setFirstVisible((prev:any) => ({ ...prev, [category]: snapshot.docs[0] }));
            setLastVisible((prev:any) => ({ ...prev, [category]: snapshot.docs[snapshot.docs.length - 1] }));
        }

        setAllCamps((prev: any) => ({ ...prev, [category]: campsData }));

        if (category === 'suggestions') {
            setCampSuggestions(campsData as CampSuggestion[]);
        }

        setIsLastPage((prev:any) => ({ ...prev, [category]: snapshot.docs.length < PAGE_SIZE }));
        setLoadingData(false);

    }, [userProfile, locationFilter, serviceFilter]);

    useEffect(() => {
        if (!userProfile) return;

        const initialFetch = async () => {
            setIsFirstPage({ upcoming: true, past: true, suggestions: true });
            setPageIndex({ upcoming: 0, past: 0, suggestions: 0 });

            if (userProfile.isAdmin) {
                await fetchCamps('upcoming', 'initial');
                await fetchCamps('past', 'initial');
                await fetchCamps('suggestions', 'initial');
            } else if (userProfile.role === 'vle') {
                 // VLE view logic is different, handled inside VleCampView for simplicity for now
                 const campsQuery = query(collection(db, 'camps'), orderBy('date', 'asc'));
                 onSnapshot(campsQuery, (snapshot) => {
                     const allCampsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Camp);
                     const todayStr = new Date().toLocaleDateString('en-CA');
                     const myInvitations = allCampsData.filter(camp => camp.date.substring(0, 10) >= todayStr && camp.assignedVles?.some(v => v.vleId === userProfile.id && v.status === 'pending'));
                     const myConfirmed = allCampsData.filter(camp => camp.date.substring(0, 10) >= todayStr && camp.assignedVles?.some(v => v.vleId === userProfile.id && v.status === 'accepted'));
                     const myRejected = allCampsData.filter(camp => camp.date.substring(0, 10) >= todayStr && camp.assignedVles?.some(v => v.vleId === userProfile.id && v.status === 'rejected'));
                     const myPast = allCampsData.filter(camp => camp.date.substring(0, 10) < todayStr && camp.assignedVles?.some(v => v.vleId === userProfile.id && v.status === 'accepted')).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                     setAllCamps({ invitations: myInvitations, confirmed: myConfirmed, rejected: myRejected, past: myPast });
                 });
            } else {
                await fetchCamps('upcoming', 'initial');
            }
        };

        initialFetch();
    }, [userProfile, fetchCamps]);

    const handleNext = (category: string) => {
        setPageDirection('next');
        fetchCamps(category, 'next');
        setIsFirstPage((prev:any) => ({...prev, [category]: false}));
        setPageIndex((prev:any) => ({...prev, [category]: prev[category] + 1}));
    };

    const handlePrev = (category: string) => {
        setPageDirection('prev');
        fetchCamps(category, 'prev');
        const newPageIndex = pageIndex[category] - 1;
        setPageIndex((prev:any) => ({...prev, [category]: newPageIndex}));
        if (newPageIndex === 0) {
            setIsFirstPage((prev:any) => ({...prev, [category]: true}));
        }
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

    if (authLoading || loadingData) {
        return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!userProfile) return null;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Filter by location..." className="pl-8" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} />
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Filter by service name..." className="pl-8" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} />
                </div>
            </div>

            {userProfile.isAdmin ? (
                <AdminCampView 
                    allCamps={{ upcoming: allCamps.upcoming, past: allCamps.past }}
                    suggestions={campSuggestions} 
                    vles={vles} 
                    userProfile={userProfile} 
                    onNextPage={() => handleNext('upcoming')}
                    onPrevPage={() => handlePrev('upcoming')}
                    isFirstPage={isFirstPage['upcoming']}
                    isLastPage={isLastPage['upcoming']}
                    onNextSuggestionPage={() => handleNext('suggestions')}
                    onPrevSuggestionPage={() => handlePrev('suggestions')}
                    isFirstSuggestionPage={isFirstPage['suggestions']}
                    isLastSuggestionPage={isLastPage['suggestions']}
                    onNextPastPage={() => handleNext('past')}
                    onPrevPastPage={() => handlePrev('past')}
                    isFirstPastPage={isFirstPage['past']}
                    isLastPastPage={isLastPage['past']}
                />
            ) : userProfile.role === 'vle' ? (
                <VleCampView 
                    allCamps={allCamps}
                    services={services} 
                    userProfile={userProfile as VLEProfile} 
                    vles={vles} 
                    onNextPage={(tab) => handleNext(tab)}
                    onPrevPage={(tab) => handlePrev(tab)}
                    isFirstPage={isFirstPage}
                    isLastPage={isLastPage}
                />
            ) : userProfile.role === 'government' ? (
                <GovernmentCampView 
                    allCamps={allCamps.upcoming} 
                    services={services} 
                    vles={vles} 
                    userProfile={userProfile as GovernmentProfile} 
                    onNextPage={() => handleNext('upcoming')}
                    onPrevPage={() => handlePrev('upcoming')}
                    isFirstPage={isFirstPage['upcoming']}
                    isLastPage={isLastPage['upcoming']}
                />
            ) : (
                 <CustomerCampView 
                    allCamps={allCamps.upcoming}
                    onNextPage={() => handleNext('upcoming')}
                    onPrevPage={() => handlePrev('upcoming')}
                    isFirstPage={isFirstPage['upcoming']}
                    isLastPage={isLastPage['upcoming']}
                />
            )}
        </div>
    );
}
