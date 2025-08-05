
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
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Privacy Policy</h1>
              <p className="max-w-[700px] text-muted-foreground md:text-xl">
                Last updated: [Date]
              </p>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24">
          <div className="container px-4 md:px-6 prose prose-lg max-w-4xl mx-auto">
            <p>Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.</p>
            
            <h2>1. Information We Collect</h2>
            <p>We may collect the following types of information from you:</p>
            <ul>
                <li><strong>Personal Identification Details:</strong> Full name, address, date of birth, gender, etc.</li>
                <li><strong>Contact Information:</strong> Email address, phone number</li>
                <li><strong>Service-Specific Information:</strong> Details and documents necessary for the specific service you request.</li>
                <li><strong>Payment Information:</strong> Details necessary to process your payment (handled securely by our third-party payment processors)</li>
            </ul>
            <p>We collect this information solely to process your service request and deliver our services.</p>

            <h2>2. How We Use Your Information</h2>
            <p>Your information is used for:</p>
            <ul>
                <li>Fulfilling your service requests</li>
                <li>Contacting you with updates or requests for additional information</li>
                <li>Providing customer support and assistance</li>
                <li>Verifying your identity or information (if required for the service)</li>
                <li>Internal record-keeping and compliance with applicable laws</li>
            </ul>
            <p>We do not sell, rent, or trade your personal information to any third party for marketing purposes.</p>

            <h2>3. Data Sharing and Disclosure</h2>
            <p>We may share your information with:</p>
            <ul>
                <li>Third-party service providers who help us deliver our services (e.g., hosting, payment processors, delivery partners), under strict confidentiality agreements</li>
                <li>Authorities if required by law, subpoena, or legal process</li>
            </ul>

            <h2>4. Data Security</h2>
            <p>We implement reasonable administrative, technical, and physical safeguards to protect your personal data from unauthorized access, loss, misuse, or disclosure.</p>
            <p>However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.</p>

             <h2>5. Data Retention</h2>
            <p>We retain your information only for as long as needed to fulfill the purpose for which it was collected, or as required by law. After this period, your data will be securely deleted or anonymized.</p>

             <h2>6. Your Rights</h2>
            <p>You may request to:</p>
            <ul>
                <li>Access the personal data we hold about you</li>
                <li>Correct inaccurate or outdated information</li>
                <li>Request deletion of your data (subject to legal limitations)</li>
                <li>Withdraw consent where applicable</li>
            </ul>
            <p>To exercise your rights, please contact us at <a href="mailto:nuteniqspl@gmail.com">nuteniqspl@gmail.com</a>.</p>

             <h2>7. Cookies and Tracking Technologies</h2>
            <p>Our website may use cookies or similar technologies to enhance user experience, analyze traffic, and improve our services. You can control cookie preferences through your browser settings.</p>

            <h2>8. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with the revised effective date. Continued use of our services after changes indicates your acceptance of the updated policy.</p>

            <h2>9. Contact Us</h2>
            <p>If you have any questions or concerns about this Privacy Policy, please contact:</p>
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
            <Link className="font-semibold" href="/privacy">Privacy Policy</Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/terms">Terms & Conditions</Link>
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
