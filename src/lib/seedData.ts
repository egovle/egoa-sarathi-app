
export const defaultServices = [
  // --- Income Certificate ---
  {
    id: 'income_certificate',
    name: 'Income Certificate',
    customerRate: 0,
    vleRate: 0,
    governmentFee: 0,
    documentGroups: [],
    parentId: null,
    isVariable: false
  },
  {
    id: 'income_new_application',
    name: 'New Application',
    customerRate: 150,
    vleRate: 100,
    governmentFee: 0,
    documentGroups: [
      {
        key: 'identity_proof',
        label: 'Identity Proof',
        isOptional: false,
        minRequired: 1,
        type: 'documents',
        options: [
          { key: 'aadhaar_card', label: 'Aadhaar Card', type: 'document', isOptional: false, allowedFileTypes: ['pdf', 'png', 'jpg'] },
          { key: 'voter_id_card', label: 'Voter Id card', type: 'document', isOptional: true, allowedFileTypes: ['pdf', 'png', 'jpg'] },
          { key: 'driving_licence', label: 'Driving Licence', type: 'document', isOptional: true, allowedFileTypes: ['pdf', 'png', 'jpg'] },
        ],
      },
      {
        key: 'residence_proof',
        label: 'Residence Proof',
        isOptional: false,
        minRequired: 1,
        type: 'documents',
        options: [
          { key: 'residence_certificate', label: 'Residence Certificate', type: 'document', isOptional: false, allowedFileTypes: ['pdf', 'png', 'jpg'] },
          { key: 'passport_copy', label: 'Passport Copy', type: 'document', isOptional: true, allowedFileTypes: ['pdf', 'png', 'jpg'] },
          { key: 'other_residence_proof', label: 'Any Other Residence Proof', type: 'document', isOptional: true, allowedFileTypes: ['pdf', 'png', 'jpg'] },
        ],
      },
      {
        key: 'age_proof',
        label: 'Age Proof',
        isOptional: false,
        minRequired: 1,
        type: 'documents',
        options: [
            { key: 'birth_certificate', label: 'Birth Certificate', type: 'document', isOptional: true, allowedFileTypes: ['pdf', 'png', 'jpg'] },
            { key: 'school_leaving_certificate', label: 'School Leaving Certificate', type: 'document', isOptional: true, allowedFileTypes: ['pdf', 'png', 'jpg'] },
        ]
      },
      {
        key: 'photograph',
        label: 'Photograph',
        isOptional: false,
        minRequired: 1,
        type: 'documents',
        options: [
          { key: 'photograph', label: 'Photograph', type: 'document', isOptional: false, allowedFileTypes: ['jpg', 'png'] },
        ],
      },
      {
        key: 'self_declaration',
        label: 'Self Declaration',
        isOptional: false,
        minRequired: 1,
        type: 'documents',
        options: [
          { key: 'self_declaration_format', label: 'Self Declaration Format', type: 'document', isOptional: false, allowedFileTypes: ['pdf', 'png', 'jpg'] },
        ],
      }
    ],
    parentId: 'income_certificate',
    isVariable: false
  },

  // --- Residence Certificate ---
  {
    id: 'residence_certificate',
    name: 'Residence Certificate',
    customerRate: 0,
    vleRate: 0,
    governmentFee: 0,
    documentGroups: [],
    parentId: null,
    isVariable: false
  },
  {
    id: 'residence_new_application',
    name: 'New Application',
    customerRate: 150,
    vleRate: 100,
    governmentFee: 0,
    documentGroups: [
        {
            key: 'identity_proof',
            label: 'Identity Proof',
            isOptional: false,
            minRequired: 1,
            type: 'documents',
            options: [
              { key: 'aadhaar_card', label: 'Aadhaar Card', type: 'document', isOptional: false, allowedFileTypes: ['pdf', 'png', 'jpg'] },
              { key: 'voter_id_card', label: 'Voter Id card', type: 'document', isOptional: true, allowedFileTypes: ['pdf', 'png', 'jpg'] },
            ],
        },
        {
            key: 'age_proof',
            label: 'Age Proof',
            isOptional: false,
            minRequired: 1,
            type: 'documents',
            options: [
                { key: 'birth_certificate', label: 'Birth Certificate', type: 'document', isOptional: false, allowedFileTypes: ['pdf', 'png', 'jpg'] },
                { key: 'school_leaving_certificate', label: 'School Leaving Certificate', type: 'document', isOptional: true, allowedFileTypes: ['pdf', 'png', 'jpg'] },
            ]
        },
        {
            key: 'photograph',
            label: 'Photograph',
            isOptional: false,
            minRequired: 1,
            type: 'documents',
            options: [
              { key: 'photograph', label: 'Photograph', type: 'document', isOptional: false, allowedFileTypes: ['jpg', 'png'] },
            ],
        },
    ],
    parentId: 'residence_certificate',
    isVariable: false,
  },
   
  // --- PAN Card Services ---
  {
    id: 'pan_card_services',
    name: 'PAN Card Services',
    customerRate: 0,
    vleRate: 0,
    governmentFee: 0,
    documentGroups: [],
    parentId: null,
    isVariable: false
  },
  {
    id: 'pan_new_application',
    name: 'New Application (Form 49A)',
    customerRate: 200,
    vleRate: 100,
    governmentFee: 107,
    documentGroups: [
        {
            key: 'identity_proof',
            label: 'Identity Proof',
            isOptional: false,
            minRequired: 1,
            type: 'documents',
            options: [
              { key: 'aadhaar_card', label: 'Aadhaar Card', type: 'document', isOptional: false, allowedFileTypes: ['pdf', 'png', 'jpg'] }
            ]
        },
        {
            key: 'address_proof',
            label: 'Address Proof',
            isOptional: false,
            minRequired: 1,
            type: 'documents',
            options: [
              { key: 'aadhaar_card', label: 'Aadhaar Card', type: 'document', isOptional: false, allowedFileTypes: ['pdf', 'png', 'jpg'] }
            ]
        },
        {
            key: 'date_of_birth_proof',
            label: 'Date of Birth Proof',
            isOptional: false,
            minRequired: 1,
            type: 'documents',
            options: [
              { key: 'aadhaar_card', label: 'Aadhaar Card', type: 'document', isOptional: false, allowedFileTypes: ['pdf', 'png', 'jpg'] }
            ]
        },
        {
            key: 'photograph',
            label: 'Photograph',
            isOptional: false,
            minRequired: 1,
            type: 'documents',
            options: [
              { key: 'photograph', label: 'Photograph', type: 'document', isOptional: false, allowedFileTypes: ['jpg', 'png'] }
            ]
        }
    ],
    parentId: 'pan_card_services',
    isVariable: false
  },
   {
    id: 'pan_correction',
    name: 'Correction/Reprint',
    customerRate: 200,
    vleRate: 100,
    governmentFee: 107,
    documentGroups: [],
    parentId: 'pan_card_services',
    isVariable: true
  },
  
  // --- Other ---
  {
    id: 'other_services',
    name: 'Other Services',
    customerRate: 0,
    vleRate: 0,
    governmentFee: 0,
    documentGroups: [],
    parentId: null,
    isVariable: false
  },
   {
    id: 'other_variable',
    name: 'Custom Service Request',
    customerRate: 0, // Admin sets this
    vleRate: 0, // Admin sets this
    governmentFee: 0, // Admin sets this
    documentGroups: [],
    parentId: 'other_services',
    isVariable: true
  }
];
