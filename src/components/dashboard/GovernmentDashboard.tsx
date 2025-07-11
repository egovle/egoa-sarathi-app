
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function GovernmentDashboard() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/camps');
    }, [router]);

    return (
        <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="ml-4">Redirecting to Camp Management...</p>
        </div>
    );
};
