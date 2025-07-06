
// src/lib/seed.ts

// A list of common services to seed the database with, including the new document group structure.
export const services = [
  // --- Parent Category: PAN Card Services ---
  {
    id: 'pan',
    name: 'PAN Card Services',
    customerRate: 0,
    vleRate: 0,
    governmentFee: 0,
    documentGroups: [],
    parentId: null,
    isVariable: true
  },
  {
    name: 'New PAN Card (Individual)',
    customerRate: 300,
    vleRate: 200,
    governmentFee: 107,
    parentId: 'pan',
    isVariable: false,
    documentGroups: [
      {
        key: 'identity_proof',
        label: 'Identity Proof',
        minRequired: 1,
        options: [
          { key: 'pan_aadhaar', label: 'Aadhaar Card' },
          { key: 'pan_voterid', label: 'Voter ID Card' },
          { key: 'pan_dl', label: 'Driving License' },
        ]
      },
      {
        key: 'address_proof',
        label: 'Address Proof (Any 1)',
        minRequired: 1,
        options: [
          { key: 'addr_aadhaar', label: 'Aadhaar Card' },
          { key: 'addr_electricity_bill', label: 'Electricity Bill (Last 3 months)' },
          { key: 'addr_bank_statement', label: 'Bank Statement (Last 3 months)' },
        ]
      },
      {
        key: 'dob_proof',
        label: 'Date of Birth Proof (Any 1)',
        minRequired: 1,
        options: [
          { key: 'dob_birth_cert', label: 'Birth Certificate' },
          { key: 'dob_ssc_cert', label: 'SSC Certificate' },
          { key: 'dob_passport', label: 'Passport' },
        ]
      },
       {
        key: 'photograph',
        label: 'Recent Photograph',
        minRequired: 1,
        options: [
          { key: 'photo', label: 'Passport-size Photo' },
        ]
      }
    ]
  },
  
  // --- Parent Category: Certificates ---
  {
    id: 'certificates',
    name: 'Certificates',
    customerRate: 0,
    vleRate: 0,
    governmentFee: 0,
    documentGroups: [],
    parentId: null,
    isVariable: true
  },
  {
    name: 'Income Certificate',
    customerRate: 150,
    vleRate: 100,
    governmentFee: 0,
    parentId: 'certificates',
    isVariable: false,
    documentGroups: [
        {
            key: 'income_id_proof',
            label: 'Identity Proof',
            minRequired: 1,
            options: [{ key: 'id_aadhaar', label: 'Aadhaar Card' }]
        },
        {
            key: 'income_addr_proof',
            label: 'Address Proof',
            minRequired: 1,
            options: [{ key: 'addr_bill', label: 'Utility Bill' }]
        },
        {
            key: 'income_proof',
            label: 'Proof of Income',
            minRequired: 1,
            options: [
                { key: 'income_salary_slip', label: 'Salary Slip' },
                { key: 'income_itr', label: 'Income Tax Return' }
            ]
        }
    ]
  },

  // --- Parent Category: Licenses ---
  {
    id: 'licenses',
    name: 'Licenses & Registrations',
    customerRate: 0,
    vleRate: 0,
    governmentFee: 0,
    documentGroups: [],
    parentId: null,
    isVariable: true
  },
  {
    name: 'Driving License Application',
    customerRate: 1500,
    vleRate: 1300,
    governmentFee: 1200,
    parentId: 'licenses',
    isVariable: false,
    documentGroups: [
        {
            key: 'dl_age_proof',
            label: 'Age Proof',
            minRequired: 1,
            options: [
                { key: 'dl_birth_cert', label: 'Birth Certificate' },
                { key: 'dl_passport', label: 'Passport' },
            ]
        },
        {
            key: 'dl_addr_proof',
            label: 'Address Proof',
            minRequired: 1,
            options: [
                 { key: 'dl_aadhaar', label: 'Aadhaar Card' },
                 { key: 'dl_voter_id', label: 'Voter ID' },
            ]
        },
        {
            key: 'dl_forms',
            label: 'Required Forms & Photos',
            minRequired: 2,
            options: [
                 { key: 'dl_form_1', label: 'Form 1 (Self Declaration)' },
                 { key: 'dl_photo', label: 'Passport Photo' },
            ]
        }
    ]
  }
];
