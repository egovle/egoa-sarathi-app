
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AppLogo = ({ className, iconClassName, subtitle }: { className?: string; iconClassName?: string, subtitle?: string }) => {
    return (
        <div className="flex flex-col items-center">
            <div className={cn("flex items-center gap-3 text-2xl font-bold tracking-tight text-primary", className)}>
                <ShieldCheck className={cn("h-8 w-8 hidden", iconClassName)} />
                <span>eGoa Sarathi</span>
            </div>
            {subtitle && <p className="text-sm text-muted-foreground -mt-1">{subtitle}</p>}
        </div>
    );
};
