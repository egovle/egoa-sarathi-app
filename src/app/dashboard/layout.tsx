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
  ArrowLeft,
  X
} from "lucide-react"
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, writeBatch, getDocs, deleteDoc, orderBy } from "firebase/firestore";

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
import { SupportContent } from '@/components/dashboard/SupportContent';


const ALL_NAV_ITEMS = [
    { href: "/dashboard", icon: Home, label: "Dashboard", roles: ['admin', 'vle', 'customer', 'government'] },
    { href: "/dashboard/reports", icon: BarChart, label: "Reports", roles: ['admin', 'vle'] },
    { href: "/dashboard/camps", icon: Tent, label: "Camps", roles: ['admin', 'vle', 'customer', 'government'] },
    { href: "/dashboard/services", icon: ListPlus, label: "Service Management", roles: ['admin'] },
];

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

    const handleClearSingleNotification = async (notifId: string) => {
      if (!user) return;
      const notifRef = doc(db, "notifications", notifId);
      try {
        await deleteDoc(notifRef);
        toast({ title: 'Notification cleared.' });
      } catch (error) {
        console.error("Error clearing notification:", error);
        toast({ title: 'Error', description: 'Could not clear the notification.', variant: 'destructive' });
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
                        <SupportContent />
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
                            <div key={notif.id} className={cn("group relative p-3 rounded-md transition-colors hover:bg-muted", !notif.read && 'bg-primary/10')}>
                                <Link href={notif.link || '/dashboard'} className="block pr-6">
                                  <p className="font-semibold text-sm">{notif.title}</p>
                                  <p className="text-sm text-muted-foreground">{notif.description}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(notif.date), { addSuffix: true })}</p>
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleClearSingleNotification(notif.id);
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Clear notification</span>
                                </Button>
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
