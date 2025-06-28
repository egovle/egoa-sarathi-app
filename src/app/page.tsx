
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, LogIn, Mail, Lock, Phone, Loader2, Eye, EyeOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.296-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
);


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
              <Button type="submit" disabled={loading} className="w-full mt-4">
                {loading ? <Loader2 className="animate-spin" /> : 'Secure Sign In'}
              </Button>
            </form>

              <div className="mt-6 text-center text-sm">
                  <span className="text-muted-foreground">Don't have an account?{' '}</span>
                  <Link href="/register" className="underline font-semibold text-primary hover:text-primary/80 transition-colors" prefetch={false}>
                      Register here
                  </Link>
              </div>
          </CardContent>
        </Card>
      </main>

      <footer className="mt-10 flex items-center gap-4 z-10 text-muted-foreground">
        <a href="tel:+919834637587" className="flex items-center gap-2 hover:text-foreground transition-colors">
            <Phone className="h-4 w-4" />
            <span>Helpdesk: +91 9834637587</span>
        </a>
        <a href="https://wa.me/+919834637587" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
            <WhatsAppIcon className="h-5 w-5" />
            <span className="sr-only">WhatsApp</span>
        </a>
      </footer>
    </div>
  );
}

