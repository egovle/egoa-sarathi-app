
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/ui/AppLogo';
import { Phone } from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/">
            <AppLogo />
          </Link>
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
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Privacy Policy</h1>
              <p className="max-w-[700px] text-muted-foreground md:text-xl">
                Last updated: [Date]
              </p>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24">
          <div className="container px-4 md:px-6 prose prose-lg max-w-4xl mx-auto">
            <h2>1. Introduction</h2>
            <p>Welcome to eGoa Sarathi. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>
            
            <h2>2. Information We Collect</h2>
            <p>We may collect personal information such as your name, email address, mobile number, pincode, address, and documents required for the specific services you request (e.g., Aadhaar card, PAN card).</p>

            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
                <li>Create and manage your account.</li>
                <li>Process your service requests and transactions.</li>
                <li>Communicate with you about your requests and our services.</li>
                <li>Facilitate communication between you, VLEs, and government administrators.</li>
                <li>Improve our platform and services.</li>
            </ul>

            <h2>4. Information Sharing</h2>
            <p>Your information is shared only as necessary to provide the services you request. This includes sharing your application details and documents with the assigned Village Level Entrepreneur (VLE) and relevant government departments for processing.</p>

            <h2>5. Data Security</h2>
            <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable.</p>

             <h2>6. Your Rights</h2>
            <p>You have the right to access, update, or delete your personal information through your profile dashboard. If you wish to delete your account permanently, please contact our support team.</p>

             <h2>7. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.</p>

             <h2>8. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:nuteniqspl@gmail.com">nuteniqspl@gmail.com</a>.</p>
          </div>
        </section>
      </main>

       <footer className="bg-muted py-6">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-center md:flex-row md:px-6">
          <div className="flex items-center gap-4">
            <AppLogo className="text-xl" iconClassName="h-6 w-6" />
          </div>
          <nav className="flex gap-4 sm:gap-6 text-sm">
            <Link className="text-muted-foreground hover:text-foreground" href="/about">About Us</Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/services">Services</Link>
            <Link className="font-semibold" href="/privacy">Privacy Policy</Link>
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
