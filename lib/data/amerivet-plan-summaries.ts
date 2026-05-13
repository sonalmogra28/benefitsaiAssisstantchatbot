export type PlanServiceDetail = {
  label: string;
  value: string;
};

export type MedicalPlanSummary = {
  planKey: 'standard_hsa' | 'enhanced_hsa' | 'kaiser_standard_hmo';
  displayName: string;
  provider: string;
  aliases: string[];
  network: string;
  deductible: string;
  outOfPocketMax: string;
  preventiveCare: string;
  primaryCare: string;
  specialist: string;
  urgentCare?: string;
  emergencyRoom?: string;
  inNetworkCoinsurance: string;
  outOfNetworkCoinsurance?: string;
  physicalTherapy?: string;
  maternity?: string;
  prescriptionDrugs?: {
    generic?: string | null;
    preferredBrand?: string | null;
    nonPreferredBrand?: string | null;
    specialty?: string | null;
    note?: string;
  };
  notes?: string[];
};

export const AMERIVET_MEDICAL_PLAN_SUMMARIES: MedicalPlanSummary[] = [
  {
    planKey: 'standard_hsa',
    displayName: 'Standard HSA',
    provider: 'BCBSTX',
    aliases: ['standard', 'standard hsa', 'bcbstx standard hsa', 'standard plan'],
    network: 'Nationwide BCBSTX PPO network',
    deductible: '$3,500 individual / $7,000 family',
    outOfPocketMax: '$6,350 individual',
    preventiveCare: 'Preventive care covered at 100%',
    primaryCare: 'I do not have a flat copay listed for primary care here; this plan generally works through the deductible first, then coinsurance',
    specialist: 'I do not have a flat copay listed for specialist visits here; this plan generally works through the deductible first, then coinsurance',
    urgentCare: 'I do not have a separate urgent care copay listed in the current summary',
    emergencyRoom: 'I do not have a separate emergency room copay listed in the current summary',
    inNetworkCoinsurance: '20% after deductible',
    outOfNetworkCoinsurance: '40% after deductible',
    physicalTherapy: 'I do not have a separate physical therapy copay listed here; it most likely follows the plan medical deductible and coinsurance structure',
    maternity:
      "Maternity care generally follows the plan's normal medical cost-sharing: prenatal care, delivery, and postnatal care count toward the deductible and out-of-pocket maximum",
    prescriptionDrugs: {
      generic: null,
      preferredBrand: null,
      nonPreferredBrand: null,
      specialty: null,
      note: 'I do not yet have the prescription drug tier details in the current summary, so I do not want to guess.',
    },
    notes: ['HSA-eligible plan', 'Good fit when premiums matter more than richer point-of-service cost-sharing'],
  },
  {
    planKey: 'enhanced_hsa',
    displayName: 'Enhanced HSA',
    provider: 'BCBSTX',
    aliases: ['enhanced', 'enhanced hsa', 'bcbstx enhanced hsa', 'enhanced plan'],
    network: 'Nationwide BCBSTX PPO network',
    deductible: '$2,000 individual / $4,000 family (aggregate)',
    outOfPocketMax: '$5,000 individual / $9,200 family',
    preventiveCare: 'Preventive care covered at 100% — no deductible required',
    primaryCare: '20% after deductible (no pre-deductible copay — HSA/HDHP plan)',
    specialist: '20% after deductible (no pre-deductible copay — HSA/HDHP plan)',
    urgentCare: '20% after deductible',
    emergencyRoom: '20% after deductible',
    inNetworkCoinsurance: '20% after deductible',
    outOfNetworkCoinsurance: '50% after deductible',
    physicalTherapy: 'I do not have a separate physical therapy copay listed in the current summary',
    maternity:
      "Maternity care generally follows the plan's normal medical cost-sharing, with lower deductible and lower in-network cost-sharing than Standard HSA",
    prescriptionDrugs: {
      generic: null,
      preferredBrand: null,
      nonPreferredBrand: null,
      specialty: null,
      note: 'I do not yet have the prescription drug tier details in the current summary, so I do not want to guess.',
    },
    notes: ['Lower deductible than Standard HSA', 'Often the stronger option when higher medical usage is expected'],
  },
  {
    planKey: 'kaiser_standard_hmo',
    displayName: 'Kaiser Standard HMO',
    provider: 'Kaiser',
    aliases: ['kaiser', 'kaiser hmo', 'kaiser standard', 'kaiser standard hmo'],
    network: 'Integrated Kaiser network in CA, OR, and WA (no Georgia for 2026)',
    deductible: '$2,000 individual / $4,000 family',
    outOfPocketMax: '$4,000 individual',
    preventiveCare: 'Preventive care is part of the integrated HMO benefit design',
    primaryCare: '$20 copay',
    specialist: '$45 copay',
    urgentCare: 'I do not have a separate urgent care copay listed in the current summary',
    emergencyRoom: '$250 copay',
    inNetworkCoinsurance: '10% where applicable',
    outOfNetworkCoinsurance: 'No out-of-network coverage except emergencies',
    physicalTherapy: 'Subject to Kaiser plan rules; I do not have a separate physical therapy line item in the current summary',
    maternity:
      "Maternity care is handled inside the Kaiser system and follows Kaiser's integrated HMO structure in eligible states",
    prescriptionDrugs: {
      generic: null,
      preferredBrand: null,
      nonPreferredBrand: null,
      specialty: null,
      note: 'I do not yet have the prescription drug tier details in the current summary, so I do not want to guess.',
    },
    notes: ['Available only in CA, OR, and WA service areas (Georgia removed for 2026)'],
  },
];

export function findMedicalPlanSummaryByAlias(planText: string): MedicalPlanSummary | null {
  const normalized = planText.toLowerCase().trim();
  return (
    AMERIVET_MEDICAL_PLAN_SUMMARIES.find((plan) =>
      plan.aliases.some((alias) => normalized.includes(alias)),
    ) || null
  );
}
