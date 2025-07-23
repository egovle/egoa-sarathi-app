
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/ui/AppLogo';
import { Phone, FileText } from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const serviceCategories = [
    { 
        name: 'Income & Residence', 
        services: ['Income Certificate', 'Residence Certificate', 'Economically Weaker Section (EWS) Certificate']
    },
    { 
        name: 'Identity & Travel',
        services: ['PAN Card Application', 'PAN Card Correction/Reprint', 'Passport Application Assistance']
    },
    {
        name: 'Business & Labour',
        services: ['Shop & Establishment Registration', 'Trade License Application', 'Labour Card Registration']
    },
    {
        name: 'Other Essential Services',
        services: ['Custom Service Request (Variable Rate)', 'Digital Document Attestation', 'Utility Bill Payments']
    }
];

export default function ServicesPage() {
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
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Our Services</h1>
              <p className="max-w-[700px] text-muted-foreground md:text-xl">
                A comprehensive list of citizen services available through the eGoa Sarathi platform.
              </p>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24">
            <div className="container px-4 md:px-6">
                <div className="mx-auto max-w-4xl">
                    <Accordion type="single" collapsible className="w-full">
                        {serviceCategories.map((category, index) => (
                             <AccordionItem value={`item-${index}`} key={category.name}>
                                <AccordionTrigger className="text-lg font-semibold">{category.name}</AccordionTrigger>
                                <AccordionContent>
                                    <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                        {category.services.map(service => <li key={service}>{service}</li>)}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
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
            <Link className="font-semibold" href="/services">Services</Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/privacy">Privacy Policy</Link>
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
