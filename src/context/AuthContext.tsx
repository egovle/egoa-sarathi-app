'use client';

import React from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  userProfile: any | null;
  loading: boolean;
}

const AuthContext = React.createContext<AuthContextType>({ user: null, userProfile: null, loading: true });

export const useAuth = () => React.useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [userProfile, setUserProfile] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        // User is signed in, fetch profile
        let profileDoc = await getDoc(doc(db, 'users', user.uid));

        if (!profileDoc.exists()) {
          profileDoc = await getDoc(doc(db, 'vles', user.uid));
        }

        if (profileDoc.exists()) {
          setUser(user);
          setUserProfile({ id: profileDoc.id, ...profileDoc.data() });
        } else {
            // This can happen if user exists in Auth but not in Firestore (e.g., error during registration).
            // For this app, we'll treat them as logged out.
            console.error("Authenticated user not found in Firestore. Logging out.");
            setUserProfile(null);
            setUser(null);
            await auth.signOut();
            router.push('/');
        }
      } else {
        // User is signed out
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
