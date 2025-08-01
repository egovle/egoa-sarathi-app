
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLogo } from '@/components/ui/AppLogo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Please check your inbox for instructions to reset your password.',
      });
      setSubmitted(true);
    } catch (error: any) {
      console.error('Password reset failed:', error);
      // Show a generic message to avoid disclosing which emails are registered
      toast({
        title: 'Request Submitted',
        description: 'If an account with this email exists, a password reset link has been sent.',
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 text-foreground p-4">
      <main className="flex flex-col items-center justify-center w-full flex-1">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block" prefetch={false}>
            <AppLogo className="justify-center text-3xl" subtitle='Streamlined Citizen Services' />
          </Link>
        </div>

        <Card className="w-full max-w-sm shadow-xl bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              Forgot Your Password?
            </CardTitle>
            <CardDescription>
              {submitted 
                ? 'You can now close this page.'
                : "No worries! Enter your email and we'll send you a reset link."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center text-green-600 font-medium p-4 bg-green-50 rounded-md">
                <p>If an account with the email <strong>{email}</strong> exists, a password reset link has been sent. Please check your inbox (and spam folder).</p>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
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
                <Button type="submit" disabled={loading} className="w-full mt-4">
                  {loading ? <Loader2 className="animate-spin" /> : 'Send Reset Link'}
                </Button>
              </form>
            )}
            
            <div className="mt-6 text-center">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
