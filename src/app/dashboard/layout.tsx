'use client';

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  ShieldCheck,
  Bell,
  LogOut,
  Check,
  PanelLeft,
  Home,
  BrainCircuit,
  LifeBuoy
} from "lucide-react"
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, writeBatch } from "firebase/firestore";

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/dashboard/extract", icon: BrainCircuit, label: "Smart Extractor" },
];


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  const unreadNotifications = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [user]);
  
  const pageTitles: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/dashboard/extract': 'Smart Information Extractor',
  };

  const getPageTitle = (path: string) => {
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
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href="/"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <ShieldCheck className="h-4 w-4 transition-all group-hover:scale-110" />
            <span className="sr-only">eGoa Sarathi</span>
          </Link>
          {NAV_ITEMS.map(item => (
            <NavLink key={item.href} {...item} isActive={pathname === item.href} />
          ))}
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
           <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="#"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                  >
                    <LifeBuoy className="h-5 w-5" />
                    <span className="sr-only">Support</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Support</TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
              <nav className="grid gap-6 text-lg font-medium">
                <Link
                  href="/"
                  className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                >
                  <ShieldCheck className="h-5 w-5 transition-all group-hover:scale-110" />
                  <span className="sr-only">eGoa Sarathi</span>
                </Link>
                {NAV_ITEMS.map(item => (
                    <MobileNavLink key={item.href} {...item} isActive={pathname === item.href} />
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="relative ml-auto flex-1 md:grow-0">
             <h1 className="font-semibold text-xl">{getPageTitle(pathname)}</h1>
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
                         {unreadNotifications > 0 && (
                            <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs">
                                <Check className="mr-1 h-3 w-3" />
                                Mark all as read
                            </Button>
                         )}
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
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            {children}
        </main>
      </div>
    </div>
  )
}
