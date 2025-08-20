
'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function GovernmentDashboard() {
    useEffect(() => {
        redirect('/dashboard/camps');
    }, []);
    return null; 
};
