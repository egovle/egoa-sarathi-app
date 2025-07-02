
// src/lib/seed.ts

// This file now only exports the 'services' array for seeding.
// The seedDatabase function was moved to the client-side to ensure
// it runs with the proper authentication context.

// A list of common services to seed the database with, including a parent/child structure.
export const services = [
  // --- Parent Categories ---
  { id: 'pan', name: 'PAN Card Services', customerRate: 0, vleRate: 0, governmentFee: 0, documents: [], parentId: null, isVariable: true },
  { id: 'aadhaar', name: 'Aadhaar Card Services', customerRate: 0, vleRate: 0, governmentFee: 0, documents: [], parentId: null, isVariable: true },
  { id: 'certificates', name: 'Certificates', customerRate: 0, vleRate: 0, governmentFee: 0, documents: [], parentId: null, isVariable: true },
  { id: 'licenses', name: 'Licenses & Registrations', customerRate: 0, vleRate: 0, governmentFee: 0, documents: [], parentId: null, isVariable: true },
  { id: 'payments', name: 'Bill Payments', customerRate: 0, vleRate: 0, governmentFee: 0, documents: [], parentId: null, isVariable: true },
  
  // --- Sub-Categories ---
  
  // PAN Card Sub-categories
  { name: 'New PAN Card (Individual)', customerRate: 300, vleRate: 200, governmentFee: 107, documents: [
      { key: 'aadhar', label: 'Aadhaar Card' },
      { key: 'photo', label: 'Photo' },
      { key: 'signature', label: 'Signature' },
  ], parentId: 'pan', isVariable: false },
  { name: 'PAN Card Correction (Individual)', customerRate: 300, vleRate: 200, governmentFee: 107, documents: [
      { key: 'aadhar', label: 'Aadhaar Card' },
      { key: 'pan_card', label: 'Existing PAN Card' },
  ], parentId: 'pan', isVariable: false },
  { name: 'New PAN Card (Organization/Firm)', customerRate: 500, vleRate: 400, governmentFee: 107, documents: [
      { key: 'reg_cert', label: 'Registration Certificate' },
      { key: 'auth_signatory', label: 'Authorized Signatory Details' },
  ], parentId: 'pan', isVariable: false },
  
  // Aadhaar Sub-categories
  { name: 'Demographic Update (Name, Address, DOB)', customerRate: 100, vleRate: 70, governmentFee: 50, documents: [
      { key: 'aadhaar', label: 'Existing Aadhaar' },
      { key: 'proof_of_change', label: 'Proof of Change (e.g., Bill)' },
  ], parentId: 'aadhaar', isVariable: false },
  { name: 'Biometric Update (Photo, Fingerprints)', customerRate: 150, vleRate: 120, governmentFee: 100, documents: [
      { key: 'aadhaar', label: 'Existing Aadhaar' },
  ], parentId: 'aadhaar', isVariable: false },
  
  // Certificates Sub-categories
  { name: 'Birth Certificate Application', customerRate: 200, vleRate: 150, governmentFee: 0, documents: [
      { key: 'hospital_record', label: 'Hospital Record' },
      { key: 'parent_ids', label: 'Parent IDs' },
  ], parentId: 'certificates', isVariable: false },
  { name: 'Death Certificate Application', customerRate: 200, vleRate: 150, governmentFee: 0, documents: [
      { key: 'hospital_record', label: 'Hospital Record' },
      { key: 'id_of_deceased', label: 'ID of Deceased' },
  ], parentId: 'certificates', isVariable: false },
  { name: 'Marriage Certificate', customerRate: 2000, vleRate: 1800, governmentFee: 0, documents: [
      { key: 'aadhaar_bride_groom', label: 'Aadhaar Cards (Bride & Groom)' },
      { key: 'witness_ids', label: 'Witness IDs' },
      { key: 'wedding_photo', label: 'Wedding Photo' },
  ], parentId: 'certificates', isVariable: true },
  { name: 'Income Certificate', customerRate: 120, vleRate: 90, governmentFee: 0, documents: [
      { key: 'aadhaar', label: 'Aadhaar Card' },
      { key: 'salary_slip', label: 'Salary Slip' },
  ], parentId: 'certificates', isVariable: false },
  { name: 'Caste Certificate', customerRate: 120, vleRate: 90, governmentFee: 0, documents: [
      { key: 'aadhaar', label: 'Aadhaar Card' },
      { key: 'father_cert', label: "Father's Certificate" },
  ], parentId: 'certificates', isVariable: false },
  { name: 'Domicile Certificate', customerRate: 150, vleRate: 110, governmentFee: 0, documents: [
      { key: 'aadhaar', label: 'Aadhaar Card' },
      { key: 'residence_proof', label: 'Proof of Residence' },
  ], parentId: 'certificates', isVariable: false },

  // Licenses & Registrations Sub-categories
  { name: 'Passport Application', customerRate: 2000, vleRate: 1800, governmentFee: 1500, documents: [
      { key: 'aadhaar', label: 'Aadhaar Card' },
      { key: 'birth_cert', label: 'Birth Certificate' },
      { key: 'photo', label: 'Photo' },
  ], parentId: 'licenses', isVariable: false },
  { name: 'Driving License Application', customerRate: 1500, vleRate: 1300, governmentFee: 1200, documents: [
      { key: 'aadhaar', label: 'Aadhaar Card' },
      { key: 'photo', label: 'Photo' },
      { key: 'form_1', label: 'Form 1' },
  ], parentId: 'licenses', isVariable: false },
  { name: 'Voter ID Card Registration', customerRate: 50, vleRate: 30, governmentFee: 0, documents: [
      { key: 'aadhaar', label: 'Aadhaar Card' },
      { key: 'photo', label: 'Photo' },
  ], parentId: 'licenses', isVariable: false },
  { name: 'Ration Card Application', customerRate: 100, vleRate: 70, governmentFee: 0, documents: [
      { key: 'aadhaar', label: 'Aadhaar Card' },
      { key: 'family_photo', label: 'Family Photo' },
  ], parentId: 'licenses', isVariable: false },

  // Bill Payments Sub-categories
  { name: 'Property Tax Payment', customerRate: 50, vleRate: 30, governmentFee: 0, documents: [
      { key: 'property_id', label: 'Property ID' },
      { key: 'last_receipt', label: 'Last Receipt' },
  ], parentId: 'payments', isVariable: false },
  { name: 'Water Bill Payment', customerRate: 20, vleRate: 10, governmentFee: 0, documents: [
      { key: 'consumer_id', label: 'Consumer ID' },
  ], parentId: 'payments', isVariable: false },
  { name: 'Electricity Bill Payment', customerRate: 20, vleRate: 10, governmentFee: 0, documents: [
      { key: 'consumer_id', label: 'Consumer ID' },
  ], parentId: 'payments', isVariable: false },
  { name: 'Gas Connection Booking', customerRate: 30, vleRate: 20, governmentFee: 0, documents: [
      { key: 'consumer_id', label: 'Consumer ID' },
  ], parentId: 'payments', isVariable: false },
];
