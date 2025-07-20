
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AppLogo = ({ className, iconClassName }: { className?: string; iconClassName?: string }) => {
    return (
        <div className={cn("flex items-center gap-3 text-2xl font-bold tracking-tight text-primary", className)}>
            <ShieldCheck className={cn("h-8 w-8", iconClassName)} />
            <span>eGoa Sarathi</span>
        </div>
    );
};
