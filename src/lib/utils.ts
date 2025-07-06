
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type Task } from "@/lib/types";
import { VLE_COMMISSION_RATE, ADMIN_COMMISSION_RATE } from "@/lib/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fileValidationConfig = {
    allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'],
    maxSize: 1 * 1024 * 1024, // 1 MB
};

export const validateFiles = (files: File[]): { isValid: boolean, message?: string } => {
    for (const file of files) {
        if (!fileValidationConfig.allowedTypes.includes(file.type)) {
            return { isValid: false, message: `Invalid file type: ${file.name}. Only PNG, JPG, JPEG, and PDF are allowed.` };
        }
        if (file.size > fileValidationConfig.maxSize) {
            return { isValid: false, message: `File is too large: ${file.name}. Maximum size is 1MB.` };
        }
    }
    return { isValid: true };
};

export const calculateVleEarnings = (task: Task) => {
    const totalPaid = parseFloat(task.totalPaid.toString());
    const governmentFee = parseFloat(task.governmentFeeApplicable?.toString() || '0');

    const serviceProfit = totalPaid - governmentFee;
    const vleCommission = serviceProfit * VLE_COMMISSION_RATE;
    const adminCommission = serviceProfit * ADMIN_COMMISSION_RATE;
    
    return { 
        governmentFee, 
        vleCommission, 
        adminCommission, 
        commissionRate: VLE_COMMISSION_RATE 
    };
};
