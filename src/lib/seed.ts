// src/lib/seed.ts

// NOTE: This file now only exports the 'services' array for seeding.
// The seedDatabase function was moved to the client-side to ensure
// it runs with the proper authentication context.

// A list of common services to seed the database with.
export const services = [
  { name: 'PAN Card (New - Individual)', rate: 150, documents: ['Aadhaar Card', 'Photo', 'Signature'] },
  { name: 'PAN Card (Correction - Individual)', rate: 250, documents: ['Aadhaar Card', 'Existing PAN Card'] },
  { name: 'Passport Application', rate: 1500, documents: ['Aadhaar Card', 'Birth Certificate', 'Photo'] },
  { name: 'Driving License Application', rate: 1200, documents: ['Aadhaar Card', 'Photo', 'Form 1'] },
  { name: 'Voter ID Card', rate: 50, documents: ['Aadhaar Card', 'Photo'] },
  { name: 'Aadhaar Update (Demographic)', rate: 50, documents: ['Existing Aadhaar', 'Proof of Change (e.g., Bill)'] },
  { name: 'Aadhaar Update (Biometric)', rate: 100, documents: ['Existing Aadhaar'] },
  { name: 'Birth Certificate', rate: 200, documents: ['Hospital Record', 'Parent IDs'] },
  { name: 'Death Certificate', rate: 200, documents: ['Hospital Record', 'ID of Deceased'] },
  { name: 'Marriage Certificate', rate: 2000, documents: ["Aadhaar Cards (Bride & Groom)", "Witness IDs", "Wedding Photo"] },
  { name: 'Property Tax Payment', rate: 50, documents: ['Property ID', 'Last Receipt'] },
  { name: 'Water Bill Payment', rate: 20, documents: ['Consumer ID'] },
  { name: 'Electricity Bill Payment', rate: 20, documents: ['Consumer ID'] },
  { name: 'Gas Connection Booking', rate: 30, documents: ['Consumer ID'] },
  { name: 'Ration Card Services', rate: 100, documents: ['Aadhaar Card', 'Family Photo'] },
  { name: 'Income Certificate', rate: 120, documents: ['Aadhaar Card', 'Salary Slip'] },
  { name: 'Caste Certificate', rate: 120, documents: ['Aadhaar Card', "Father's Certificate"] },
  { name: 'Domicile Certificate', rate: 150, documents: ['Aadhaar Card', 'Proof of Residence'] },
];
