'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, LogIn, Mail, Lock, User, UserPlus, Phone, Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.296-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
);

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.657-3.356-11.303-7.918l-6.571,4.819C9.656,39.663,16.318,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.02,35.826,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: 'Login Successful',
        description: 'Redirecting to your dashboard...',
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login failed:', error);
      toast({
        title: 'Login Failed',
        description: error.message || 'Please check your credentials and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        const userDocRef = doc(db, 'users', user.uid);
        const vleDocRef = doc(db, 'vles', user.uid);
        
        const userDocSnap = await getDoc(userDocRef);
        const vleDocSnap = await getDoc(vleDocRef);

        if (!userDocSnap.exists() && !vleDocSnap.exists()) {
            await setDoc(doc(db, 'users', user.uid), {
                name: user.displayName,
                email: user.email,
                mobile: user.phoneNumber || '',
                location: '',
                role: 'customer',
                walletBalance: 0,
                bankAccounts: [],
                isAdmin: false,
            });
             toast({ title: 'Account Created', description: 'Welcome! We\'ve created a new account for you.' });
        } else {
             toast({ title: 'Login Successful', description: 'Welcome back!' });
        }
        
        router.push('/dashboard');
    } catch (error: any) {
        console.error('Google Sign-In failed:', error);
        toast({
            title: 'Sign-In Failed',
            description: error.message || 'Could not sign in with Google. Please try again.',
            variant: 'destructive',
        });
    } finally {
        setGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-700 to-indigo-900 text-white p-4">
      <main className="flex flex-col items-center justify-center w-full flex-1 z-10">
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-white/20 rounded-full mb-4">
            <ShieldCheck className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight">eGoa Sarathi</h1>
          <p className="text-lg text-blue-200 mt-2">Streamlined Citizen Services</p>
        </div>

        <div className="w-full max-w-md bg-blue-500/20 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <LogIn className="h-6 w-6 text-blue-200" />
            <h2 className="text-2xl font-semibold">Login to Your Portal</h2>
          </div>
          <p className="text-blue-200 mb-8">Access services with your credentials</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2 text-left">
              <Label htmlFor="email" className="font-medium text-blue-100">Email Address</Label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 h-5 w-5 text-gray-300" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  className="w-full bg-black/20 border-white/20 rounded-lg pl-11 pr-4 py-3 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-white/50 focus:border-white/50 h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2 text-left">
              <Label htmlFor="password"  className="font-medium text-blue-100">Password</Label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 h-5 w-5 text-gray-300" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-black/20 border-white/20 rounded-lg pl-11 pr-4 py-3 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-white/50 focus:border-white/50 h-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={loading || googleLoading} className="w-full bg-white text-blue-800 font-bold hover:bg-gray-200 h-12 text-base rounded-lg">
              {loading ? <Loader2 className="animate-spin" /> : 'Secure Sign In'}
            </Button>
          </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-blue-800 px-2 text-blue-200">Or continue with</span>
              </div>
            </div>

            <Button variant="outline" type="button" onClick={handleGoogleSignIn} disabled={loading || googleLoading} className="w-full bg-white/90 text-blue-800 font-bold hover:bg-white h-12 text-base rounded-lg">
                {googleLoading ? <Loader2 className="animate-spin" /> : <><GoogleIcon className="mr-2 h-5 w-5" /> Google</>}
            </Button>

            <div className="mt-6 text-center text-sm">
                <span className="text-blue-200">Don't have an account?{' '}</span>
                <Link href="/register" className="underline font-semibold hover:text-white transition-colors" prefetch={false}>
                    Register here
                </Link>
            </div>
        </div>
      </main>

      <footer className="mt-10 flex items-center gap-4 z-10 text-blue-200">
        <a href="tel:+919834637587" className="flex items-center gap-2 hover:text-white transition-colors">
            <Phone className="h-5 w-5" />
            <span>Helpdesk: +91 9834637587</span>
        </a>
        <a href="https://wa.me/+919834637587" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            <WhatsAppIcon className="h-6 w-6" />
            <span className="sr-only">WhatsApp</span>
        </a>
      </footer>
    </div>
  );
}
