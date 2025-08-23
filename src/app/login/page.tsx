
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Mail, Lock, Phone, Loader2, Eye, EyeOff, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useState, type FormEvent, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, sendEmailVerification, type User } from 'firebase/auth';
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
  
  const [isConfigMissing, setIsConfigMissing] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState<User | null>(null);


  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!key || key.includes('PASTE_YOUR')) {
      setIsConfigMissing(true);
    }
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowResendVerification(false);
    setUnverifiedUser(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (!userCredential.user.emailVerified) {
        setUnverifiedUser(userCredential.user);
        setShowResendVerification(true);
        await signOut(auth); // Sign out the user to prevent them from being in a limbo state
        setLoading(false);
        return;
      }

      toast({
        title: 'Login Successful',
        description: 'Redirecting to your dashboard...',
      });
      router.push('/dashboard');
    } catch (error: any)
      {
      console.error('Login failed:', error);
      toast({
        title: 'Login Failed',
        description: 'Invalid email or password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleResendVerification = async () => {
    if (!unverifiedUser) return;
    setLoading(true);
    try {
        await sendEmailVerification(unverifiedUser);
        toast({
            title: 'Verification Email Sent',
            description: 'A new verification link has been sent to your email address. Please check your inbox.',
        });
        setShowResendVerification(false);
    } catch (error) {
        console.error('Failed to resend verification email:', error);
        toast({
            title: 'Error',
            description: 'Could not send verification email. Please try again later.',
            variant: 'destructive',
        });
    } finally {
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
        
        {isConfigMissing && (
            <Alert variant="destructive" className="mb-4 max-w-sm w-full">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Configuration Error!</AlertTitle>
                <AlertDescription>
                    Your app's API keys are not set correctly. Please follow the setup instructions in the README file to fix this.
                </AlertDescription>
            </Alert>
        )}

        {showResendVerification && (
            <Alert variant="destructive" className="mb-4 max-w-sm w-full">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Email Not Verified</AlertTitle>
                <AlertDescription>
                    You must verify your email address to log in.
                    <Button variant="link" className="p-0 h-auto ml-1" onClick={handleResendVerification} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : "Resend verification email"}
                    </Button>
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
              <Button type="submit" disabled={loading || isConfigMissing} className="w-full mt-4">
                {loading ? <Loader2 className="animate-spin" /> : 'Secure Sign In'}
              </Button>
            </form>

              <div className="mt-6 text-center text-sm">
                  <span className="text-muted-foreground">Don't have an account?{' '}</span>
                  <Link href="/register" className={cn("underline font-semibold text-primary hover:text-primary/80 transition-colors", isConfigMissing && "pointer-events-none opacity-50")} prefetch={false}>
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
