
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useState, type FormEvent, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLogo } from '@/components/ui/AppLogo';
import { updatePassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';

const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
};

function SetPasswordComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const email = searchParams.get('email');

  useEffect(() => {
    if (!email) {
      toast({ title: 'Error', description: 'No email provided. Please start the registration process again.', variant: 'destructive' });
      router.push('/register');
    }
  }, [email, router, toast]);

  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'Please re-enter your password.', variant: 'destructive' });
      return;
    }
    if (getPasswordStrength(password) < 4) {
      toast({ title: 'Weak Password', description: 'Password must be stronger.', variant: 'destructive'});
      return;
    }

    setLoading(true);

    try {
        const user = auth.currentUser;
        if (!user || user.email !== email) {
            // If user is not logged in or email doesn't match, this flow is invalid.
            // This can happen if the page is refreshed or visited directly.
             toast({ title: 'Session Expired', description: 'Your session has expired. Please start the registration process again.', variant: 'destructive' });
             router.push('/register');
             return;
        }

        await updatePassword(user, password);
        
        toast({
            title: 'Password Set Successfully',
            description: 'Please log in with your new password.',
            variant: 'default',
        });
        
        // Sign the user out before redirecting to login
        await auth.signOut();
        router.push('/login');

    } catch (error: any) {
      console.error('Password update failed:', error);
      toast({
        title: 'Error Setting Password',
        description: 'Could not update your password. Please try the registration process again.',
        variant: 'destructive',
      });
      router.push('/register');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const strengthColor = useMemo(() => {
    if (passwordStrength < 3) return 'bg-destructive';
    if (passwordStrength < 4) return 'bg-yellow-500';
    return 'bg-green-500';
  }, [passwordStrength]);
  const strengthLabel = useMemo(() => {
    if (!password) return '';
    if (passwordStrength < 3) return 'Weak';
    if (passwordStrength < 4) return 'Medium';
    return 'Strong';
  }, [password, passwordStrength]);

  if (!email) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 p-4">
              <Loader2 className="h-8 w-8 animate-spin"/>
          </div>
      )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 p-4">
      <main className="flex flex-col items-center justify-center w-full flex-1">
        <div className="mb-8 text-center">
            <AppLogo className="justify-center text-3xl" subtitle='Streamlined Citizen Services' />
        </div>

        <Card className="w-full max-w-sm shadow-xl bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Set Your Password
            </CardTitle>
            <CardDescription>
              Create a secure password for your new account for {email}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                    <Input 
                        id="password" 
                        type={showPassword ? 'text' : 'password'} 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="••••••••" 
                        required 
                        className="pr-10"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:bg-transparent">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                </div>
                {password && (
                    <div className="flex items-center gap-2 text-xs mt-1">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                             <div className={cn("h-full transition-all", strengthColor)} style={{ width: `${passwordStrength * 20}%`}}></div>
                        </div>
                        <span className="w-12 text-right">{strengthLabel}</span>
                    </div>
                )}
              </div>
               <div className="space-y-2 text-left">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input 
                    id="confirm-password" 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="••••••••" 
                    required 
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full mt-4">
                {loading ? <Loader2 className="animate-spin" /> : 'Set Password and Finish'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


export default function SetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SetPasswordComponent />
        </Suspense>
    )
}
