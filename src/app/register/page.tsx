'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function RegisterPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [role, setRole] = useState('customer');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const form = event.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const fullName = (form.elements.namedItem('full-name') as HTMLInputElement).value;
    const mobile = (form.elements.namedItem('mobile') as HTMLInputElement).value;
    const address = (form.elements.namedItem('address') as HTMLInputElement).value;

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Create user profile in Firestore
      const userProfile = {
        name: fullName,
        email: email,
        mobile: mobile,
        location: address,
        role: role,
        walletBalance: 0,
        bankAccounts: [],
        ...(role === 'vle' && { status: 'Pending', available: false, isAdmin: false }),
      };

      const collectionName = role === 'vle' ? 'vles' : 'users';
      await setDoc(doc(db, collectionName, user.uid), userProfile);

      toast({
        title: 'Registration Successful!',
        description: `Your account has been created. ${role === 'vle' ? 'It is now pending admin approval.' : 'Redirecting to login...'}`,
      });
      router.push('/');

    } catch (error: any) {
      console.error("Registration failed:", error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'Could not create account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-700 to-indigo-900 text-white p-4">
       <Card className="mx-auto max-w-sm w-full bg-blue-500/20 backdrop-blur-lg rounded-2xl p-2 md:p-4 shadow-2xl border border-white/10 text-white">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Link href="/" className="inline-block p-3 bg-white/20 rounded-full" prefetch={false}>
                <ShieldCheck className="h-8 w-8 text-white" />
            </Link>
          </div>
          <CardTitle className="text-2xl text-center tracking-tight">Register for eGoa Sarathi</CardTitle>
          <CardDescription className="text-center text-blue-200">Enter your details below to create an account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2 text-left">
              <Label className="text-blue-100">Register as</Label>
              <RadioGroup defaultValue="customer" onValueChange={setRole} className="flex gap-4 pt-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="customer" id="r1" className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-blue-700" />
                  <Label htmlFor="r1">Customer</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vle" id="r2" className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-blue-700" />
                  <Label htmlFor="r2">VLE</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid gap-2 text-left">
              <Label htmlFor="full-name" className="text-blue-100">Full Name</Label>
              <Input id="full-name" name="full-name" placeholder="John Doe" required className="bg-black/20 border-white/20 text-white placeholder:text-gray-400 focus:ring-white/50 h-11" />
            </div>
            <div className="grid gap-2 text-left">
              <Label htmlFor="email" className="text-blue-100">Email</Label>
              <Input id="email" name="email" type="email" placeholder="m@example.com" required className="bg-black/20 border-white/20 text-white placeholder:text-gray-400 focus:ring-white/50 h-11" />
            </div>
             <div className="grid gap-2 text-left">
              <Label htmlFor="password"  className="text-blue-100">Password</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" required className="bg-black/20 border-white/20 text-white placeholder:text-gray-400 focus:ring-white/50 h-11" />
            </div>
            <div className="grid gap-2 text-left">
              <Label htmlFor="mobile" className="text-blue-100">Mobile Number</Label>
              <Input id="mobile" name="mobile" type="tel" placeholder="9876543210" required className="bg-black/20 border-white/20 text-white placeholder:text-gray-400 focus:ring-white/50 h-11" />
            </div>
            <div className="grid gap-2 text-left">
              <Label htmlFor="address" className="text-blue-100">Location (Address)</Label>
              <Input id="address" name="address" placeholder="123, Main Street, Goa" required className="bg-black/20 border-white/20 text-white placeholder:text-gray-400 focus:ring-white/50 h-11" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-white text-blue-800 font-bold hover:bg-gray-200 h-12 text-base rounded-lg mt-2">
              {loading ? <Loader2 className="animate-spin" /> : 'Create an account'}
            </Button>
            {role === 'vle' && (
              <p className="text-xs text-center text-blue-200 mt-2">
                VLE accounts require admin approval after registration.
              </p>
            )}
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-blue-200">Already have an account?{' '}</span>
            <Link href="/" className="underline font-semibold" prefetch={false}>
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
