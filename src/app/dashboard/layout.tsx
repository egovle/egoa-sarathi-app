
'use client';

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Bell,
  LogOut,
  Check,
  PanelLeft,
  Home,
  BrainCircuit,
  LifeBuoy,
  Mail,
  Phone,
  Trash2,
  ListPlus,
  BarChart,
  Tent,
  ArrowLeft
} from "lucide-react"
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, writeBatch, getDocs, orderBy } from "firebase/firestore";

import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

const ALL_NAV_ITEMS = [
    { href: "/dashboard", icon: Home, label: "Dashboard", roles: ['admin', 'vle', 'customer', 'government'] },
    { href: "/dashboard/reports", icon: BarChart, label: "Reports", roles: ['admin', 'vle'] },
    { href: "/dashboard/camps", icon: Tent, label: "Camps", roles: ['admin', 'vle', 'customer', 'government'] },
    { href: "/dashboard/services", icon: ListPlus, label: "Service Management", roles: ['admin'] },
];

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.296-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
);

const SupportContent = () => (
    <div className="space-y-4">
        <a href="tel:+919834637587" className="flex items-center gap-3 group">
            <Phone className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors"/>
            <span className="text-sm">+91 9834637587</span>
        </a>
        <a href="mailto:nuteniqspl@gmail.com" className="flex items-center gap-3 group">
            <Mail className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors"/>
            <span className="text-sm">nuteniqspl@gmail.com</span>
        </a>
        <div className="flex gap-4 pt-2">
             <Button asChild size="sm" className="flex-1">
                <a href="tel:+919834637587"><Phone className="mr-2 h-4 w-4"/> Call Now</a>
            </Button>
             <Button asChild size="sm" variant="outline" className="flex-1">
                <a href="https://wa.me/+919834637587" target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="mr-2 h-5 w-5 fill-green-600"/> Chat</a>
            </Button>
        </div>
    </div>
);


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  
  const navItems = ALL_NAV_ITEMS.filter(item => {
    const userRole = userProfile?.isAdmin ? 'admin' : userProfile?.role;
    return userRole && item.roles.includes(userRole);
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("date", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [user]);

  const unreadNotifications = notifications.filter(n => !n.read).length;
  
  const pageTitles: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/dashboard/services': 'Service Management',
    '/dashboard/reports': 'Reports & Analytics',
    '/dashboard/camps': 'Camp Management',
  };

  const getPageTitle = (path: string) => {
    const isProfileTab = searchParams.get('tab') === 'profile';
    if (isProfileTab) {
        return 'My Profile';
    }
    if (path.startsWith('/dashboard/task/')) {
        return 'Task Details';
    }
    return pageTitles[path] || 'Dashboard';
  }

  const handleMarkAllRead = async () => {
    if (!user || unreadNotifications === 0) return;

    const batch = writeBatch(db);
    const unreadNotifIds = notifications.filter(n => !n.read).map(n => n.id);
    
    unreadNotifIds.forEach(notifId => {
      const notifRef = doc(db, "notifications", notifId);
      batch.update(notifRef, { read: true });
    });

    try {
      await batch.commit();
      toast({ title: 'Notifications marked as read.' });
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      toast({ title: 'Error', description: 'Could not mark notifications as read.', variant: 'destructive' });
    }
  };
  
  const handleClearAllNotifications = async () => {
      if (!user) return;

      const q = query(collection(db, "notifications"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast({ title: 'No notifications to clear.' });
        setIsClearAlertOpen(false);
        return;
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      try {
        await batch.commit();
        toast({ title: 'All notifications cleared.' });
      } catch (error) {
        console.error("Error clearing notifications:", error);
        toast({ title: 'Error', description: 'Could not clear notifications.', variant: 'destructive' });
      } finally {
        setIsClearAlertOpen(false);
      }
    };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({ title: 'Error', description: 'Failed to log out. Please try again.', variant: 'destructive' });
    }
  };

  const NavLink = ({ href, icon: Icon, label, isActive }: { href: string; icon: React.ElementType; label: string; isActive: boolean; }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={href}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
              isActive && "bg-accent text-accent-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="sr-only">{label}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const MobileNavLink = ({ href, icon: Icon, label, isActive }: { href: string; icon: React.ElementType; label: string; isActive: boolean; }) => (
     <Link
        href={href}
        className={cn(
            "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
            isActive && "bg-muted text-foreground"
        )}
        >
        <Icon className="h-5 w-5" />
        {label}
    </Link>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
       <AlertDialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete all of your notifications. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAllNotifications} className={buttonVariants({ variant: "destructive" })}>Clear All</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          {navItems.map(item => (
            <NavLink key={item.href} {...item} isActive={pathname === item.href || (item.href === '/dashboard' && pathname.startsWith('/dashboard/task'))} />
          ))}
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
            {!userProfile?.isAdmin && userProfile?.role !== 'government' && (
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
                            <LifeBuoy className="h-5 w-5" />
                            <span className="sr-only">Support</span>
                        </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" className="w-auto p-4">
                        <div className="grid gap-4">
                            <div className="space-y-1">
                                <h4 className="font-medium leading-none">Support</h4>
                                <p className="text-sm text-muted-foreground">
                                    Get help with our services.
                                </p>
                            </div>
                            <SupportContent />
                        </div>
                    </PopoverContent>
                </Popover>
            )}
        </nav>
      </aside>
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <SheetHeader className="sr-only">
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>
                  Main navigation links for the application.
                </SheetDescription>
              </SheetHeader>
              <nav className="grid gap-6 text-lg font-medium">
                {navItems.map(item => (
                    <MobileNavLink key={item.href} {...item} isActive={pathname === item.href} />
                ))}
                 {!userProfile?.isAdmin && userProfile?.role !== 'government' && (
                    <div className="mt-auto border-t p-4">
                        <div className="mb-4">
                            <h4 className="font-semibold">Support</h4>
                            <p className="text-sm text-muted-foreground">Get help with our services.</p>
                        </div>
                        <SupportContent />
                    </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Button>
            <h1 className="font-semibold text-lg">{getPageTitle(pathname)}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="relative rounded-full">
                    <Bell className="h-5 w-5" />
                    {unreadNotifications > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 shrink-0 justify-center rounded-full p-0 text-[10px]">
                        {unreadNotifications}
                      </Badge>
                    )}
                    <span className="sr-only">Toggle notifications</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[380px] p-0">
                    <div className="p-4 border-b">
                        <div className="flex items-center justify-between">
                           <div>
                              <h4 className="font-medium">Notifications</h4>
                              <p className="text-sm text-muted-foreground">You have {unreadNotifications} unread messages.</p>
                           </div>
                           <div className="flex items-center gap-2">
                              {unreadNotifications > 0 && (
                                  <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs">
                                      <Check className="mr-1 h-3 w-3" />
                                      Mark all as read
                                  </Button>
                              )}
                              {notifications.length > 0 && (
                                  <Button variant="ghost" size="sm" onClick={() => setIsClearAlertOpen(true)} className="text-xs text-destructive hover:text-destructive">
                                      <Trash2 className="mr-1 h-3 w-3" />
                                      Clear all
                                  </Button>
                               )}
                           </div>
                        </div>
                    </div>
                    <div className="space-y-1 p-2 max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notif) => (
                            <div key={notif.id} className={`p-3 rounded-md transition-colors hover:bg-muted ${!notif.read ? 'bg-primary/10' : 'bg-transparent'}`}>
                                <Link href={notif.link || '/dashboard'} className="block">
                                  <p className="font-semibold text-sm">{notif.title}</p>
                                  <p className="text-sm text-muted-foreground">{notif.description}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(notif.date), { addSuffix: true })}</p>
                                </Link>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-sm text-muted-foreground">
                              You have no new notifications.
                          </div>
                        )}
                    </div>
                </PopoverContent>
              </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard?tab=profile">Profile</Link>
                </DropdownMenuItem>
                {!userProfile?.isAdmin && userProfile?.role !== 'government' && (
                  <Dialog>
                      <DialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Support</DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-xs">
                          <DialogHeader>
                              <DialogTitle>Contact Support</DialogTitle>
                              <DialogDescription>
                              Reach out to us for any assistance.
                              </DialogDescription>
                          </DialogHeader>
                          <SupportContent />
                      </DialogContent>
                  </Dialog>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            {children}
        </main>
      </div>
    </div>
  )
}
