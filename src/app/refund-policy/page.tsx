
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/ui/AppLogo';
import { Phone, ChevronDown } from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';

export default function RefundPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/">
            <AppLogo />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <Link className="text-foreground/60 transition-colors hover:text-foreground" href="/about">About Us</Link>
            <Link className="text-foreground/60 transition-colors hover:text-foreground" href="/services">Services</Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-foreground/60 transition-colors hover:text-foreground focus:outline-none">
                Policies <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link href="/privacy">Privacy Policy</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/terms">Terms & Conditions</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/refund-policy">Refund Policy</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
                <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
                <Link href="/register">Register</Link>
            </Button>
          </div>
        </div>
      </header>
       <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Refund Policy</h1>
               <p className="max-w-[700px] text-muted-foreground md:text-xl">
                Last updated: July 26, 2024
              </p>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24">
          <div className="container px-4 md:px-6 max-w-4xl mx-auto">
             <Card className="p-6 md:p-8">
                <CardContent className="prose prose-lg max-w-none">
                    <p>Please read our refund policy carefully before making any purchase.</p>

                    <h2>Our Policy</h2>
                    <p>At eGoa Sarathi, we strive to provide the best service possible. Please note the following regarding refunds:</p>
                    <ul>
                        <li>We do not provide any refunds once the payment is made.</li>
                        <li>All sales are final. We encourage you to carefully review your service selection before making a payment.</li>
                    </ul>
                    <p>If you have any questions or concerns about our services, please contact us prior to making a purchase.</p>
                    
                    <h2>Contact Us</h2>
                    <p>If you have any questions regarding this policy, please contact us:</p>
                    <p>📧 Email: <a href="mailto:nuteniqspl@gmail.com">nuteniqspl@gmail.com</a></p>
                    <p>📞 Phone: <a href="tel:+918380083832">+91 8380083832</a></p>
                </CardContent>
             </Card>
          </div>
        </section>
      </main>

       <footer className="bg-muted py-6">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-center md:flex-row md:px-6">
          <div className="flex items-center gap-4">
            <AppLogo className="text-xl" iconClassName="h-6 w-6" />
          </div>
          <nav className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm">
            <Link className="text-muted-foreground hover:text-foreground" href="/about">About Us</Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/services">Services</Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/privacy">Privacy Policy</Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/terms">Terms & Conditions</Link>
            <Link className="font-semibold" href="/refund-policy">Refund Policy</Link>
          </nav>
          <div className="flex items-center gap-4 text-muted-foreground">
            <a href="tel:+918380083832" className="flex items-center gap-2 hover:text-foreground transition-colors">
                <Phone className="h-4 w-4" />
                <span>+91 8380083832</span>
            </a>
            <a href="https://wa.me/+918380083832" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                <WhatsAppIcon className="h-5 w-5" />
                <span className="sr-only">WhatsApp</span>
            </a>
         </div>
        </div>
      </footer>
    </div>
  );
}
