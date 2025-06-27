'use client';

import Link from "next/link"
import {
  User,
  ShieldCheck,
  Bell,
  LogOut,
  Check,
} from "lucide-react"
import { useRouter } from "next/navigation";
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
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from 'date-fns';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  const unreadNotifications = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;

    // The orderBy('date') clause was removed to avoid a composite index requirement in Firestore.
    // Sorting is now handled on the client-side, which is efficient for a typical number of notifications.
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort notifications by date in descending order (newest first)
      notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [user]);

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

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-40">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
          >
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span>eGoa Sarathi</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-foreground transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
        </nav>
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <div className="ml-auto flex-1 sm:flex-initial" />
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
                          <div key={notif.id} className={`p-3 rounded-md transition-colors hover:bg-muted ${!notif.read ? 'bg-accent/50' : 'bg-transparent'}`}>
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
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>
    </div>
  )
}
