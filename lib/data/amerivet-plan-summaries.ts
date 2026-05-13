import { getPlanById } from './amerivet';
import type { BenefitPlan } from './amerivet';

export type PlanServiceDetail = {
  label: string;
  value: string;
};

export type MedicalPlanSummary = {
  planKey: 'standard_hsa' | 'enhanced_hsa' | 'kaiser_standard_hmo' | 'kaiser_enhanced_hmo';
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

const d = (n: number) => `$${n.toLocaleString()}`;
const pct = (rate: number) => `${Math.round(rate * 100)}%`;

function deductibleText(plan: BenefitPlan, suffix?: string): string {
  const ind = plan.coverage?.deductibles?.individual ?? plan.benefits.deductible;
  const fam = plan.coverage?.deductibles?.family;
  const base = fam ? `${d(ind)} individual / ${d(fam)} family` : `${d(ind)} individual`;
  return suffix ? `${base} ${suffix}` : base;
}

function oopText(plan: BenefitPlan): string {
  const ind = plan.coverage?.outOfPocketMax ?? plan.benefits.outOfPocketMax;
  const fam = plan.coverage?.outOfPocketMaxFamily;
  return fam ? `${d(ind)} individual / ${d(fam)} family` : `${d(ind)} individual`;
}

function inNetworkCoinsuranceText(plan: BenefitPlan): string {
  const rate = plan.coverage?.coinsurance?.inNetwork ?? plan.benefits.coinsurance;
  return `${pct(rate)} after deductible`;
}

function outOfNetworkCoinsuranceText(plan: BenefitPlan): string | undefined {
  const rate = plan.coverage?.coinsurance?.outOfNetwork;
  return rate != null ? `${pct(rate)} after deductible` : undefined;
}

function networkText(plan: BenefitPlan): string {
  if (plan.regionalAvailability.includes('nationwide')) {
    return `Nationwide ${plan.provider} PPO network`;
  }
  const abbrevMap: Record<string, string> = { California: 'CA', Oregon: 'OR', Washington: 'WA' };
  const abbrevs = plan.regionalAvailability.map(s => abbrevMap[s] ?? s).join(', ');
  return `Integrated Kaiser network in ${abbrevs} (no Georgia for 2026)`;
}

// HDHP plans have no copays — visits go through deductible then coinsurance
function hdhpVisitText(plan: BenefitPlan): string {
  const rate = plan.coverage?.coinsurance?.inNetwork ?? plan.benefits.coinsurance;
  return `${pct(rate)} after deductible (no pre-deductible copay — HSA/HDHP plan)`;
}

// Kaiser ER: copay + coinsurance from catalog; OR state variation (no deductible) is static
function kaiserErText(plan: BenefitPlan): string {
  const copay = plan.coverage?.copays?.emergencyRoom ?? 0;
  const coin = plan.coverage?.coinsurance?.inNetwork ?? plan.benefits.coinsurance;
  return `${d(copay)} copay after deductible, then ${pct(coin)} (CA and WA); ${d(copay)} copay no deductible (OR)`;
}

function buildSummaries(): MedicalPlanSummary[] {
  const std = getPlanById('bcbstx-standard-hsa')!;
  const enh = getPlanById('bcbstx-enhanced-hsa')!;
  const kStd = getPlanById('kaiser-standard-hmo')!;
  const kEnh = getPlanById('kaiser-enhanced-hmo')!;

  return [
    {
      planKey: 'standard_hsa',
      displayName: std.name,
      provider: std.provider,
      aliases: ['standard', 'standard hsa', 'bcbstx standard hsa', 'standard plan'],
      network: networkText(std),
      deductible: deductibleText(std),
      outOfPocketMax: oopText(std),
      preventiveCare: 'Preventive care covered at 100%',
      primaryCare: hdhpVisitText(std),
      specialist: hdhpVisitText(std),
      urgentCare: hdhpVisitText(std),
      emergencyRoom: hdhpVisitText(std),
      inNetworkCoinsurance: inNetworkCoinsuranceText(std),
      outOfNetworkCoinsurance: outOfNetworkCoinsuranceText(std),
      physicalTherapy:
        'I do not have a separate physical therapy copay listed here; it most likely follows the plan medical deductible and coinsurance structure',
      maternity:
        "Maternity care generally follows the plan's normal medical cost-sharing: prenatal care, delivery, and postnatal care count toward the deductible and out-of-pocket maximum",
      prescriptionDrugs: {
        generic: null,
        preferredBrand: null,
        nonPreferredBrand: null,
        specialty: null,
        note: 'I do not yet have the prescription drug tier details in the current summary, so I do not want to guess.',
      },
      notes: std.features.slice(0, 3),
    },
    {
      planKey: 'enhanced_hsa',
      displayName: enh.name,
      provider: enh.provider,
      aliases: ['enhanced', 'enhanced hsa', 'bcbstx enhanced hsa', 'enhanced plan'],
      network: networkText(enh),
      deductible: deductibleText(enh, '(aggregate)'),
      outOfPocketMax: oopText(enh),
      preventiveCare: 'Preventive care covered at 100% — no deductible required',
      primaryCare: hdhpVisitText(enh),
      specialist: hdhpVisitText(enh),
      urgentCare: hdhpVisitText(enh),
      emergencyRoom: hdhpVisitText(enh),
      inNetworkCoinsurance: inNetworkCoinsuranceText(enh),
      outOfNetworkCoinsurance: outOfNetworkCoinsuranceText(enh),
      physicalTherapy:
        'I do not have a separate physical therapy copay listed in the current summary',
      maternity:
        "Maternity care generally follows the plan's normal medical cost-sharing, with lower deductible and lower in-network cost-sharing than Standard HSA",
      prescriptionDrugs: {
        generic: null,
        preferredBrand: null,
        nonPreferredBrand: null,
        specialty: null,
        note: 'I do not yet have the prescription drug tier details in the current summary, so I do not want to guess.',
      },
      notes: enh.features.slice(0, 3),
    },
    {
      planKey: 'kaiser_standard_hmo',
      displayName: kStd.name,
      provider: kStd.provider,
      aliases: ['kaiser', 'kaiser hmo', 'kaiser standard', 'kaiser standard hmo'],
      network: networkText(kStd),
      deductible: deductibleText(kStd),
      outOfPocketMax: oopText(kStd),
      preventiveCare: 'Preventive care is part of the integrated HMO benefit design',
      primaryCare: `${d(kStd.coverage?.copays?.primaryCare ?? 0)} copay`,
      specialist: `${d(kStd.coverage?.copays?.specialist ?? 0)} copay`,
      // OR urgent care is $30 — state-level variation not tracked in catalog copays
      urgentCare: `${d(kStd.coverage?.copays?.urgentCare ?? 0)} copay (CA and WA) or $30 copay (OR)`,
      emergencyRoom: kaiserErText(kStd),
      inNetworkCoinsurance: `${pct(kStd.coverage?.coinsurance?.inNetwork ?? kStd.benefits.coinsurance)} where applicable`,
      outOfNetworkCoinsurance: 'No out-of-network coverage except emergencies',
      physicalTherapy:
        'Subject to Kaiser plan rules; I do not have a separate physical therapy line item in the current summary',
      maternity:
        "Maternity care is handled inside the Kaiser system and follows Kaiser's integrated HMO structure in eligible states",
      prescriptionDrugs: {
        generic: null,
        preferredBrand: null,
        nonPreferredBrand: null,
        specialty: null,
        note: 'I do not yet have the prescription drug tier details in the current summary, so I do not want to guess.',
      },
      notes: kStd.features.slice(0, 3),
    },
    {
      planKey: 'kaiser_enhanced_hmo',
      displayName: kEnh.name,
      provider: kEnh.provider,
      aliases: ['kaiser enhanced', 'kaiser enhanced hmo', 'kaiser enhanced plan', 'enhanced hmo', 'kaiser premium'],
      network: networkText(kEnh),
      deductible: deductibleText(kEnh),
      outOfPocketMax: oopText(kEnh),
      preventiveCare: 'Preventive care and virtual visits covered at 100%',
      primaryCare: `${d(kEnh.coverage?.copays?.primaryCare ?? 0)} copay`,
      specialist: `${d(kEnh.coverage?.copays?.specialist ?? 0)} copay`,
      urgentCare: `${d(kEnh.coverage?.copays?.urgentCare ?? 0)} copay`,
      emergencyRoom: kaiserErText(kEnh),
      inNetworkCoinsurance: inNetworkCoinsuranceText(kEnh),
      outOfNetworkCoinsurance: 'No out-of-network coverage except emergencies',
      // Physical therapy copays vary by state; not tracked in catalog copays
      physicalTherapy: 'CA: $20 copay; OR and WA: $30 copay',
      maternity:
        'Maternity care is handled inside the Kaiser system with lower cost-sharing than the Standard HMO',
      prescriptionDrugs: {
        generic: null,
        preferredBrand: null,
        nonPreferredBrand: null,
        specialty: null,
        note: 'Kaiser Rx: Generic $10 | Preferred Brand $30 | Non-preferred Brand $60 | Specialty 20% up to $250 (31-day supply; mail order 2x retail).',
      },
      notes: kEnh.features.slice(0, 3),
    },
  ];
}

export const AMERIVET_MEDICAL_PLAN_SUMMARIES: MedicalPlanSummary[] = buildSummaries();

export function findMedicalPlanSummaryByAlias(planText: string): MedicalPlanSummary | null {
  const normalized = planText.toLowerCase().trim();
  return (
    AMERIVET_MEDICAL_PLAN_SUMMARIES.find((plan) =>
      plan.aliases.some((alias) => normalized.includes(alias)),
    ) || null
  );
}
