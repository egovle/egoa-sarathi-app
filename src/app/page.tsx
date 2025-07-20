
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, LogIn, Mail, Lock, Phone, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useState, type FormEvent, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const [isConfigMissing, setIsConfigMissing] = useState(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!key || key.startsWith('PASTE_YOUR')) {
      setIsConfigMissing(true);
    }
  }, []);

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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <main className="flex flex-col items-center justify-center w-full flex-1 z-10">
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-primary/20 rounded-full mb-4">
            <ShieldCheck className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-foreground">eGoa Sarathi</h1>
          <p className="text-lg text-muted-foreground mt-2">Streamlined Citizen Services</p>
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

        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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
                <Label htmlFor="password">Password</Label>
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
              <p className="text-xs text-muted-foreground text-center mt-4">
                This site is protected by reCAPTCHA and the Google{' '}
                <a href="https://policies.google.com/privacy" className="underline">Privacy Policy</a> and{' '}
                <a href="https://policies.google.com/terms" className="underline">Terms of Service</a> apply.
              </p>
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
