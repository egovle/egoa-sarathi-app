
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Wallet, PlusCircle, Edit, Loader2 } from 'lucide-react';
import { AddBalanceRequestDialog } from './dialogs/AddBalanceRequestDialog';

import { createNotificationForAdmins } from '@/app/actions';
import type { UserProfile, Service, VLEProfile } from '@/lib/types';


export default function ProfileView({ userId, profileData, services }: { userId: string, profileData: UserProfile, services: Service[]}) {
    const { toast } = useToast();
    const { user, userProfile } = useAuth();
    
    // Profile Edit State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileFormState, setProfileFormState] = useState({
        name: profileData?.name || '',
        mobile: profileData?.mobile || '',
        location: profileData?.location || '',
    });
    const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);

    // Offered Services state
    const [offeredServices, setOfferedServices] = useState<string[]>((profileData as VLEProfile).offeredServices || []);
    const [isSavingServices, setIsSavingServices] = useState(false);
    
    const userRole = profileData.isAdmin ? 'admin' : profileData.role;

    useEffect(() => {
        if (profileData.role === 'vle') {
            setOfferedServices((profileData as VLEProfile).offeredServices || []);
        }
        setProfileFormState({
            name: profileData.name || '',
            mobile: profileData.mobile || '',
            location: profileData.location || '',
        });
    }, [userId, profileData]);

    const handleBalanceRequest = async (amount: number) => {
        if (!user || !userProfile) return;
        
        await addDoc(collection(db, "paymentRequests"), {
            userId: user.uid,
            userName: userProfile.name,
            userRole: userProfile.role || 'customer',
            amount,
            status: 'pending',
            date: new Date().toISOString()
        });
        
        toast({ title: 'Request Submitted', description: 'Your request to add balance has been sent to an admin for verification.' });
        
        await createNotificationForAdmins('New Balance Request', `${userProfile.name} has requested to add ₹${amount.toFixed(2)} to their wallet.`);
    };

    const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        if (id === 'mobile') {
            setProfileFormState(prevState => ({ ...prevState, mobile: value.replace(/\D/g, '') }));
        } else {
            setProfileFormState(prevState => ({ ...prevState, [id]: value }));
        }
    };

    const handleSaveProfile = async () => {
        setIsSavingProfile(true);

        if (profileFormState.mobile.length !== 10) {
            toast({ title: "Invalid Mobile Number", description: "Mobile number must be 10 digits.", variant: "destructive"});
            setIsSavingProfile(false);
            return;
        }
        
        let collectionName = 'users';
        if (userRole === 'vle' || userRole === 'admin') collectionName = 'vles';
        if (userRole === 'government') collectionName = 'government';

        const docRef = doc(db, collectionName, userId);
        try {
            await updateDoc(docRef, {
                name: profileFormState.name,
                mobile: profileFormState.mobile,
                location: profileFormState.location,
            });
            toast({ title: "Profile Updated", description: "Your details have been successfully saved." });
            setIsEditingProfile(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            toast({ title: "Error", description: "Could not update your profile.", variant: "destructive" });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleCancelEditProfile = () => {
        setIsCancelAlertOpen(true);
    };

    const confirmCancelEdit = () => {
        setProfileFormState({
            name: profileData.name,
            mobile: profileData.mobile,
            location: profileData.location,
        });
        setIsEditingProfile(false);
        setIsCancelAlertOpen(false);
    };

    const handleServiceSelectionChange = (serviceId: string, checked: boolean) => {
        setOfferedServices(prev => 
            checked ? [...prev, serviceId] : prev.filter(id => id !== serviceId)
        );
    }

    const handleSaveOfferedServices = async () => {
        if (offeredServices.length === 0) {
            toast({
                title: "At least one service required",
                description: "As a VLE, you must offer at least one service.",
                variant: "destructive",
            });
            return;
        }

        setIsSavingServices(true);
        const docRef = doc(db, "vles", userId);
        try {
            await updateDoc(docRef, { offeredServices: offeredServices });
            toast({ title: "Services Updated", description: "Your offered services have been saved." });
        } catch (error) {
            console.error("Error updating services:", error);
            toast({ title: "Error", description: "Could not save your services.", variant: "destructive" });
        } finally {
            setIsSavingServices(false);
        }
    }

    const serviceCategories = React.useMemo(() => {
        const parents = services.filter(s => !s.parentId);
        return parents.map(parent => ({
            ...parent,
            children: services.filter(s => s.parentId === parent.id)
        })).sort((a,b) => a.name.localeCompare(b.name));
    }, [services]);

    if (!profileData) {
        return <div>Loading profile...</div>;
    }

    return (
    <div className="space-y-6">
        <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have unsaved changes. Are you sure you want to discard them?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Keep Editing</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmCancelEdit}>Discard</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        
        {userRole !== 'government' && (
            <Card>
                <CardHeader className='flex-row items-center justify-between'>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-muted-foreground" />
                        <span>Wallet Balance</span>
                    </CardTitle>
                    {userRole !== 'admin' && (
                        <AddBalanceRequestDialog 
                            trigger={<Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4"/>Add Balance</Button>}
                            onBalanceRequest={handleBalanceRequest}
                        />
                    )}
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">₹{profileData.walletBalance?.toFixed(2) || '0.00'}</div>
                    <p className="text-xs text-muted-foreground">Available balance</p>
                </CardContent>
            </Card>
        )}


        <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Profile Details</span>
                            {!isEditingProfile && (
                                <Button variant="ghost" size="icon" onClick={() => setIsEditingProfile(true)}><Edit className="h-4 w-4" /></Button>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isEditingProfile ? (
                            <>
                                <div className="space-y-2"><Label htmlFor="name">Full Name</Label><Input id="name" value={profileFormState.name} onChange={handleProfileInputChange} /></div>
                                <div className="space-y-2"><Label htmlFor="email">Email Address</Label><Input id="email" type="email" value={profileData.email} readOnly disabled className="bg-muted/50" /></div>
                                <div className="space-y-2"><Label htmlFor="mobile">Mobile Number</Label><Input id="mobile" value={profileFormState.mobile} onChange={handleProfileInputChange} maxLength={10} /></div>
                                <div className="space-y-2"><Label htmlFor="location">Location</Label><Input id="location" value={profileFormState.location} onChange={handleProfileInputChange} /></div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2"><Label>Full Name</Label><p className="text-sm p-2 bg-muted/50 rounded-md min-h-9">{profileData.name}</p></div>
                                <div className="space-y-2"><Label>Email Address</Label><p className="text-sm p-2 bg-muted/50 rounded-md min-h-9">{profileData.email}</p></div>
                                <div className="space-y-2"><Label>Mobile Number</Label><p className="text-sm p-2 bg-muted/50 rounded-md min-h-9">{profileData.mobile}</p></div>
                                <div className="space-y-2"><Label>Location</Label><p className="text-sm p-2 bg-muted/50 rounded-md min-h-9">{profileData.location}</p></div>
                            </>
                        )}
                    </CardContent>
                    {isEditingProfile && (
                        <CardFooter className="justify-end gap-2">
                            <Button variant="outline" onClick={handleCancelEditProfile}>Cancel</Button>
                            <Button onClick={handleSaveProfile} disabled={isSavingProfile}>{isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
                        </CardFooter>
                    )}
                </Card>

            </div>
            
            {userRole === 'vle' && (
                <Card>
                    <CardHeader><CardTitle>My Services</CardTitle><CardDescription>Select the services you are qualified to offer.</CardDescription></CardHeader>
                    <CardContent className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {serviceCategories.map(category => (
                            <div key={category.id} className="space-y-3">
                                <h4 className="font-semibold text-base">{category.name}</h4>
                                <div className="pl-4 space-y-2">
                                    {category.children.map(service => (
                                        <div key={service.id} className="flex items-center space-x-2">
                                            <Checkbox id={`service-offer-${service.id}`} checked={offeredServices.includes(service.id)} onCheckedChange={(checked) => handleServiceSelectionChange(service.id, !!checked)} />
                                            <Label htmlFor={`service-offer-${service.id}`} className="font-normal cursor-pointer">{service.name}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter><Button onClick={handleSaveOfferedServices} disabled={isSavingServices || offeredServices.length === 0}>{isSavingServices && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save My Services</Button></CardFooter>
                </Card>
            )}
        </div>
    </div>
    );
}
