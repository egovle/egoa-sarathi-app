
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type Task } from "@/lib/types";
import { VLE_COMMISSION_RATE, ADMIN_COMMISSION_RATE } from "@/lib/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fileValidationConfig = {
    allowedTypes: ['application/pdf', 'image/png', 'image/jpeg'],
    maxPdfSize: 1 * 1024 * 1024, // 1 MB
    maxImageSize: 100 * 1024, // 100 KB
};

export const validateFiles = (files: File[], allowedMimeTypes?: string[]): { isValid: boolean, message?: string } => {
    const validMimeTypes = Array.isArray(allowedMimeTypes) && allowedMimeTypes.length > 0
        ? allowedMimeTypes
        : fileValidationConfig.allowedTypes;
    
    const friendlyTypeList = validMimeTypes.map(m => m.split('/')[1].toUpperCase()).join(', ');

    for (const file of files) {
        if (!validMimeTypes.includes(file.type)) {
            return { isValid: false, message: `Invalid file type: ${file.name}. Only ${friendlyTypeList} are allowed.` };
        }
        if (file.type === 'application/pdf' && file.size > fileValidationConfig.maxPdfSize) {
            return { isValid: false, message: `File is too large: ${file.name}. PDFs must be under 1MB.` };
        }
        if ((file.type === 'image/jpeg' || file.type === 'image/png') && file.size > fileValidationConfig.maxImageSize) {
             return { isValid: false, message: `File is too large: ${file.name}. Images (PNG, JPG) must be under 100KB.` };
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
