
'use client';

import React from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({ user: null, userProfile: null, loading: true, refreshUserProfile: async () => {} });

export const useAuth = () => React.useContext(AuthContext);

const publicPaths = ['/login', '/register', '/set-password', '/forgot-password', '/'];
const policyPaths = ['/about', '/services', '/privacy', '/terms', '/refund-policy'];


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const pathname = usePathname();

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
    // This function ensures that we only try to check auth state after firebase is fully initialized.
    const initializeAuth = async () => {
        // The firebase.ts file handles the initialization. We just need to wait for it to complete.
        // A small delay can ensure all async scripts have loaded, including App Check.
        await new Promise(resolve => setTimeout(resolve, 50)); 
        
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          setLoading(true);
          if (user) {
            const isAuthPage = publicPaths.some(path => pathname.startsWith(path) && path !== '/');
            const isPolicyPage = policyPaths.some(path => pathname.startsWith(path));
    
            if (!user.emailVerified && !isAuthPage && !isPolicyPage && pathname !== '/') {
                if (pathname !== '/login') {
                     toast({
                        title: "Email Verification Required",
                        description: "Please check your inbox and verify your email to continue.",
                        variant: "destructive",
                        duration: 7000
                    });
                }
                await signOut(auth);
                setUser(null);
                setUserProfile(null);
                setLoading(false);
                return;
            }
    
            try {
              const profileData = await fetchUserProfile(user);
              
              if (profileData) {
                setUser(user);
                setUserProfile(profileData);
              } else {
                  console.error(`Authenticated user with UID ${user.uid} not found in any collection. Logging out.`);
                  await signOut(auth);
                  setUserProfile(null);
                  setUser(null);
              }
            } catch (error) {
              console.error("Error fetching user profile:", error);
              // This can happen if Firestore access is denied due to App Check
              // Log out the user to prevent an infinite loop state
              await signOut(auth);
              setUser(null);
              setUserProfile(null);
            }
          } else {
            setUser(null);
            setUserProfile(null);
          }
          setLoading(false);
        });

        return () => unsubscribe();
    };

    initializeAuth();
    
  }, [fetchUserProfile, pathname]);

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
