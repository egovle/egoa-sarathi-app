
export interface BaseProfile {
    id: string;
    name: string;
    email: string;
    mobile: string;
    pincode: string;
    location: string;
    walletBalance: number;
}

export interface CustomerProfile extends BaseProfile {
    role: 'customer';
    isAdmin: false;
}

export interface VLEProfile extends BaseProfile {
    role: 'vle';
    isAdmin: false;
    status: 'Pending' | 'Approved';
    available: boolean;
    offeredServices?: string[];
    lastAssigned?: { [serviceId: string]: string }; // ISO string date
}

export interface AdminProfile extends BaseProfile {
    role: 'admin';
    isAdmin: true;
}

export interface GovernmentProfile extends BaseProfile {
    role: 'government';
    isAdmin: false;
}

export type UserProfile = CustomerProfile | VLEProfile | AdminProfile | GovernmentProfile;


// --- New Document Structures ---

export type AllowedFileTypes = 'pdf' | 'png' | 'jpg';

export interface DocumentOption {
    key: string;
    label: string;
    type: 'document' | 'text';
    isOptional: boolean;
    allowedFileTypes?: AllowedFileTypes[];
    placeholder?: string;
}

export interface DocumentGroup {
    key: string;
    label: string;
    isOptional: boolean;
    minRequired?: number;
    type: 'documents' | 'text';
    options: DocumentOption[];
}

// --------------------------


export interface Service {
    id:string;
    name: string;
    customerRate: number;
    vleRate: number;
    governmentFee: number;
    documentGroups: DocumentGroup[];
    parentId: string | null;
    isVariable: boolean;
}

export interface HistoryEntry {
    timestamp: string;
    actorId: string;
    actorRole: 'Admin' | 'VLE' | 'Customer' | 'System';
    action: string;
    details: string;
}

export interface Document {
    name: string;
    url: string;
}

export interface TaskDocument extends Document {
    groupKey: string;
    optionKey: string;
}

export interface Complaint {
    text: string;
    status: 'Open' | 'Responded';
    response: {
        text: string;
        date: string;
        documents?: Document[];
    } | null;
    documents?: Document[];
    date: string;
}

export interface Feedback {
    rating: number;
    comment: string;
    date: string;
}

export interface Task {
    id: string;
    customer: string;
    customerAddress: string;
    customerMobile: string;
    customerEmail?: string;
    customerPincode: string;
    service: string;
    serviceId: string;
    date: string; // ISO String
    status: 'Pending Price Approval' | 'Awaiting Payment' | 'Unassigned' | 'Pending VLE Acceptance' | 'Assigned' | 'Awaiting Documents' | 'In Progress' | 'Completed' | 'Paid Out' | 'Complaint Raised';
    totalPaid: number;
    governmentFeeApplicable: number;
    customerRate: number;
    vleRate: number;
    history: HistoryEntry[];
    acknowledgementNumber: string | null;
    complaint: Complaint | null;
    feedback: Feedback | null;
    type: 'Customer Request' | 'VLE Lead';
    assignedVleId: string | null;
    assignedVleName: string | null;
    creatorId: string;
    documents?: TaskDocument[]; // Updated to TaskDocument
    finalCertificate: Document | null;
    formData?: { [key: string]: string };
}

export interface CampVLE {
    vleId: string;
    status: 'pending' | 'accepted' | 'rejected';
    approvedBy?: string; // Admin who assigned this VLE
}

export interface CampPayout {
    vleId: string;
    vleName: string;
    amount: number;
    paidAt: string;
    paidBy: string;
}

export interface Camp {
    id: string;
    name: string;
    location: string;
    date: string; // ISO String
    status: 'Upcoming' | 'Completed' | 'Cancelled' | 'Paid Out';
    type: 'created' | 'suggested'; // Distinguishes admin-created from VLE-suggested
    services: string[];
    otherServices?: string;
    assignedVles: CampVLE[];
    payouts?: CampPayout[];
    adminEarnings?: number;
}

export interface CampSuggestion {
    id: string;
    location: string;
    date: string; // ISO String
    suggestedBy: {
        id: string;
        name: string;
    };
    services: string[];
    otherServices?: string;
}

export interface PaymentRequest {
    id: string;
    userId: string;
    userName: string;
    userRole: 'vle' | 'customer';
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    date: string; // ISO String
    approvedBy?: string;
    approvedAt?: string; // ISO String
}

export interface Notification {
    id: string;
    userId: string;
    title: string;
    description: string;
    link?: string;
    read: boolean;
    date: string; // ISO String
}

export interface User {
  uid: string;
  email: string | null;
  // Add any other properties you expect from a Firebase User object
}
