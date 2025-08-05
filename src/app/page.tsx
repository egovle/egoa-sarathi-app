
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/ui/AppLogo';
import { FileText, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const services = [
  { name: 'Income Certificate', icon: FileText, description: 'Official proof of income for various financial applications.' },
  { name: 'Residence Certificate', icon: FileText, description: 'Verify your local residency for official purposes.' },
  { name: 'PAN Card Services', icon: FileText, description: 'Apply for a new PAN card or make corrections to an existing one.' },
];

const howItWorks = [
    { title: "Request", description: "Select a service and upload your documents online." },
    { title: "Process", description: "A local VLE processes your application with the government." },
    { title: "Receive", description: "Get your final certificate or document directly in your dashboard." },
]

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
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
            <Button asChild variant="ghost" size="sm">
                <Link href="/login">Login</Link>
            </Button>
            <Button asChild size="sm" className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
                <Link href="/register">Register</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative w-full py-20 md:py-32 lg:py-40">
            <div className="container px-4 md:px-6 z-10">
                <div className="grid gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_600px]">
                    <div className="flex flex-col justify-center space-y-6">
                        <div className="space-y-4">
                        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                            Your Digital Gateway to Goa's Citizen Services
                        </h1>
                        <p className="max-w-[600px] text-muted-foreground md:text-xl">
                            eGoa Sarathi simplifies access to government services, connecting you with local entrepreneurs for fast and transparent processing.
                        </p>
                        </div>
                        <div className="flex flex-col gap-2 min-[400px]:flex-row">
                            <Button asChild size="lg" className="shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
                                <Link href="/register">Get Started</Link>
                            </Button>
                        </div>
                    </div>
                     <Image
                        src="https://placehold.co/600x400.png"
                        alt="Hero"
                        width={600}
                        height={400}
                        className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last border-2 border-primary/20 shadow-2xl shadow-primary/10"
                        data-ai-hint="digital services government"
                    />
                </div>
            </div>
        </section>

        <section id="services" className="w-full py-12 md:py-24 bg-muted/40">
            <div className="container px-4 md:px-6">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="space-y-2">
                        <Badge variant="outline">Our Services</Badge>
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Streamlined for You</h2>
                        <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                            Access a wide range of essential government services through our easy-to-use platform.
                        </p>
                    </div>
                </div>
                <div className="mx-auto grid max-w-5xl items-start gap-8 py-12 sm:grid-cols-2 md:gap-12 lg:grid-cols-3">
                    {services.map((service) => (
                        <Card key={service.name} className="group overflow-hidden bg-card/50 hover:bg-card/90 transition-all duration-300 hover:shadow-primary/10 hover:-translate-y-2 hover:shadow-lg">
                            <CardHeader className="items-center">
                                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                                    <service.icon className="h-8 w-8 text-primary" />
                                </div>
                                <CardTitle>{service.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-center text-muted-foreground">{service.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>

        <section id="how-it-works" className="w-full py-12 md:py-24 bg-background">
            <div className="container px-4 md:px-6">
                 <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                    <div className="space-y-2">
                        <Badge variant="outline">How It Works</Badge>
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Simple. Fast. Transparent.</h2>
                    </div>
                </div>
                <div className="relative grid gap-10 px-10 pt-10 sm:grid-cols-3">
                    <div className="absolute left-1/2 top-[60px] hidden h-0.5 w-[calc(100%-10rem)] -translate-x-1/2 bg-border sm:block" />
                     {howItWorks.map((step, index) => (
                        <div key={step.title} className="relative flex flex-col items-center text-center">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-background text-lg font-bold text-primary">
                               {index + 1}
                            </div>
                            <h3 className="mb-2 text-xl font-bold">{step.title}</h3>
                            <p className="text-muted-foreground">{step.description}</p>
                        </div>
                    ))}
                </div>
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
