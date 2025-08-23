
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState, type FormEvent, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { createUserWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AppLogo } from '@/components/ui/AppLogo';
import { ConfirmationResult } from 'firebase/auth';


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
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [pincode, setPincode] = useState('');
  const [postOffices, setPostOffices] = useState<PostOffice[]>([]);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [otp, setOtp] = useState('');

  // UI State
  const [step, setStep] = useState(1); // 1 for details, 2 for OTP
  const [loading, setLoading] = useState(false);
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isConfigMissing, setIsConfigMissing] = useState(false);
  const [isLocationManual, setIsLocationManual] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey || apiKey.startsWith('PASTE_YOUR')) {
      setIsConfigMissing(true);
    }
    
    // Make sure we're signed out when visiting the registration page
    signOut(auth);
  }, []);

  const fetchLocation = useCallback(async (searchPincode: string) => {
    setIsPincodeLoading(true);
    setIsLocationManual(false);
    setCity('');
    setDistrict('');
    setPostOffices([]);
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${searchPincode}`);
      const data = await response.json();
      if (data && data[0] && data[0].Status === 'Success') {
        const fetchedPostOffices: PostOffice[] = data[0].PostOffice;
        setPostOffices(fetchedPostOffices);
        setDistrict(fetchedPostOffices[0].District);
        if (fetchedPostOffices.length === 1) {
          setCity(fetchedPostOffices[0].Name);
        }
      } else {
        setIsLocationManual(true);
        toast({
          title: 'Invalid Pincode',
          description: 'Could not find a location. Please enter manually.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to fetch pincode data:', error);
      setIsLocationManual(true);
      toast({
        title: 'API Error',
        description: 'Could not fetch location data. Please enter manually.',
        variant: 'destructive',
      });
    } finally {
      setIsPincodeLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (pincode.length !== 6) {
      setCity('');
      setDistrict('');
      setPostOffices([]);
      setIsLocationManual(false);
      return;
    }
    const handler = setTimeout(() => {
      fetchLocation(pincode);
    }, 500);
    return () => clearTimeout(handler);
  }, [pincode, fetchLocation]);

  const sendOtp = useCallback(() => {
    setLoading(true);
    
    // Ensure the container is clean before rendering
    if (recaptchaContainerRef.current) {
        recaptchaContainerRef.current.innerHTML = '';
    }
    
    const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current!, {
        'size': 'normal', // Use the visible v2 checkbox
        'callback': () => {
            // reCAPTCHA solved, this callback is often where you enable the submit button
        },
        'expired-callback': () => {
            toast({ title: 'reCAPTCHA Expired', description: 'Please solve the reCAPTCHA again.', variant: 'destructive' });
        }
    });

    signInWithPhoneNumber(auth, `+91${mobile}`, verifier)
      .then((result) => {
        setConfirmationResult(result);
        toast({ title: 'OTP Sent', description: 'Please check your mobile for the verification code.' });
        setStep(2);
      }).catch((error) => {
        console.error("Error sending OTP:", error);
        toast({ title: 'OTP Send Error', description: 'Could not send verification code. Please check the mobile number and reCAPTCHA, then try again.', variant: 'destructive' });
        verifier.clear();
      }).finally(() => {
        setLoading(false);
      });
  }, [mobile, toast]);


  const handleDetailsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    if (mobile.length !== 10) {
        toast({ title: 'Invalid Mobile Number', description: 'Mobile number must be exactly 10 digits.', variant: 'destructive'});
        return;
    }
    if (!city || !district) {
        toast({ title: 'Invalid Location', description: 'Please provide a valid pincode and select a city.', variant: 'destructive' });
        return;
    }
    sendOtp();
  };
  
  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoading(true);

      if (!confirmationResult) {
          toast({ title: 'Verification Error', description: 'OTP confirmation failed. Please try again.', variant: 'destructive' });
          setLoading(false);
          return;
      }
      
      try {
          // This will throw an error if the code is invalid, and we won't proceed.
          await confirmationResult.confirm(otp);
          
          // Since mobile is verified, create the user account but with a temporary random password
          const tempPassword = Math.random().toString(36).slice(-8); // A simple random password
          const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
          const user = userCredential.user;

          // Send email verification
          await sendEmailVerification(user);

          // Now save profile to Firestore
          const fullLocation = `${address}, ${city}, ${district}, ${pincode}`;
          const isAdminUser = role === 'vle' && email === 'admin@egoasarthi.com';
          const userProfile = {
              name: fullName, email, mobile, pincode, location: fullLocation, role, walletBalance: 0,
              ...(role === 'vle' ? { status: isAdminUser ? 'Approved' : 'Pending', available: isAdminUser, isAdmin: isAdminUser, lastAssigned: {} } : { isAdmin: false }),
          };
          const collectionName = role === 'vle' ? 'vles' : (role === 'government' ? 'government' : 'users');
          await setDoc(doc(db, collectionName, user.uid), userProfile);
          
          toast({ title: 'Mobile Verified!', description: 'Please check your email for a verification link and set your password.' });

          // Redirect to set-password page
          router.push(`/set-password?email=${encodeURIComponent(email)}`);

      } catch (error: any) {
          console.error("OTP verification or user creation failed:", error);
          let errorMessage = 'Could not verify OTP. Please try again.';
          if (error.code === 'auth/invalid-verification-code') {
              errorMessage = 'The OTP you entered is invalid. Please check and try again.';
          } else if (error.code === 'auth/email-already-in-use') {
              errorMessage = 'An account with this email address already exists.';
          }
          toast({ title: 'Registration Failed', description: errorMessage, variant: 'destructive' });
          setLoading(false);
      }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4">
      <Card className="w-full max-w-sm bg-card/50">
        <CardHeader className="text-center">
            <Link href="/" className="mx-auto mb-4" prefetch={false}>
                <AppLogo className="justify-center" />
            </Link>
            <Button asChild variant="ghost" className="text-muted-foreground w-fit mx-auto -mt-2 mb-2">
                <Link href="/"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Home</Link>
            </Button>
            <CardTitle className="text-2xl tracking-tight">Register for eGoa Sarathi</CardTitle>
            <CardDescription>
                {step === 1 ? "Enter your details to create an account" : "Verify your mobile number to continue"}
            </CardDescription>
        </CardHeader>
        <CardContent>
          {isConfigMissing && (
            <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Configuration Error</AlertTitle>
                <AlertDescription>The app is not configured correctly. Please follow the instructions in the README file.</AlertDescription>
            </Alert>
          )}

          {step === 1 && (
              <form onSubmit={handleDetailsSubmit} className="grid gap-4">
                <div className="grid gap-2 text-left">
                  <Label>Register as</Label>
                  <RadioGroup defaultValue="customer" value={role} onValueChange={setRole} className="flex gap-4 pt-1">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="customer" id="r1" /><Label htmlFor="r1">Customer</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="vle" id="r2" /><Label htmlFor="r2">VLE</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="government" id="r3" /><Label htmlFor="r3">Government</Label></div>
                  </RadioGroup>
                </div>
                <div className="grid gap-2 text-left"><Label htmlFor="full-name">Full Name</Label><Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required /></div>
                <div className="grid gap-2 text-left">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => email && setEmailError(validateEmail(email) ? '' : 'Please enter a valid email address.')} placeholder="m@example.com" required className={cn(emailError && "border-destructive focus-visible:ring-destructive")} />
                  {emailError && <p className="text-sm text-destructive mt-1">{emailError}</p>}
                </div>
                <div className="grid gap-2 text-left"><Label htmlFor="mobile">Mobile Number</Label><Input id="mobile" type="tel" maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} placeholder="9876543210" required /></div>
                <div className="grid gap-2 text-left">
                    <Label htmlFor="pincode">Pincode</Label>
                    <div className="relative"><Input id="pincode" type="text" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} placeholder="e.g., 403001" required />{isPincodeLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin" />}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2 text-left">
                        <Label htmlFor="city">City</Label>
                        {postOffices.length > 1 ? (<Select onValueChange={setCity} value={city} required><SelectTrigger id="city"><SelectValue placeholder="Select your city" /></SelectTrigger><SelectContent>{postOffices.map((po) => (<SelectItem key={po.Name} value={po.Name}>{po.Name}</SelectItem>))}</SelectContent></Select>) : (<Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Auto-populated" required />)}
                    </div>
                    <div className="grid gap-2 text-left"><Label htmlFor="district">District</Label><Input id="district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Auto-populated" required /></div>
                </div>
                <div className="grid gap-2 text-left"><Label htmlFor="address">Address (House No, Street)</Label><Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123, Main Street" required /></div>
                
                <div ref={recaptchaContainerRef} className="flex justify-center my-2"></div>

                <Button type="submit" disabled={isPincodeLoading || isConfigMissing || loading} className="w-full mt-2">
                    {loading ? <Loader2 className="animate-spin" /> : 'Send OTP'}
                </Button>

                {role === 'vle' && (<p className="text-xs text-center text-muted-foreground mt-2">VLE accounts require admin approval after registration.</p>)}
              </form>
          )}

          {step === 2 && (
              <form onSubmit={handleOtpSubmit} className="grid gap-4">
                  <div className="grid gap-2 text-left">
                      <Label htmlFor="otp">Enter OTP</Label>
                      <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter 6-digit code" required maxLength={6} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                      {loading ? <Loader2 className="animate-spin" /> : 'Verify & Continue'}
                  </Button>
                  <Button variant="link" size="sm" onClick={() => {
                      setStep(1);
                      setConfirmationResult(null);
                  }}>Back to Details</Button>
              </form>
          )}

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Already have an account?{' '}</span>
            <Link href="/login" className={cn("underline font-semibold text-primary", isConfigMissing && "pointer-events-none opacity-50")} prefetch={false}>Log in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
