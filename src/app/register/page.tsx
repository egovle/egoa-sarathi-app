
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState, type FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type PostOffice = {
  Name: string;
  District: string;
  State: string;
};

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.657-3.356-11.303-7.918l-6.571,4.819C9.656,39.663,16.318,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.02,35.826,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
);

export default function RegisterPage() {
  const { toast } = useToast();
  const router = useRouter();

  // Form State
  const [role, setRole] = useState('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [pincode, setPincode] = useState('');
  const [postOffices, setPostOffices] = useState<PostOffice[]>([]);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (pincode.length !== 6) {
      setCity('');
      setDistrict('');
      setPostOffices([]);
      return;
    }

      const fetchLocation = async () => {
        setIsPincodeLoading(true);
        setCity('');
        setDistrict('');
        setPostOffices([]);
        try {
          const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
          const data = await response.json();
          if (data && data[0] && data[0].Status === 'Success') {
            const fetchedPostOffices: PostOffice[] = data[0].PostOffice;
            setPostOffices(fetchedPostOffices);
            setDistrict(fetchedPostOffices[0].District);
            
            if (fetchedPostOffices.length === 1) {
              setCity(fetchedPostOffices[0].Name);
            }
            
            toast({
              title: 'Location Found',
              description: `${fetchedPostOffices[0].District}, ${fetchedPostOffices[0].State}`,
            });
          } else {
            setPostOffices([]);
            setDistrict('');
            toast({
              title: 'Invalid Pincode',
              description: 'Could not find a location for this pincode.',
              variant: 'destructive',
            });
          }
        } catch (error) {
          console.error('Failed to fetch pincode data:', error);
          setPostOffices([]);
          setDistrict('');
          toast({
            title: 'API Error',
            description: 'Could not fetch location data. Please enter manually.',
            variant: 'destructive',
          });
        } finally {
          setIsPincodeLoading(false);
        }
      };
      fetchLocation();
    
  }, [pincode, toast]);

  const validateEmail = (emailToValidate: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(emailToValidate)) {
      setEmailError('');
      return true;
    }
    setEmailError('Please enter a valid email address.');
    return false;
  };

  const handleEmailBlur = () => {
    if (email) {
      validateEmail(email);
    }
  };


  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!email || !validateEmail(email)) {
      if (!email) {
        setEmailError('Email is required.');
      }
      return;
    }

    if (mobile.length !== 10) {
        toast({
            title: 'Invalid Mobile Number',
            description: 'Mobile number must be exactly 10 digits.',
            variant: 'destructive',
        });
        return;
    }

    if (!city || !district) {
        toast({
            title: 'Invalid Location',
            description: 'Please provide a valid pincode and select a city.',
            variant: 'destructive',
        });
        return;
    }

    setLoading(true);
    
    const fullLocation = `${address}, ${city}, ${district}, ${pincode}`;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userProfile = {
        name: fullName,
        email: email,
        mobile: mobile,
        location: fullLocation,
        role: role,
        walletBalance: 0,
        bankAccounts: [],
        ...(role === 'vle' ? { status: 'Pending', available: false, isAdmin: false } : { isAdmin: false }),
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

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        const userDocRef = doc(db, 'users', user.uid);
        const vleDocRef = doc(db, 'vles', user.uid);
        
        const userDocSnap = await getDoc(userDocRef);
        const vleDocSnap = await getDoc(vleDocRef);

        if (!userDocSnap.exists() && !vleDocSnap.exists()) {
            const userProfile = {
                name: user.displayName,
                email: user.email,
                mobile: user.phoneNumber || '',
                location: '',
                role: 'customer',
                walletBalance: 0,
                bankAccounts: [],
                isAdmin: false,
            };
            await setDoc(doc(db, 'users', user.uid), userProfile);
            toast({
                title: 'Registration Successful!',
                description: 'Your account has been created. Redirecting...',
            });
        } else {
            toast({
                title: 'Welcome Back!',
                description: 'You are already registered. Redirecting to dashboard...',
            });
        }
        router.push('/dashboard');
    } catch (error: any) {
        console.error("Google Sign-Up failed:", error);
        toast({
            title: 'Sign-Up Failed',
            description: error.message || 'Could not create account with Google. Please try again.',
            variant: 'destructive',
        });
    } finally {
        setGoogleLoading(false);
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
          <form onSubmit={handleFormSubmit} className="grid gap-4">
            <div className="grid gap-2 text-left">
              <Label className="text-blue-100">Register as</Label>
              <RadioGroup defaultValue="customer" value={role} onValueChange={setRole} className="flex gap-4 pt-1">
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
              <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} name="full-name" placeholder="John Doe" required className="bg-black/20 border-white/20 text-white placeholder:text-gray-400 focus:ring-white/50 h-11" />
            </div>
            <div className="grid gap-2 text-left">
              <Label htmlFor="email" className="text-blue-100">Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                placeholder="m@example.com" 
                required 
                className={cn(
                  "bg-black/20 border-white/20 text-white placeholder:text-gray-400 focus:ring-white/50 h-11",
                  emailError && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {emailError && <p className="text-sm text-destructive mt-1">{emailError}</p>}
            </div>
             <div className="grid gap-2 text-left">
              <Label htmlFor="password"  className="text-blue-100">Password</Label>
                <div className="relative">
                    <Input 
                        id="password" 
                        name="password" 
                        type={showPassword ? 'text' : 'password'} 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="••••••••" 
                        required 
                        className="bg-black/20 border-white/20 text-white placeholder:text-gray-400 focus:ring-white/50 h-11 pr-10"
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-0 h-11 w-11 text-gray-400 hover:text-white hover:bg-transparent"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                </div>
            </div>
            <div className="grid gap-2 text-left">
              <Label htmlFor="mobile" className="text-blue-100">Mobile Number</Label>
              <Input id="mobile" name="mobile" type="tel" maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} placeholder="9876543210" required className="bg-black/20 border-white/20 text-white placeholder:text-gray-400 focus:ring-white/50 h-11" />
            </div>
            <div className="grid gap-2 text-left">
                <Label htmlFor="pincode" className="text-blue-100">Pincode</Label>
                <div className="relative">
                    <Input id="pincode" name="pincode" type="text" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} placeholder="e.g., 403001" required className="bg-black/20 border-white/20 text-white placeholder:text-gray-400 focus:ring-white/50 h-11"/>
                    {isPincodeLoading && <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin" />}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2 text-left">
                    <Label htmlFor="city" className="text-blue-100">City</Label>
                     {postOffices.length > 1 ? (
                        <Select onValueChange={setCity} value={city} required>
                            <SelectTrigger id="city" className="bg-black/20 border-white/20 text-white placeholder:text-gray-400 focus:ring-white/50 h-11">
                                <SelectValue placeholder="Select your city" />
                            </SelectTrigger>
                            <SelectContent>
                                {postOffices.map((po) => (
                                    <SelectItem key={po.Name} value={po.Name}>{po.Name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Input id="city" name="city" value={city} placeholder="Auto-populated" readOnly required className="bg-black/10 border-white/20 text-white placeholder:text-gray-400 h-11 cursor-not-allowed" />
                    )}
                </div>
                <div className="grid gap-2 text-left">
                    <Label htmlFor="district" className="text-blue-100">District</Label>
                    <Input id="district" name="district" value={district} placeholder="Auto-populated" readOnly required className="bg-black/10 border-white/20 text-white placeholder:text-gray-400 h-11 cursor-not-allowed" />
                </div>
            </div>
            <div className="grid gap-2 text-left">
              <Label htmlFor="address" className="text-blue-100">Address (House No, Street)</Label>
              <Input id="address" name="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123, Main Street" required className="bg-black/20 border-white/20 text-white placeholder:text-gray-400 focus:ring-white/50 h-11" />
            </div>
            <Button type="submit" disabled={loading || isPincodeLoading || googleLoading} className="w-full bg-white text-blue-800 font-bold hover:bg-gray-200 h-12 text-base rounded-lg mt-2">
              {loading ? <Loader2 className="animate-spin" /> : 'Create an account'}
            </Button>
            {role === 'vle' && (
              <p className="text-xs text-center text-blue-200 mt-2">
                VLE accounts require admin approval after registration.
              </p>
            )}
          </form>
           <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-blue-800 px-2 text-blue-200">Or</span>
              </div>
            </div>

            <Button variant="outline" type="button" onClick={handleGoogleSignUp} disabled={loading || googleLoading} className="w-full bg-white/90 text-blue-800 font-bold hover:bg-white h-12 text-base rounded-lg">
                {googleLoading ? <Loader2 className="animate-spin" /> : <><GoogleIcon className="mr-2 h-5 w-5" /> Sign up with Google</>}
            </Button>
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
