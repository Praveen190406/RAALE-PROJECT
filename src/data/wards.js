/**
 * Ward definitions — 5 wards across the hospital
 */
export const WARDS = [
  { id: 'W7', name: 'Ward 7 – Cardiology', shortName: 'Cardiology', beds: 24, specialty: 'Cardiology' },
  { id: 'W4', name: 'Ward 4 – Oncology',   shortName: 'Oncology',   beds: 18, specialty: 'Oncology' },
  { id: 'W3', name: 'Ward 3 – Surgical',   shortName: 'Surgical',   beds: 20, specialty: 'Surgical' },
  { id: 'W6', name: 'Ward 6 – Neuro',      shortName: 'Neurology',  beds: 16, specialty: 'Neurology' },
  { id: 'W2', name: 'Ward 2 – Medical',    shortName: 'Medical',    beds: 28, specialty: 'General Medicine' },
]

export const WARDS_BY_ID = Object.fromEntries(WARDS.map((w) => [w.id, w]))
