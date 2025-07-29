
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
  LifeBuoy,
  Trash2,
  ListPlus,
  BarChart,
  Tent,
  ArrowLeft,
  X,
  Briefcase,
  FilePlus,
  Users,
  Settings,
  Building,
} from "lucide-react"
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, writeBatch, getDocs, deleteDoc } from "firebase/firestore";

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
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/ui/AppLogo";
import { SupportContent } from '@/components/dashboard/SupportContent';
import type { Notification } from "@/lib/types";


const ALL_NAV_ITEMS = [
    { href: "/dashboard", icon: Home, label: "Home", roles: ['admin', 'vle', 'customer', 'government'] },
    { href: "/dashboard/task-management", icon: Briefcase, label: "Task Management", roles: ['vle'] },
    { href: "/dashboard/lead-management", icon: FilePlus, label: "Lead Management", roles: ['vle'] },
    { href: "/dashboard/reports", icon: BarChart, label: "Reports", roles: ['admin', 'vle'] },
    { href: "/dashboard/camps", icon: Tent, label: "Camps", roles: ['admin', 'vle', 'customer', 'government'] },
    { href: "/dashboard/services", icon: ListPlus, label: "Services", roles: ['admin'] },
    { href: "/dashboard/users", icon: Users, label: "User Management", roles: ['admin'] },
    { href: "/dashboard/settings", icon: Settings, label: "Settings", roles: ['admin', 'vle', 'customer', 'government']},
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  
  const navItems = ALL_NAV_ITEMS.filter(item => {
    const userRole = userProfile?.isAdmin ? 'admin' : userProfile?.role;
    return userRole && item.roles.includes(userRole);
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Notification);
      // Sort on the client to avoid needing a composite index
      notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [user]);

  const unreadNotifications = notifications.filter(n => !n.read).length;
  
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
  
  const isLinkActive = (href: string) => {
    if (href === '/dashboard') {
        return pathname === href;
    }
     // Special case for settings to match profile tab
    if (href === '/dashboard/settings') {
        return pathname === '/dashboard' && useSearchParams().get('tab') === 'profile';
    }
    return pathname.startsWith(href);
  }

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string; }) => {
    const finalHref = href === '/dashboard/settings' ? '/dashboard?tab=profile' : href;
    return (
        <Link
            href={finalHref}
            className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground/80 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isLinkActive(href) && "bg-sidebar-accent text-sidebar-accent-foreground"
            )}
        >
            <Icon className="h-4 w-4" />
            {label}
        </Link>
    )
  };

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
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
        
        <aside className="hidden border-r bg-sidebar md:block">
            <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex h-14 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6">
                    <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                        <AppLogo className="text-white" iconClassName="text-white" />
                    </Link>
                </div>
                <div className="flex-1">
                    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                       {navItems.map(item => (
                            <NavLink key={item.href} {...item} />
                        ))}
                    </nav>
                </div>
                {!userProfile?.isAdmin && userProfile?.role !== 'government' && (
                    <div className="mt-auto p-4 border-t border-sidebar-border">
                        <Card className="bg-sidebar-accent/20 border-sidebar-accent/50 text-sidebar-foreground">
                            <CardHeader className="p-2 pt-0 md:p-4">
                               <CardTitle>Need Help?</CardTitle>
                               <CardDescription className="text-sidebar-foreground/70">Contact our support team for any assistance.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
                                <SupportContent/>
                            </CardContent>
                        </Card>
                    </div>
                 )}
            </div>
        </aside>

        <div className="flex flex-col">
            <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                            <PanelLeft className="h-5 w-5" />
                            <span className="sr-only">Toggle navigation menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="flex flex-col bg-sidebar text-sidebar-foreground p-0">
                        <div className="flex h-14 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6">
                            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                                <AppLogo className="text-white" iconClassName="text-white" />
                            </Link>
                        </div>
                        <nav className="grid gap-2 text-base font-medium p-4">
                             {navItems.map(item => (
                                <NavLink key={item.href} {...item} />
                            ))}
                        </nav>
                         {!userProfile?.isAdmin && userProfile?.role !== 'government' && (
                            <div className="mt-auto p-4 border-t border-sidebar-border">
                                <Card className="bg-sidebar-accent/20 border-sidebar-accent/50 text-sidebar-foreground">
                                   <CardHeader>
                                       <CardTitle>Need Help?</CardTitle>
                                       <CardDescription className="text-sidebar-foreground/70">Contact our support team for any assistance.</CardDescription>
                                   </CardHeader>
                                   <CardContent>
                                       <SupportContent/>
                                   </CardContent>
                                </Card>
                            </div>
                         )}
                    </SheetContent>
                </Sheet>

                <div className="w-full flex-1">
                   {/* Optional: Add search bar here if needed in header */}
                </div>

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
                        <DropdownMenuLabel>{userProfile?.name || 'My Account'}</DropdownMenuLabel>
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
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
                {children}
            </main>
        </div>
    </div>
  )
}
