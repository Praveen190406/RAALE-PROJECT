/**
 * Patient Registry — 20 patients across 5 wards.
 * Each patient has a ward assignment and a list of high-risk drug IDs.
 */
export const PATIENTS = [
  /* ── Ward 7 – Cardiology ──────────────────────────── */
  {
    id: 'P001',
    displayName: 'Patient 7C-04',
    wardId: 'W7',
    ward: 'Ward 7 – Cardiology',
    bed: '7C-04',
    age: 67,
    conditions: ['Atrial Fibrillation', 'Congestive Heart Failure'],
    medications: ['D001', 'D005'],        // Warfarin, Digoxin
    baseRiskScore: 88,
  },
  {
    id: 'P002',
    displayName: 'Patient 7C-11',
    wardId: 'W7',
    ward: 'Ward 7 – Cardiology',
    bed: '7C-11',
    age: 74,
    conditions: ['Ventricular Arrhythmia', 'Hypertension'],
    medications: ['D007', 'D001'],        // Amiodarone, Warfarin
    baseRiskScore: 91,
  },
  {
    id: 'P003',
    displayName: 'Patient 7B-02',
    wardId: 'W7',
    ward: 'Ward 7 – Cardiology',
    bed: '7B-02',
    age: 59,
    conditions: ['Pulmonary Embolism'],
    medications: ['D002'],                // Heparin
    baseRiskScore: 84,
  },
  {
    id: 'P004',
    displayName: 'Patient 7A-08',
    wardId: 'W7',
    ward: 'Ward 7 – Cardiology',
    bed: '7A-08',
    age: 82,
    conditions: ['Heart Failure', 'CKD Stage 3'],
    medications: ['D005', 'D006'],        // Digoxin, Insulin Glargine
    baseRiskScore: 79,
  },

  /* ── Ward 4 – Oncology ────────────────────────────── */
  {
    id: 'P005',
    displayName: 'Patient 4B-11',
    wardId: 'W4',
    ward: 'Ward 4 – Oncology',
    bed: '4B-11',
    age: 51,
    conditions: ['Non-Hodgkin Lymphoma'],
    medications: ['D003', 'D002'],        // Methotrexate, Heparin
    baseRiskScore: 92,
  },
  {
    id: 'P006',
    displayName: 'Patient 4C-07',
    wardId: 'W4',
    ward: 'Ward 4 – Oncology',
    bed: '4C-07',
    age: 45,
    conditions: ['Breast Cancer', 'Transplant recipient'],
    medications: ['D011', 'D003'],        // Tacrolimus, Methotrexate
    baseRiskScore: 90,
  },
  {
    id: 'P007',
    displayName: 'Patient 4A-03',
    wardId: 'W4',
    ward: 'Ward 4 – Oncology',
    bed: '4A-03',
    age: 63,
    conditions: ['CML', 'Rheumatoid Arthritis'],
    medications: ['D003', 'D009'],        // Methotrexate, Vancomycin
    baseRiskScore: 83,
  },
  {
    id: 'P008',
    displayName: 'Patient 4D-14',
    wardId: 'W4',
    ward: 'Ward 4 – Oncology',
    bed: '4D-14',
    age: 38,
    conditions: ['ALL', 'Post-BMT'],
    medications: ['D011', 'D009'],        // Tacrolimus, Vancomycin
    baseRiskScore: 88,
  },

  /* ── Ward 3 – Surgical ────────────────────────────── */
  {
    id: 'P009',
    displayName: 'Patient 3A-02',
    wardId: 'W3',
    ward: 'Ward 3 – Surgical',
    bed: '3A-02',
    age: 44,
    conditions: ['Post-op Hip Replacement', 'DVT prophylaxis'],
    medications: ['D002', 'D010'],        // Heparin, Morphine
    baseRiskScore: 76,
  },
  {
    id: 'P010',
    displayName: 'Patient 3B-09',
    wardId: 'W3',
    ward: 'Ward 3 – Surgical',
    bed: '3B-09',
    age: 55,
    conditions: ['Bowel resection', 'Type 2 DM'],
    medications: ['D006', 'D010'],        // Insulin Glargine, Morphine
    baseRiskScore: 74,
  },
  {
    id: 'P011',
    displayName: 'Patient 3C-05',
    wardId: 'W3',
    ward: 'Ward 3 – Surgical',
    bed: '3C-05',
    age: 70,
    conditions: ['Vascular Surgery', 'AF'],
    medications: ['D001', 'D014'],        // Warfarin, Ketamine
    baseRiskScore: 81,
  },
  {
    id: 'P012',
    displayName: 'Patient 3D-12',
    wardId: 'W3',
    ward: 'Ward 3 – Surgical',
    bed: '3D-12',
    age: 48,
    conditions: ['Emergency laparotomy', 'Sepsis'],
    medications: ['D009', 'D010'],        // Vancomycin, Morphine
    baseRiskScore: 77,
  },

  /* ── Ward 6 – Neurology ───────────────────────────── */
  {
    id: 'P013',
    displayName: 'Patient 6D-08',
    wardId: 'W6',
    ward: 'Ward 6 – Neuro',
    bed: '6D-08',
    age: 32,
    conditions: ['Epilepsy', 'Status Epilepticus (resolving)'],
    medications: ['D004'],                // Phenytoin
    baseRiskScore: 85,
  },
  {
    id: 'P014',
    displayName: 'Patient 6A-01',
    wardId: 'W6',
    ward: 'Ward 6 – Neuro',
    bed: '6A-01',
    age: 65,
    conditions: ['Bipolar Disorder', 'Ischaemic Stroke'],
    medications: ['D008', 'D001'],        // Lithium, Warfarin
    baseRiskScore: 87,
  },
  {
    id: 'P015',
    displayName: 'Patient 6B-06',
    wardId: 'W6',
    ward: 'Ward 6 – Neuro',
    bed: '6B-06',
    age: 58,
    conditions: ['COPD exacerbation', 'Epilepsy'],
    medications: ['D004', 'D012'],        // Phenytoin, Aminophylline
    baseRiskScore: 73,
  },
  {
    id: 'P016',
    displayName: 'Patient 6C-10',
    wardId: 'W6',
    ward: 'Ward 6 – Neuro',
    bed: '6C-10',
    age: 43,
    conditions: ['Schizophrenia', 'Neutropenia monitoring'],
    medications: ['D013'],                // Clozapine
    baseRiskScore: 80,
  },

  /* ── Ward 2 – General Medical ──────────────────────── */
  {
    id: 'P017',
    displayName: 'Patient 2C-15',
    wardId: 'W2',
    ward: 'Ward 2 – Medical',
    bed: '2C-15',
    age: 72,
    conditions: ['CCF', 'AF', 'CKD Stage 2'],
    medications: ['D005', 'D001'],        // Digoxin, Warfarin
    baseRiskScore: 82,
  },
  {
    id: 'P018',
    displayName: 'Patient 2A-04',
    wardId: 'W2',
    ward: 'Ward 2 – Medical',
    bed: '2A-04',
    age: 61,
    conditions: ['Type 2 DM', 'Renal Impairment'],
    medications: ['D006', 'D015'],        // Insulin Glargine, Metformin
    baseRiskScore: 68,
  },
  {
    id: 'P019',
    displayName: 'Patient 2B-07',
    wardId: 'W2',
    ward: 'Ward 2 – Medical',
    bed: '2B-07',
    age: 77,
    conditions: ['MRSA Bacteraemia', 'AKI'],
    medications: ['D009'],                // Vancomycin
    baseRiskScore: 78,
  },
  {
    id: 'P020',
    displayName: 'Patient 2D-11',
    wardId: 'W2',
    ward: 'Ward 2 – Medical',
    bed: '2D-11',
    age: 49,
    conditions: ['COPD', 'Asthma'],
    medications: ['D012'],                // Aminophylline
    baseRiskScore: 65,
  },
]

/** Convenience map: id → patient */
export const PATIENTS_BY_ID = Object.fromEntries(PATIENTS.map((p) => [p.id, p]))
