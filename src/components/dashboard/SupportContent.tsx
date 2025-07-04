'use client';

import { Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';


export const SupportContent = () => (
    <div className="space-y-4">
        <a href="tel:+919834637587" className="flex items-center gap-3 group">
            <Phone className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors"/>
            <span className="text-sm">+91 9834637587</span>
        </a>
        <a href="mailto:nuteniqspl@gmail.com" className="flex items-center gap-3 group">
            <Mail className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors"/>
            <span className="text-sm">nuteniqspl@gmail.com</span>
        </a>
        <div className="flex gap-4 pt-2">
             <Button asChild size="sm" className="flex-1">
                <a href="tel:+919834637587"><Phone className="mr-2 h-4 w-4"/> Call Now</a>
            </Button>
             <Button asChild size="sm" variant="outline" className="flex-1">
                <a href="https://wa.me/+919834637587" target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="mr-2 h-5 w-5 fill-green-600"/> Chat</a>
            </Button>
        </div>
    </div>
);
