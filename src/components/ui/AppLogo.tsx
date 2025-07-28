
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AppLogo = ({ className, iconClassName, subtitle }: { className?: string; iconClassName?: string, subtitle?: string }) => {
    return (
        <div className="flex flex-col items-center">
            <div className={cn("flex items-center gap-2 text-lg font-semibold", className)}>
                <ShieldCheck className={cn("h-6 w-6 text-primary", iconClassName)} />
                <span>eGoa Sarathi</span>
            </div>
            {subtitle && <p className="text-xs text-muted-foreground -mt-1">{subtitle}</p>}
        </div>
    );
};
