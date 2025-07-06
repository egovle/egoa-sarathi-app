
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
}

const AuthContext = React.createContext<AuthContextType>({ user: null, userProfile: null, loading: true });

export const useAuth = () => React.useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        
        const userDocRef = doc(db, 'users', user.uid);
        const vleDocRef = doc(db, 'vles', user.uid);
        const govDocRef = doc(db, 'government', user.uid);
        
        const [userSnap, vleSnap, govSnap] = await Promise.all([
            getDoc(userDocRef),
            getDoc(vleDocRef),
            getDoc(govDocRef)
        ]);
        
        let profileData: UserProfile | null = null;

        if (userSnap.exists()) {
          profileData = { id: userSnap.id, ...userSnap.data() } as UserProfile;
        } else if (vleSnap.exists()) {
          profileData = { id: vleSnap.id, ...vleSnap.data() } as UserProfile;
        } else if (govSnap.exists()) {
          profileData = { id: govSnap.id, ...govSnap.data() } as UserProfile;
        }
        
        if (profileData) {
          setUser(user);
          setUserProfile(profileData);
        } else {
            console.error("Authenticated user not found in any known collection. Logging out.");
            toast({
                title: "Profile Error",
                description: "Your user profile could not be loaded. Please contact support.",
                variant: "destructive"
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
  }, []);

  const value = {
    user,
    userProfile,
    loading,
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
