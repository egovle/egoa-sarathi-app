// src/lib/seed.ts

// This file now only exports the 'services' array for seeding.
// The seedDatabase function was moved to the client-side to ensure
// it runs with the proper authentication context.

// A list of common services to seed the database with, including a parent/child structure.
export const services = [
  // --- Parent Categories ---
  { id: 'pan', name: 'PAN Card Services', rate: 0, documents: [], parentId: null },
  { id: 'aadhaar', name: 'Aadhaar Card Services', rate: 0, documents: [], parentId: null },
  { id: 'certificates', name: 'Certificates', rate: 0, documents: [], parentId: null },
  { id: 'licenses', name: 'Licenses & Registrations', rate: 0, documents: [], parentId: null },
  { id: 'payments', name: 'Bill Payments', rate: 0, documents: [], parentId: null },
  
  // --- Sub-Categories ---
  
  // PAN Card Sub-categories
  { name: 'New PAN Card (Individual)', rate: 150, documents: ['Aadhaar Card', 'Photo', 'Signature'], parentId: 'pan' },
  { name: 'PAN Card Correction (Individual)', rate: 250, documents: ['Aadhaar Card', 'Existing PAN Card'], parentId: 'pan' },
  { name: 'New PAN Card (Organization/Firm)', rate: 500, documents: ['Registration Certificate', 'Authorized Signatory Details'], parentId: 'pan' },
  
  // Aadhaar Sub-categories
  { name: 'Demographic Update (Name, Address, DOB)', rate: 50, documents: ['Existing Aadhaar', 'Proof of Change (e.g., Bill)'], parentId: 'aadhaar' },
  { name: 'Biometric Update (Photo, Fingerprints)', rate: 100, documents: ['Existing Aadhaar'], parentId: 'aadhaar' },
  
  // Certificates Sub-categories
  { name: 'Birth Certificate Application', rate: 200, documents: ['Hospital Record', 'Parent IDs'], parentId: 'certificates' },
  { name: 'Death Certificate Application', rate: 200, documents: ['Hospital Record', 'ID of Deceased'], parentId: 'certificates' },
  { name: 'Marriage Certificate (from ₹2000 to ₹10000)', rate: 2000, documents: ["Aadhaar Cards (Bride & Groom)", "Witness IDs", "Wedding Photo"], parentId: 'certificates' },
  { name: 'Income Certificate', rate: 120, documents: ['Aadhaar Card', 'Salary Slip'], parentId: 'certificates' },
  { name: 'Caste Certificate', rate: 120, documents: ['Aadhaar Card', "Father's Certificate"], parentId: 'certificates' },
  { name: 'Domicile Certificate', rate: 150, documents: ['Aadhaar Card', 'Proof of Residence'], parentId: 'certificates' },

  // Licenses & Registrations Sub-categories
  { name: 'Passport Application', rate: 1500, documents: ['Aadhaar Card', 'Birth Certificate', 'Photo'], parentId: 'licenses' },
  { name: 'Driving License Application', rate: 1200, documents: ['Aadhaar Card', 'Photo', 'Form 1'], parentId: 'licenses' },
  { name: 'Voter ID Card Registration', rate: 50, documents: ['Aadhaar Card', 'Photo'], parentId: 'licenses' },
  { name: 'Ration Card Application', rate: 100, documents: ['Aadhaar Card', 'Family Photo'], parentId: 'licenses' },

  // Bill Payments Sub-categories
  { name: 'Property Tax Payment', rate: 50, documents: ['Property ID', 'Last Receipt'], parentId: 'payments' },
  { name: 'Water Bill Payment', rate: 20, documents: ['Consumer ID'], parentId: 'payments' },
  { name: 'Electricity Bill Payment', rate: 20, documents: ['Consumer ID'], parentId: 'payments' },
  { name: 'Gas Connection Booking', rate: 30, documents: ['Consumer ID'], parentId: 'payments' },
];
