
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/ui/AppLogo';
import { Phone } from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';

export default function TermsPage() {
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
            <Link className="text-foreground/60 transition-colors hover:text-foreground" href="/privacy">Privacy Policy</Link>
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
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Terms and Conditions</h1>
              <p className="max-w-[700px] text-muted-foreground md:text-xl">
                Last updated: [Date]
              </p>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24">
          <div className="container px-4 md:px-6 prose prose-lg max-w-4xl mx-auto">
            <p>Welcome to eGoa Sarathi. Please read these Terms and Conditions ("Terms") carefully before using our website or services. By accessing or using our platform, you agree to be bound by these Terms.</p>
            
            <h2>1. Services Provided</h2>
            <p>eGoa Sarathi is an independent service provider that facilitates a variety of services including photo/video shoots, CCTV installations, web design, printing, and other miscellaneous services as listed on our platform.</p>
            <p>We assist in:</p>
            <ul>
                <li>Service consultation and requirement gathering</li>
                <li>Project preparation and planning</li>
                <li>Coordination and processing support</li>
                <li>Customer support throughout the service delivery process</li>
            </ul>

            <h2>2. User Responsibilities</h2>
            <p>By using our services, you agree to:</p>
            <ul>
                <li>Provide accurate, current, and complete information relevant to the service requested</li>
                <li>Provide any necessary materials or information in a timely manner</li>
                <li>Cooperate with any verification processes if required for the service</li>
                <li>Not misuse or attempt to exploit the services provided</li>
            </ul>
            <p>Any false, misleading, or incomplete information may result in the termination of your service and/or legal action.</p>

            <h2>3. Payment and Refunds</h2>
            <p>All services must be paid for in advance, unless otherwise specified for a particular service.</p>
            <p>Please refer to our <Link href="/refund-policy">Refund Policy</Link> for details on refunds. Generally, refunds are not provided once the service process has begun.</p>

            <h2>4. Service Timelines</h2>
            <p>We aim to complete your service request as quickly as possible. Actual completion times may vary depending on the nature and complexity of the service, as well as other external factors. Any estimated timelines provided are indicative and not guaranteed.</p>
            
            <h2>5. Privacy Policy</h2>
            <p>Your privacy is important to us. Any personal information you provide will be used only for the purposes of processing your service request and supporting your needs. We do not sell, share, or rent your data to third parties except as necessary to provide the requested service or as required by law.</p>
            <p>Read our full <Link href="/privacy">Privacy Policy</Link> for more details.</p>

            <h2>6. Intellectual Property</h2>
            <p>All content on this website—including text, graphics, logos, and service names—is the property of eGoa Sarathi and is protected by applicable copyright and trademark laws. Any materials provided by you for service completion remain your property or the property of their respective owners.</p>

            <h2>7. Limitation of Liability</h2>
            <p>eGoa Sarathi is not liable for:</p>
            <ul>
              <li>Any delays or issues caused by third-party providers or external factors beyond our direct control</li>
              <li>User mistakes in providing information, specifications, or materials for services</li>
              <li>Loss or damage resulting from the use of our services, except where due to our gross negligence</li>
            </ul>
            <p>Our liability is limited to the amount paid by the customer for the specific service in question.</p>
            
            <h2>8. Governing Law</h2>
            <p>These Terms are governed by and construed in accordance with the laws of Goa, India, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.</p>

            <h2>9. Changes to Terms</h2>
            <p>We may update these Terms and Conditions at any time. Any changes will be posted on this page with the revised effective date. Continued use of our services after changes implies acceptance of the updated Terms.</p>

            <h2>10. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us:</p>
            <p>📧 Email: <a href="mailto:nuteniqspl@gmail.com">nuteniqspl@gmail.com</a></p>
            <p>📞 Phone: <a href="tel:+918380083832">+91 8380083832</a></p>
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
            <Link className="font-semibold" href="/terms">Terms & Conditions</Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/refund-policy">Refund Policy</Link>
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
