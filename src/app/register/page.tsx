'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

export default function RegisterPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [role, setRole] = useState('customer');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast({
      title: 'Registration Submitted',
      description: `Your registration as a ${role} is successful. ${role === 'vle' ? 'It is now pending admin approval.' : 'Redirecting...'}`,
    });
    setTimeout(() => router.push('/'), 2000);
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
              <Input id="full-name" placeholder="John Doe" required className="bg-black/20 border-white/20 text-white placeholder:text-gray-400 focus:ring-white/50 h-11" />
            </div>
            <div className="grid gap-2 text-left">
              <Label htmlFor="email" className="text-blue-100">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required className="bg-black/20 border-white/20 text-white placeholder:text-gray-400 focus:ring-white/50 h-11" />
            </div>
            <div className="grid gap-2 text-left">
              <Label htmlFor="mobile" className="text-blue-100">Mobile Number</Label>
              <Input id="mobile" type="tel" placeholder="9876543210" required className="bg-black/20 border-white/20 text-white placeholder:text-gray-400 focus:ring-white/50 h-11" />
            </div>
            <div className="grid gap-2 text-left">
              <Label htmlFor="address" className="text-blue-100">Location (Address)</Label>
              <Input id="address" placeholder="123, Main Street, Goa" required className="bg-black/20 border-white/20 text-white placeholder:text-gray-400 focus:ring-white/50 h-11" />
            </div>
            <Button type="submit" className="w-full bg-white text-blue-800 font-bold hover:bg-gray-200 h-12 text-base rounded-lg mt-2">
              Create an account
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
