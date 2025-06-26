import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, LogIn, Mail, Lock, User, UserPlus, Phone, Database } from 'lucide-react';
import { handleSeedDatabase } from '@/app/actions';

export default function LoginPage() {
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

          <div className="space-y-6">
            <div className="space-y-2 text-left">
              <Label htmlFor="email" className="font-medium text-blue-100">Email Address</Label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 h-5 w-5 text-gray-300" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  className="w-full bg-black/20 border-white/20 rounded-lg pl-11 pr-4 py-3 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-white/50 focus:border-white/50 h-12"
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
                />
              </div>
            </div>
            <Button asChild className="w-full bg-white text-blue-800 font-bold hover:bg-gray-200 h-12 text-base rounded-lg">
              <Link href="/dashboard">Secure Sign In</Link>
            </Button>
          </div>

          <div className="mt-8 space-y-4 text-center">
              <Link href="/register" className="flex items-center justify-center gap-2 text-blue-200 hover:text-white transition-colors">
                  <User className="h-5 w-5" />
                  <span>New Customer? Register Here</span>
              </Link>
              <Link href="/register" className="flex items-center justify-center gap-2 text-blue-200 hover:text-white transition-colors">
                  <UserPlus className="h-5 w-5" />
                  <span>New VLE? Register Here</span>
              </Link>
          </div>
        </div>
      </main>

      <footer className="mt-10 flex items-center gap-4 z-10 text-blue-200">
        <Phone className="h-5 w-5" />
        <span>Helpdesk: 1800-233-3963</span>
         <form action={handleSeedDatabase}>
            <Button variant="outline" size="sm" className="bg-white/10 text-white hover:bg-white/20">
                <Database className="mr-2 h-4 w-4" /> Seed Demo Data
            </Button>
        </form>
      </footer>
    </div>
  );
}

    