import Link from "next/link"
import {
  User,
  ShieldCheck,
  Bell,
} from "lucide-react"

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

const notifications = [
    { title: "New Task Assigned", description: "Task #SS-83472 assigned to Suresh Kumar.", date: "5 min ago", read: false },
    { title: "Complaint Received", description: "Complaint raised for Task #SS-84621 by Ravi Sharma.", date: "1 hour ago", read: false },
    { title: "VLE Application", description: "Anjali Desai has applied to be a VLE.", date: "2 hours ago", read: true },
    { title: "Feedback Received", description: "5-star feedback for Task #SS-93715.", date: "1 day ago", read: true },
];
const unreadNotifications = notifications.filter(n => !n.read).length;


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
              <PopoverContent align="end" className="w-[350px] p-0">
                  <div className="p-4 border-b">
                      <h4 className="font-medium">Notifications</h4>
                      <p className="text-sm text-muted-foreground">You have {unreadNotifications} unread messages.</p>
                  </div>
                  <div className="space-y-1 p-2 max-h-80 overflow-y-auto">
                      {notifications.map((notif, i) => (
                          <div key={i} className={`p-2 rounded-md transition-colors hover:bg-muted ${!notif.read ? 'bg-accent/50' : 'bg-transparent'}`}>
                              <p className="font-semibold text-sm">{notif.title}</p>
                              <p className="text-sm text-muted-foreground">{notif.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">{notif.date}</p>
                          </div>
                      ))}
                  </div>
                  <div className="p-2 border-t text-center">
                    <Button variant="link" size="sm">View all notifications</Button>
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
              <DropdownMenuItem>Logout</DropdownMenuItem>
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
