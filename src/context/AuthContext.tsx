
'use client';

import React from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/lib/types';

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
  const router = useRouter();

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        let profileDoc;
        let profileData;

        profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          profileData = { id: profileDoc.id, ...profileDoc.data() };
        } else {
          profileDoc = await getDoc(doc(db, 'vles', user.uid));
           if (profileDoc.exists()) {
              profileData = { id: profileDoc.id, ...profileDoc.data() };
           } else {
              profileDoc = await getDoc(doc(db, 'government', user.uid));
              if(profileDoc.exists()){
                profileData = { id: profileDoc.id, ...profileDoc.data() };
              }
           }
        }

        if (profileData) {
          setUser(user);
          setUserProfile(profileData as UserProfile);
        } else {
            console.error("Authenticated user not found in any known collection. Logging out.");
            setUserProfile(null);
            setUser(null);
            await auth.signOut();
            router.push('/');
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

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
