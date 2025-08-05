
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GroupChat } from '@/components/dashboard/GroupChat';
import type { UserProfile } from '@/lib/types';

export default function GroupChatPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading) {
            const allowedRoles = ['admin', 'vle'];
            const currentRole = userProfile?.isAdmin ? 'admin' : userProfile?.role;
            if (!user || !currentRole || !allowedRoles.includes(currentRole)) {
                router.push('/dashboard');
            }
        }
    }, [user, userProfile, authLoading, router]);

    if (authLoading || !user || !userProfile) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'><MessageSquare />VLE & Admin Group Chat</CardTitle>
                <CardDescription>A central place for VLEs and Admins to communicate.</CardDescription>
            </CardHeader>
            <CardContent>
                <GroupChat user={user} userProfile={userProfile} />
            </CardContent>
        </Card>
    );
}
