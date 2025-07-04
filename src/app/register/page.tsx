
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
import { Loader2, ShieldCheck, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type PostOffice = {
  Name: string;
  District: string;
  State: string;
};

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isConfigMissing, setIsConfigMissing] = useState(false);
  const [isLocationManual, setIsLocationManual] = useState(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      setIsConfigMissing(true);
    }
  }, []);

  useEffect(() => {
    if (pincode.length !== 6) {
      setCity('');
      setDistrict('');
      setPostOffices([]);
      setIsLocationManual(false);
      return;
    }

      const fetchLocation = async () => {
        setIsPincodeLoading(true);
        setIsLocationManual(false);
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
          } else {
            setPostOffices([]);
            setDistrict('');
            setIsLocationManual(true);
            toast({
              title: 'Invalid Pincode',
              description: 'Could not find a location for this pincode. Please enter manually.',
              variant: 'destructive',
            });
          }
        } catch (error) {
          console.error('Failed to fetch pincode data:', error);
          setPostOffices([]);
          setDistrict('');
          setIsLocationManual(true);
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

  const handleEmailBlur = () => {
    if (email) {
      if (validateEmail(email)) {
        setEmailError('');
      } else {
        setEmailError('Please enter a valid email address.');
      }
    }
  };


  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!email || !validateEmail(email)) {
      if (!email) setEmailError('Email is required.');
      else setEmailError('Please enter a valid email address.');
      return;
    }
    
    if (postOffices.length > 1 && !city) {
        toast({
            title: 'City Required',
            description: 'Please select your city from the dropdown.',
            variant: 'destructive',
        });
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4">
       <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Link href="/" className="inline-block p-3 bg-primary/20 rounded-full" prefetch={false}>
                <ShieldCheck className="h-8 w-8 text-primary" />
            </Link>
          </div>
          <CardTitle className="text-2xl text-center tracking-tight">Register for eGoa Sarathi</CardTitle>
          <CardDescription className="text-center">Enter your details below to create an account</CardDescription>
        </CardHeader>
        <CardContent>
          {isConfigMissing && (
            <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Configuration Error</AlertTitle>
                <AlertDescription>
                Your Firebase API Key is missing. Please ask the administrator to configure the application before you can register.
                </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleFormSubmit} className="grid gap-4">
            <div className="grid gap-2 text-left">
              <Label>Register as</Label>
              <RadioGroup defaultValue="customer" value={role} onValueChange={setRole} className="flex gap-4 pt-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="customer" id="r1" />
                  <Label htmlFor="r1">Customer</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vle" id="r2" />
                  <Label htmlFor="r2">VLE</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid gap-2 text-left">
              <Label htmlFor="full-name">Full Name</Label>
              <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} name="full-name" placeholder="John Doe" required />
            </div>
            <div className="grid gap-2 text-left">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                placeholder="m@example.com" 
                required 
                className={cn(emailError && "border-destructive focus-visible:ring-destructive")}
              />
              {emailError && <p className="text-sm text-destructive mt-1">{emailError}</p>}
            </div>
             <div className="grid gap-2 text-left">
              <Label htmlFor="password">Password</Label>
                <div className="relative">
                    <Input 
                        id="password" 
                        name="password" 
                        type={showPassword ? 'text' : 'password'} 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="••••••••" 
                        required 
                        className="pr-10"
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
            <div className="grid gap-2 text-left">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input id="mobile" name="mobile" type="tel" maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} placeholder="9876543210" required />
            </div>
            <div className="grid gap-2 text-left">
                <Label htmlFor="pincode">Pincode</Label>
                <div className="relative">
                    <Input id="pincode" name="pincode" type="text" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} placeholder="e.g., 403001" required />
                    {isPincodeLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin" />}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2 text-left">
                    <Label htmlFor="city">City</Label>
                     {isLocationManual ? (
                        <Input id="city" name="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Enter your city" required />
                     ) : postOffices.length > 1 ? (
                        <Select onValueChange={setCity} value={city} required>
                            <SelectTrigger id="city"><SelectValue placeholder="Select your city" /></SelectTrigger>
                            <SelectContent>
                                {postOffices.map((po) => (
                                    <SelectItem key={po.Name} value={po.Name}>{po.Name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Input id="city" name="city" value={city} placeholder="Auto-populated" readOnly required className="bg-muted/50 cursor-not-allowed" />
                    )}
                </div>
                <div className="grid gap-2 text-left">
                    <Label htmlFor="district">District</Label>
                     {isLocationManual ? (
                        <Input id="district" name="district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Enter your district" required />
                     ) : (
                        <Input id="district" name="district" value={district} placeholder="Auto-populated" readOnly required className="bg-muted/50 cursor-not-allowed" />
                     )}
                </div>
            </div>
            <div className="grid gap-2 text-left">
              <Label htmlFor="address">Address (House No, Street)</Label>
              <Input id="address" name="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123, Main Street" required />
            </div>
            <Button type="submit" disabled={loading || isPincodeLoading || isConfigMissing} className="w-full mt-2">
              {loading ? <Loader2 className="animate-spin" /> : 'Create an account'}
            </Button>
            {role === 'vle' && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                VLE accounts require admin approval after registration.
              </p>
            )}
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Already have an account?{' '}</span>
            <Link href="/" className={cn("underline font-semibold text-primary", isConfigMissing && "pointer-events-none opacity-50")} prefetch={false}>
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
