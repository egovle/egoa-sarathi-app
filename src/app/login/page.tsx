
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Mail, Lock, Phone, Loader2, Eye, EyeOff, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useState, type FormEvent, useEffect } from 'react';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AppLogo } from '@/components/ui/AppLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const [showVerificationError, setShowVerificationError] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowVerificationError(false);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (!userCredential.user.emailVerified) {
        setShowVerificationError(true);
        await auth.signOut(); // Sign out to prevent user being in a weird state
        setLoading(false);
        return;
      }
      
      toast({
        title: 'Login Successful',
        description: 'Redirecting to your dashboard...',
      });
      router.push('/dashboard');
    } catch (error: any) {
        console.error('Login failed:', error);
        
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            toast({
                title: 'Login Failed',
                description: 'Invalid email or password. Please try again.',
                variant: 'destructive',
            });
        } else {
             toast({
                title: 'Login Failed',
                description: 'An unexpected error occurred. Please try again.',
                variant: 'destructive',
            });
        }
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 text-foreground p-4">
      <main className="flex flex-col items-center justify-center w-full flex-1 z-10">
        <div className="mb-8 text-center">
             <Link href="/" className="inline-block" prefetch={false}>
                <AppLogo className="justify-center text-3xl" subtitle='Streamlined Citizen Services' />
            </Link>
             <Button asChild variant="ghost" className="text-muted-foreground w-fit mx-auto mt-2">
                <Link href="/"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Home</Link>
            </Button>
        </div>
        
        {showVerificationError && (
            <Alert variant="destructive" className="mb-4 max-w-sm w-full">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Email Not Verified</AlertTitle>
                <AlertDescription>
                    You must verify your email address to log in. Please check your inbox for the verification link.
                </AlertDescription>
            </Alert>
        )}

        <Card className="w-full max-w-sm shadow-xl bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
                <LogIn className="h-5 w-5" />
                Login to Your Portal
            </CardTitle>
            <CardDescription>Access services with your credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2 text-left">
                 <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                        href="/forgot-password"
                        className="text-sm font-medium text-primary hover:underline"
                        prefetch={false}
                    >
                        Forgot Password?
                    </Link>
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                   <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:bg-transparent"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full mt-4">
                {loading ? <Loader2 className="animate-spin" /> : 'Secure Sign In'}
              </Button>
            </form>

              <div className="mt-6 text-center text-sm">
                  <span className="text-muted-foreground">Don't have an account?{' '}</span>
                  <Link href="/register" className={cn("underline font-semibold text-primary hover:text-primary/80 transition-colors")} prefetch={false}>
                      Register here
                  </Link>
              </div>
          </CardContent>
        </Card>
        
      </main>

      <footer className="mt-10 flex items-center gap-4 z-10 text-muted-foreground">
        <a href="tel:+918380083832" className="flex items-center gap-2 hover:text-foreground transition-colors">
            <Phone className="h-4 w-4" />
            <span>Helpdesk: +91 8380083832</span>
        </a>
        <a href="https://wa.me/+918380083832" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
            <WhatsAppIcon className="h-5 w-5" />
            <span className="sr-only">WhatsApp</span>
        </a>
      </footer>
    </div>
  );
}
