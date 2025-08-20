
'use client';

import React from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({ user: null, userProfile: null, loading: true, refreshUserProfile: async () => {} });

export const useAuth = () => React.useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchUserProfile = React.useCallback(async (user: User | null): Promise<UserProfile | null> => {
    if (!user) return null;

    const userDocRef = doc(db, 'users', user.uid);
    const vleDocRef = doc(db, 'vles', user.uid);
    const govDocRef = doc(db, 'government', user.uid);

    const [userSnap, vleSnap, govSnap] = await Promise.all([
        getDoc(userDocRef),
        getDoc(vleDocRef),
        getDoc(govDocRef)
    ]);

    if (userSnap.exists()) return { id: userSnap.id, ...userSnap.data() } as UserProfile;
    if (vleSnap.exists()) return { id: vleSnap.id, ...vleSnap.data() } as UserProfile;
    if (govSnap.exists()) return { id: govSnap.id, ...govSnap.data() } as UserProfile;

    return null;
  }, []);
  
  const refreshUserProfile = React.useCallback(async () => {
    if (user) {
      const profile = await fetchUserProfile(user);
      if (profile) {
        setUserProfile(profile);
      }
    }
  }, [user, fetchUserProfile]);


  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        const profileData = await fetchUserProfile(user);
        
        if (profileData) {
          setUser(user);
          setUserProfile(profileData);
        } else {
            console.error(`Authenticated user with UID ${user.uid} not found in 'users', 'vles', or 'government' collections. Logging out.`);
            toast({
                title: "Profile Not Found",
                description: "Your account exists, but we couldn't load your profile data. Please contact support or try re-registering.",
                variant: "destructive",
                duration: 9000
            });
            await auth.signOut();
            setUserProfile(null);
            setUser(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);

  const value = {
    user,
    userProfile,
    loading,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
        {loading ? (
             <div className="flex items-center justify-center h-screen w-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        ) : children}
    </AuthContext.Provider>
  );
};

    