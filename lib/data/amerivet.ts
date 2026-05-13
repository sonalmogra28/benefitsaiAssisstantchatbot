export type BenefitTier = 'employeeOnly' | 'employeeSpouse' | 'employeeChildren' | 'employeeFamily';

export interface BenefitPremiumBreakdown {
  employee: {
    monthly: number;
    biweekly: number;
  };
  employer?: {
    monthly: number;
    biweekly: number;
  };
}

export interface BenefitPlan {
  id: string;
  name: string;
  provider: string;
  type: 'medical' | 'dental' | 'vision' | 'voluntary';
  description?: string;
  regionalAvailability: string[];
  premiums: BenefitPremiumBreakdown;
  tiers: Record<BenefitTier, number>;
  benefits: {
    deductible: number;
    outOfPocketMax: number;
    coinsurance: number;
    description?: string;
  };
  features: string[];
  limitations: string[];
  eligibility: {
    employeeType: 'full-time' | 'part-time' | 'all';
    minHours: number;
  };
  coverage?: {
    deductibles?: Record<string, number>;
    coinsurance?: Record<string, number>;
    copays?: Record<string, number>;
    outOfPocketMax?: number;
    outOfPocketMaxFamily?: number;
  };
  voluntaryType?: 'life' | 'disability' | 'supplemental';
}

export interface AmerivetBenefitsCatalog {
  medicalPlans: BenefitPlan[];
  dentalPlan: BenefitPlan;
  visionPlan: BenefitPlan;
  voluntaryPlans: BenefitPlan[];
  regionalPlans: Record<string, string[]>;
  openEnrollment: {
    year: string;
    startDate: string;
    endDate: string;
    effectiveDate: string;
  };
  eligibility: {
    fullTimeHours: number;
    partTimeHours: number;
    coverageEffective: string;
    dependents: {
      spouse: boolean;
      domesticPartner: boolean;
      children: string;
    };
  };
  specialCoverage: {
    hsa: {
      effectiveDate: string;
      employerContribution: number | Record<string, number>;
    };
    commuter: {
      effectiveDate: string;
      monthlyBenefit: number;
    };
  };
}

// Kaiser is available in CA, OR, and WA only. Georgia is NOT a Kaiser state for 2026.
export const KAISER_AVAILABLE_STATE_CODES = ['CA', 'OR', 'WA'] as const;

const biweekly = (monthly: number) => Number(((monthly * 12) / 26).toFixed(2));

const createPlan = (plan: BenefitPlan): BenefitPlan => plan;

export const amerivetBenefits2024_2025: AmerivetBenefitsCatalog = {
  medicalPlans: [
    // ── BCBSTX: Standard HSA ─────────────────────────────────────────────────
    createPlan({
      id: 'bcbstx-standard-hsa',
      name: 'Standard HSA',
      provider: 'BCBSTX',
      type: 'medical',
      description: 'High-deductible HSA plan with embedded individual deductibles and the lowest employee premium of the three BCBSTX options.',
      regionalAvailability: ['nationwide'],
      premiums: {
        employee: { monthly: 108.55, biweekly: biweekly(108.55) },
      },
      tiers: {
        employeeOnly: 108.55,
        employeeSpouse: 631.17,
        employeeChildren: 539.35,
        employeeFamily: 695.39,
      },
      benefits: {
        deductible: 3500,
        outOfPocketMax: 6350,
        coinsurance: 0.2,
        description: 'Embedded deductibles: each person meets their own $3,500 before plan pays. 20% coinsurance after deductible. Preventive care 100% covered.',
      },
      coverage: {
        deductibles: {
          individual: 3500,
          family: 7000,
        },
        coinsurance: {
          inNetwork: 0.2,
          outOfNetwork: 0.5,
        },
        outOfPocketMax: 6350,
        outOfPocketMaxFamily: 12700,
      },
      features: [
        'HSA-eligible plan (HDHP)',
        'Embedded individual deductibles — each person meets $3,500, not the full family deductible',
        'AmeriVet contributes $750/yr to your HSA (individual) or $1,250/yr (family)',
        '20% coinsurance after deductible for all services',
        'Preventive care covered at 100% with no deductible',
        'Nationwide Blue Choice PPO network — access in and out of Texas',
        'Prescription drugs subject to calendar-year deductible (waived for preventive drugs)',
      ],
      limitations: [
        'Must meet individual deductible before plan covers non-preventive services',
        'Out-of-network: 50% coinsurance and higher deductibles apply',
        'HSA ineligible if enrolled in PPO or Kaiser plan',
      ],
      eligibility: {
        employeeType: 'full-time',
        minHours: 30,
      },
    }),
    // ── BCBSTX: Enhanced HSA ─────────────────────────────────────────────────
    createPlan({
      id: 'bcbstx-enhanced-hsa',
      name: 'Enhanced HSA',
      provider: 'BCBSTX',
      type: 'medical',
      description: 'HSA plan with a lower individual deductible ($2,000) but an aggregate family deductible — the full family amount must be met before coinsurance applies for any family member.',
      regionalAvailability: ['nationwide'],
      premiums: {
        employee: { monthly: 200.45, biweekly: biweekly(200.45) },
      },
      tiers: {
        employeeOnly: 200.45,
        employeeSpouse: 858.68,
        employeeChildren: 742.21,
        employeeFamily: 927.73,
      },
      benefits: {
        deductible: 2000,
        outOfPocketMax: 5000,
        coinsurance: 0.2,
        description: 'Aggregate deductible: full family deductible must be met before coinsurance applies if dependents are covered. Lower individual deductible than Standard HSA.',
      },
      coverage: {
        deductibles: {
          individual: 2000,
          family: 4000,
        },
        coinsurance: {
          inNetwork: 0.2,
          outOfNetwork: 0.5,
        },
        outOfPocketMax: 5000,
        outOfPocketMaxFamily: 9200,
      },
      features: [
        'HSA-eligible plan (HDHP)',
        'Lower individual deductible than Standard HSA ($2,000 vs $3,500)',
        'AGGREGATE family deductible — full $4,000 family deductible must be met before any family member gets coinsurance',
        'AmeriVet contributes $500/yr to your HSA (individual) or $1,000/yr (family)',
        '20% coinsurance after deductible for all services',
        'Preventive care covered at 100% with no deductible',
        'Nationwide Blue Choice PPO network',
      ],
      limitations: [
        'Aggregate deductible: if you have dependents, the full family deductible must be met before the plan pays coinsurance for anyone',
        'Higher premium than Standard HSA (~$882/yr more for individual coverage)',
        'Out-of-network: 50% coinsurance and higher deductibles apply',
        'HSA ineligible if enrolled in PPO or Kaiser plan',
      ],
      eligibility: {
        employeeType: 'full-time',
        minHours: 30,
      },
    }),
    // ── BCBSTX: PPO ──────────────────────────────────────────────────────────
    createPlan({
      id: 'bcbstx-ppo',
      name: 'BCBSTX PPO',
      provider: 'BCBSTX',
      type: 'medical',
      description: 'Traditional PPO with copays for office visits and prescriptions — no deductible required for copay services. Highest premium of the three BCBSTX options. NOT HSA-eligible.',
      regionalAvailability: ['nationwide'],
      premiums: {
        employee: { monthly: 334.28, biweekly: biweekly(334.28) },
      },
      tiers: {
        employeeOnly: 334.28,
        employeeSpouse: 1068.82,
        employeeChildren: 1038.90,
        employeeFamily: 1273.35,
      },
      benefits: {
        deductible: 2500,
        outOfPocketMax: 7500,
        coinsurance: 0.3,
        description: 'Embedded individual deductibles ($2,500 per person). 30% coinsurance after deductible. Copays for office visits and prescriptions do not require meeting the deductible first.',
      },
      coverage: {
        deductibles: {
          individual: 2500,
          family: 5000,
        },
        coinsurance: {
          inNetwork: 0.3,
          outOfNetwork: 0.5,
        },
        copays: {
          primaryCare: 50,
          specialist: 75,
          virtualVisit: 30,
          urgentCare: 75,
          emergencyRoom: 500,
        },
        outOfPocketMax: 7500,
        outOfPocketMaxFamily: 15000,
      },
      features: [
        'Copays for office visits — no deductible required: PCP $50 | Specialist $75 | Virtual $30 | Urgent Care $75',
        'ER: $500 copay then 30% coinsurance after deductible',
        'Prescription drug coverage before deductible (copay-based)',
        'Embedded individual deductibles ($2,500 per person)',
        '30% coinsurance for major services after deductible',
        'Nationwide Blue Choice PPO network',
        'NOT HSA-eligible — cannot contribute to or use an HSA with this plan',
      ],
      limitations: [
        'Highest premium of all three BCBSTX options',
        'Highest out-of-pocket maximum ($7,500 individual)',
        '30% coinsurance (vs 20% on HSA plans)',
        'No HSA access — cannot open or contribute to an HSA while enrolled',
      ],
      eligibility: {
        employeeType: 'full-time',
        minHours: 30,
      },
    }),
    // ── KAISER: Standard HMO (CA, OR, WA only) ───────────────────────────────
    createPlan({
      id: 'kaiser-standard-hmo',
      name: 'Kaiser Standard HMO',
      provider: 'Kaiser',
      type: 'medical',
      description: 'HMO plan with low copays and integrated care. Available ONLY in California, Oregon, and Washington.',
      regionalAvailability: ['California', 'Oregon', 'Washington'],
      premiums: {
        employee: { monthly: 202.54, biweekly: biweekly(202.54) },
      },
      tiers: {
        employeeOnly: 202.54,
        employeeSpouse: 1108.32,
        employeeChildren: 927.46,
        employeeFamily: 1200.84,
      },
      benefits: {
        deductible: 2000,
        outOfPocketMax: 4000,
        coinsurance: 0.2,
        description: 'Integrated HMO with Kaiser facilities. $2,000 individual deductible. 20% coinsurance after deductible. Low copays for office visits.',
      },
      coverage: {
        deductibles: {
          individual: 2000,
          family: 4000,
        },
        coinsurance: {
          inNetwork: 0.2,
        },
        copays: {
          primaryCare: 20,
          specialist: 30,
          urgentCare: 20,
          emergencyRoom: 250,
        },
        outOfPocketMax: 4000,
        outOfPocketMaxFamily: 8000,
      },
      features: [
        'Low copays: PCP $20 | Specialist $30 | Urgent Care $20 (CA/WA) or $30 (OR)',
        'Preventive care and virtual visits covered at 100%',
        'ER: $250 copay after deductible then 20% (CA/WA); $250 copay, no deductible (OR)',
        'Integrated Kaiser network — care team coordination',
        'Available ONLY in California, Oregon, and Washington',
      ],
      limitations: [
        'No out-of-network coverage except emergencies',
        'Must use Kaiser facilities and providers only',
        'Available ONLY in California, Oregon, and Washington — not available in Georgia or any other state',
      ],
      eligibility: {
        employeeType: 'full-time',
        minHours: 30,
      },
    }),
    // ── KAISER: Enhanced HMO (CA, OR, WA only) ───────────────────────────────
    createPlan({
      id: 'kaiser-enhanced-hmo',
      name: 'Kaiser Enhanced HMO',
      provider: 'Kaiser',
      type: 'medical',
      description: 'Premium Kaiser HMO with a much lower deductible ($500 individual) and lower OOP max. Available ONLY in California, Oregon, and Washington.',
      regionalAvailability: ['California', 'Oregon', 'Washington'],
      premiums: {
        employee: { monthly: 391.32, biweekly: biweekly(391.32) },
      },
      tiers: {
        employeeOnly: 391.32,
        employeeSpouse: 1296.23,
        employeeChildren: 1275.80,
        employeeFamily: 1663.97,
      },
      benefits: {
        deductible: 500,
        outOfPocketMax: 2500,
        coinsurance: 0.2,
        description: 'Lower deductible ($500) and lower OOP max ($2,500) than the Standard HMO. 20% coinsurance after deductible. Low copays for office visits.',
      },
      coverage: {
        deductibles: {
          individual: 500,
          family: 1000,
        },
        coinsurance: {
          inNetwork: 0.2,
        },
        copays: {
          primaryCare: 20,
          specialist: 30,
          urgentCare: 20,
          emergencyRoom: 200,
        },
        outOfPocketMax: 2500,
        outOfPocketMaxFamily: 5000,
      },
      features: [
        'Very low deductible: $500 individual / $1,000 family',
        'Low OOP maximum: $2,500 individual / $5,000 family',
        'Low copays: PCP $20 | Specialist $30 | Urgent Care $20',
        'ER: $200 copay after deductible then 20% (CA/WA); $200 copay, no deductible (OR)',
        'Preventive care and virtual visits covered at 100%',
        'Available ONLY in California, Oregon, and Washington',
      ],
      limitations: [
        'No out-of-network coverage except emergencies',
        'Must use Kaiser facilities and providers only',
        'Highest premium of the Kaiser options',
        'Available ONLY in California, Oregon, and Washington',
      ],
      eligibility: {
        employeeType: 'full-time',
        minHours: 30,
      },
    }),
  ],
  // ── DENTAL ─────────────────────────────────────────────────────────────────
  dentalPlan: createPlan({
    id: 'bcbstx-dental',
    name: 'BCBSTX Dental PPO',
    provider: 'BCBSTX',
    type: 'dental',
    description: 'Dental PPO using the BlueCare network. Preventive 100%, basic 80%, major 50%, orthodontia 50% for children to age 19.',
    regionalAvailability: ['nationwide'],
    premiums: {
      employee: { monthly: 28.90, biweekly: biweekly(28.90) },
    },
    tiers: {
      employeeOnly: 28.90,
      employeeSpouse: 57.17,
      employeeChildren: 75.04,
      employeeFamily: 113.93,
    },
    benefits: {
      deductible: 50,
      outOfPocketMax: 1500,
      coinsurance: 0.2,
      description: 'Individual deductible $50 / family $150. Calendar-year maximum $1,500 (BlueMaximum Advantage can increase to $2,100 over 3 years).',
    },
    coverage: {
      deductibles: {
        individual: 50,
        family: 150,
      },
      coinsurance: {
        preventive: 0,
        basic: 0.2,
        major: 0.5,
      },
      outOfPocketMax: 1500,
    },
    features: [
      'Preventive care (cleanings, exams, x-rays) covered at 100%',
      'Basic services (fillings, extractions): 20% after $50 deductible',
      'Major services (crowns, bridges): 50% after deductible',
      'Orthodontia: 50% covered, $1,000 lifetime maximum (children up to age 19)',
      'BlueMaximum Advantage: earn $200/yr extra benefit (up to $600 over 3 years, raising annual max to $2,100)',
      'BlueCare network — nationwide dentist access',
    ],
    limitations: [
      'Orthodontia limited to children age 19 and under',
      'Out-of-network dentists have a negotiated fee schedule; you may owe more',
    ],
    eligibility: {
      employeeType: 'all',
      minHours: 20,
    },
  }),
  // ── VISION ─────────────────────────────────────────────────────────────────
  visionPlan: createPlan({
    id: 'bcbstx-vision',
    name: 'BCBSTX Vision Plan',
    provider: 'BCBSTX',
    type: 'vision',
    description: 'Vision coverage through the EyeMed Vision Network. Annual eye exam, lenses, frames, and contact allowances.',
    regionalAvailability: ['nationwide'],
    premiums: {
      employee: { monthly: 5.24, biweekly: biweekly(5.24) },
    },
    tiers: {
      employeeOnly: 5.24,
      employeeSpouse: 9.95,
      employeeChildren: 10.48,
      employeeFamily: 15.41,
    },
    benefits: {
      deductible: 0,
      outOfPocketMax: 0,
      coinsurance: 0,
      description: 'Eye exam annually with $10 copay. Lenses with $25 copay. $130 frame allowance plus 20% off balance. Contact allowance $130.',
    },
    coverage: {
      copays: {
        exam: 10,
        lenses: 25,
      },
    },
    features: [
      'Eye exam: $10 copay (once per calendar year)',
      'Lenses: $25 copay (once per calendar year)',
      'Frames: $130 allowance + 20% off balance (once per calendar year)',
      'Contacts (conventional/disposable): $130 allowance (once per calendar year)',
      'Medically necessary contacts: paid in full',
      'EyeMed Vision Network — nationwide coverage',
    ],
    limitations: [
      'Benefits are once per calendar year',
      'Out-of-network coverage is a reimbursement (lower amounts)',
      'Cannot combine frames and contact lens benefit in same year',
    ],
    eligibility: {
      employeeType: 'all',
      minHours: 20,
    },
  }),
  // ── VOLUNTARY PLANS ────────────────────────────────────────────────────────
  voluntaryPlans: [
    // ── UNUM: Basic Life & AD&D (Employer-Paid) ─────────────────────────────
    createPlan({
      id: 'unum-basic-life',
      name: 'Unum Basic Life & AD&D',
      provider: 'Unum',
      type: 'voluntary',
      description: 'Employer-paid basic life and AD&D coverage — $25,000 flat benefit at no cost to employee.',
      regionalAvailability: ['nationwide'],
      premiums: {
        employee: { monthly: 0, biweekly: 0 },
        employer: { monthly: 15.75, biweekly: biweekly(15.75) },
      },
      tiers: {
        employeeOnly: 0,
        employeeSpouse: 0,
        employeeChildren: 0,
        employeeFamily: 0,
      },
      benefits: {
        deductible: 0,
        outOfPocketMax: 0,
        coinsurance: 0,
        description: '$25,000 employer-paid basic life and accidental death & dismemberment.',
      },
      features: [
        '$25,000 flat life benefit — employer-paid, no cost to employee',
        '$25,000 AD&D benefit — also employer-paid',
        'All benefits-eligible employees automatically enrolled',
        'Benefits reduce beginning at age 65',
      ],
      limitations: [
        'Flat $25,000 — not salary-based',
        'Benefits reduced at age 65',
        'Ends when employment ends — not portable',
      ],
      eligibility: {
        employeeType: 'all',
        minHours: 20,
      },
      voluntaryType: 'life',
    }),
    // ── UNUM: Voluntary Term Life & AD&D ────────────────────────────────────
    createPlan({
      id: 'unum-voluntary-life',
      name: 'Unum Voluntary Term Life & AD&D',
      provider: 'Unum',
      type: 'voluntary',
      description: 'Employee-paid voluntary term life and AD&D — age-banded rates per $1,000 of coverage.',
      regionalAvailability: ['nationwide'],
      premiums: {
        employee: { monthly: 0, biweekly: 0 },
      },
      tiers: {
        employeeOnly: 0,
        employeeSpouse: 0,
        employeeChildren: 0,
        employeeFamily: 0,
      },
      benefits: {
        deductible: 0,
        outOfPocketMax: 0,
        coinsurance: 0,
        description: 'Employee: $10,000 increments up to $500,000. Spouse: $5,000 increments up to $250,000. Child: up to $10,000.',
      },
      features: [
        'Employee coverage: $10,000 increments up to $500,000',
        'Guaranteed Issue (no health questions): $200,000 at initial enrollment',
        'Spouse: $5,000 increments up to $250,000 (not to exceed 100% of employee amount); GI $25,000',
        'Child: up to $10,000 (live birth to age 26); GI $10,000',
        'Age-banded rates per $1,000 (e.g., under 30: $0.10/mo per $1,000)',
        'Portable — can continue coverage after leaving employment',
      ],
      limitations: [
        'Age-banded pricing — rates increase with age',
        'Evidence of insurability (EOI) required above Guarantee Issue amounts',
        'Benefits reduce beginning at age 65',
      ],
      eligibility: {
        employeeType: 'all',
        minHours: 20,
      },
      voluntaryType: 'life',
    }),
    // ── ALLSTATE: Group Whole Life ────────────────────────────────────────────
    createPlan({
      id: 'allstate-whole-life',
      name: 'Allstate Group Whole Life',
      provider: 'Allstate',
      type: 'voluntary',
      description: 'Permanent whole life insurance with guaranteed premiums and cash value buildup. $20,000–$100,000 coverage. Fully paid up at age 95.',
      regionalAvailability: ['nationwide'],
      premiums: {
        employee: { monthly: 0, biweekly: 0 },
      },
      tiers: {
        employeeOnly: 0,
        employeeSpouse: 0,
        employeeChildren: 0,
        employeeFamily: 0,
      },
      benefits: {
        deductible: 0,
        outOfPocketMax: 0,
        coinsurance: 0,
        description: 'Permanent coverage $20,000–$100,000 (GI $100,000). Builds cash value. Premiums locked at enrollment age.',
      },
      features: [
        'Coverage $20,000–$100,000; Guarantee Issue $100,000 at initial enrollment (no medical questions)',
        'Permanent coverage — does not expire as long as premiums are paid',
        'Builds cash value over time; fully paid up at age 95',
        'Premiums locked at enrollment age — never increase',
        'Portable — rates do not change when you leave the group',
        'Accelerated death benefit for terminal illness (up to 75%) and long-term care',
        'Available for employees age 18–70 and qualifying spouses',
      ],
      limitations: [
        'Open enrollment requires EOI if not enrolling as a new hire within 31 days',
        'Working spouse GI: $20,000 | Non-working spouse GI: $10,000',
        'Higher premium than term life for equivalent face value',
      ],
      eligibility: {
        employeeType: 'all',
        minHours: 20,
      },
      voluntaryType: 'life',
    }),
    // ── UNUM: Short-Term Disability (Voluntary, Employee-Paid) ───────────────
    createPlan({
      id: 'unum-std',
      name: 'Unum Short-Term Disability',
      provider: 'Unum',
      type: 'voluntary',
      voluntaryType: 'disability',
      description: 'Voluntary short-term disability — employee-paid at group rates. Replaces 60% of weekly earnings up to $2,000/week for up to 26 weeks.',
      regionalAvailability: ['nationwide'],
      premiums: {
        employee: { monthly: 0, biweekly: 0 },
      },
      tiers: {
        employeeOnly: 0,
        employeeSpouse: 0,
        employeeChildren: 0,
        employeeFamily: 0,
      },
      benefits: {
        deductible: 0,
        outOfPocketMax: 0,
        coinsurance: 0,
        description: 'Replaces 60% of pre-disability weekly earnings (up to $2,000/week maximum) for up to 26 weeks.',
      },
      features: [
        'Replaces 60% of pre-disability weekly earnings',
        'Maximum weekly benefit: $2,000',
        'Benefits begin on day 15 (14-day elimination period for both illness and injury)',
        'Maximum benefit period: 26 weeks',
        'Employee-paid at group rates (age-banded: <54 = $0.710/mo per $10 weekly benefit)',
        'Benefit is tax-free when employee pays premiums with after-tax dollars',
      ],
      limitations: [
        'Does not replace 100% of salary — replaces 60%',
        'Benefit period capped at 26 weeks; LTD picks up after',
        'Pre-existing conditions (within 3 months prior to coverage) excluded during first 12 months',
        'Voluntary — must elect and pay for coverage; not automatic',
      ],
      eligibility: {
        employeeType: 'full-time',
        minHours: 30,
      },
    }),
    // ── UNUM: Long-Term Disability (Voluntary, Employee-Paid) ────────────────
    createPlan({
      id: 'unum-ltd',
      name: 'Unum Long-Term Disability',
      provider: 'Unum',
      type: 'voluntary',
      voluntaryType: 'disability',
      description: 'Voluntary long-term disability — employee-paid at group rates. Replaces 60% of monthly earnings (up to $5,000/month) after 180-day elimination period.',
      regionalAvailability: ['nationwide'],
      premiums: {
        employee: { monthly: 0, biweekly: 0 },
      },
      tiers: {
        employeeOnly: 0,
        employeeSpouse: 0,
        employeeChildren: 0,
        employeeFamily: 0,
      },
      benefits: {
        deductible: 0,
        outOfPocketMax: 0,
        coinsurance: 0,
        description: 'Replaces 60% of monthly earnings (up to $5,000/month) once STD ends. 180-day elimination period.',
      },
      features: [
        'Replaces 60% of pre-disability monthly earnings',
        'Maximum monthly benefit: $5,000',
        '180-day elimination period (begins after STD period ends)',
        'Maximum pre-disability annual earnings covered: $100,000',
        'Benefit period: to age 65 or Social Security Normal Retirement Age',
        'Employee-paid at group rates (age-banded)',
        'Benefit is tax-free when employee pays premiums with after-tax dollars',
      ],
      limitations: [
        'Does not replace 100% of salary — replaces 60%',
        'Only activates after the 180-day elimination period (STD must exhaust first)',
        'Pre-existing conditions (within 3 months prior to coverage) excluded during first 12 months',
        'Voluntary — must elect and pay for coverage; not automatic',
      ],
      eligibility: {
        employeeType: 'full-time',
        minHours: 30,
      },
    }),
    // ── ALLSTATE: Critical Illness ────────────────────────────────────────────
    createPlan({
      id: 'allstate-critical-illness',
      name: 'Allstate Critical Illness',
      provider: 'Allstate',
      type: 'voluntary',
      voluntaryType: 'supplemental',
      description: 'Lump-sum cash benefit on diagnosis of a covered critical illness (heart attack, stroke, cancer, organ failure, ALS, and more). Choose $10,000, $20,000, or $30,000.',
      regionalAvailability: ['nationwide'],
      premiums: {
        employee: { monthly: 0, biweekly: 0 },
      },
      tiers: {
        employeeOnly: 0,
        employeeSpouse: 0,
        employeeChildren: 0,
        employeeFamily: 0,
      },
      benefits: {
        deductible: 0,
        outOfPocketMax: 0,
        coinsurance: 0,
        description: 'Pays lump-sum benefit upon diagnosis of a covered critical illness.',
      },
      features: [
        'Choose $10,000, $20,000, or $30,000 coverage; Guarantee Issue $30,000 (no health questions at initial enrollment)',
        'Pays lump sum on diagnosis — use the money for anything (deductible, travel, lost wages)',
        'Covers: heart attack, stroke, major organ failure, end-stage kidney failure, ALS (100%)',
        'Also covers: Alzheimer\'s (50%), MS (30%), Parkinson\'s (100%), cancer (100% for major types)',
        'Spouse can be added at 50% of your elected amount (GI $15,000)',
        'Dependent children covered at 50% at no additional cost (up to age 26)',
        'Be Well Benefit: $50 per covered person/year for annual exams and screenings',
      ],
      limitations: [
        'Age-banded rates — increase with age',
        'Only specific named illnesses are covered (not general illness)',
        'Some progressive diseases pay at less than 100% (e.g., MS at 30%)',
      ],
      eligibility: {
        employeeType: 'all',
        minHours: 20,
      },
    }),
    // ── ACCIDENT INSURANCE ────────────────────────────────────────────────────
    createPlan({
      id: 'accident-insurance',
      name: 'Accident Insurance',
      provider: 'Unum',
      type: 'voluntary',
      voluntaryType: 'supplemental',
      description: 'Pays fixed cash benefits for covered accident-related injuries and treatment. Two plan options: Plan 1 (higher benefits) and Plan 2 (lower cost).',
      regionalAvailability: ['nationwide'],
      premiums: {
        employee: { monthly: 0, biweekly: 0 },
      },
      tiers: {
        employeeOnly: 0,
        employeeSpouse: 0,
        employeeChildren: 0,
        employeeFamily: 0,
      },
      benefits: {
        deductible: 0,
        outOfPocketMax: 0,
        coinsurance: 0,
        description: 'Plan 1: Employee Only $22.49/mo. Plan 2: Employee Only $15.75/mo.',
      },
      features: [
        'Two plan options — Plan 1 (higher benefits): Employee $22.49/mo; Plan 2: Employee $15.75/mo',
        'Plan 1 pays: ER $300 | Wrist fracture $550 | Knee cartilage $200 | Stitches $200 | Chiropractic $50',
        'Plan 2 pays: ER $200 | Wrist fracture $450 | Knee cartilage $150 | Stitches $150 | Chiropractic $40',
        'Pays directly to you — use for deductible, lost wages, or anything',
        'Be Well Benefit: up to $75 reimbursement for preventive exams under both plans',
        'Can elect coverage for dependents',
      ],
      limitations: [
        'Only covers accidents — not illness',
        'Specific injury types listed in policy; general sprains/strains have specific payout amounts',
      ],
      eligibility: {
        employeeType: 'all',
        minHours: 20,
      },
    }),
    // ── HOSPITAL INDEMNITY ────────────────────────────────────────────────────
    createPlan({
      id: 'hospital-indemnity',
      name: 'Hospital Indemnity Insurance',
      provider: 'Unum',
      type: 'voluntary',
      voluntaryType: 'supplemental',
      description: 'Pays fixed cash benefits for hospital admission, ICU, and daily hospital stays — regardless of what your health plan covers.',
      regionalAvailability: ['nationwide'],
      premiums: {
        employee: { monthly: 21.24, biweekly: biweekly(21.24) },
      },
      tiers: {
        employeeOnly: 21.24,
        employeeSpouse: 34.85,
        employeeChildren: 33.32,
        employeeFamily: 46.93,
      },
      benefits: {
        deductible: 0,
        outOfPocketMax: 0,
        coinsurance: 0,
        description: 'Hospital admission: $1,000 | ICU admission: $1,000 | Daily inpatient: $200/day (up to 31 days) | ICU daily: $200/day (up to 15 days)',
      },
      features: [
        'Hospital admission: $1,000 (up to once per year)',
        'ICU admission: $1,000 (up to once per year)',
        'Daily inpatient stay: $200/day (up to 31 days per year)',
        'ICU daily stay: $200/day (up to 15 days per year)',
        'Be Well Benefit: $50/covered person/year for preventive screenings',
        'Pays in addition to your health insurance — cash goes directly to you',
        'Covers hospitalization for any reason: illness, injury, surgery, or childbirth',
      ],
      limitations: [
        'You or spouse must enroll before age 70 to be eligible',
        'Employee must elect own coverage before adding spouse or children',
      ],
      eligibility: {
        employeeType: 'all',
        minHours: 20,
      },
    }),
  ],
  // ── REGIONAL PLAN AVAILABILITY ─────────────────────────────────────────────
  regionalPlans: {
    California: ['kaiser-standard-hmo', 'kaiser-enhanced-hmo'],
    Oregon: ['kaiser-standard-hmo', 'kaiser-enhanced-hmo'],
    Washington: ['kaiser-standard-hmo', 'kaiser-enhanced-hmo'],
    nationwide: [
      'bcbstx-standard-hsa',
      'bcbstx-enhanced-hsa',
      'bcbstx-ppo',
      'bcbstx-dental',
      'bcbstx-vision',
      'unum-basic-life',
      'unum-voluntary-life',
      'allstate-whole-life',
      'unum-std',
      'unum-ltd',
      'allstate-critical-illness',
      'accident-insurance',
      'hospital-indemnity',
    ],
  },
  openEnrollment: {
    year: '2026',
    startDate: '2025-09-01',
    endDate: '2025-09-30',
    effectiveDate: '2026-01-01',
  },
  eligibility: {
    fullTimeHours: 30,
    partTimeHours: 20,
    coverageEffective: 'Coverage begins on the first of the month following 30 days of employment.',
    dependents: {
      spouse: true,
      domesticPartner: true,
      children: 'Eligible through age 26 regardless of student status.',
    },
  },
  specialCoverage: {
    hsa: {
      effectiveDate: '2026-01-01',
      // AmeriVet's contributions differ by plan AND tier:
      // Standard HSA: $750 (individual) / $1,250 (family tiers)
      // Enhanced HSA: $500 (individual) / $1,000 (family tiers)
      employerContribution: {
        'Standard HSA - Individual (Employee Only)': 750,
        'Standard HSA - Family (Employee + Spouse/Child/Family)': 1250,
        'Enhanced HSA - Individual (Employee Only)': 500,
        'Enhanced HSA - Family (Employee + Spouse/Child/Family)': 1000,
      },
    },
    commuter: {
      effectiveDate: '2026-01-01',
      monthlyBenefit: 315,
    },
  },
};


// --- Zod validation for catalog integrity ---
import { amerivetBenefitsCatalogSchema } from '@/lib/validation/benefit-catalog-schema';

// Validate at runtime (throws if invalid)
amerivetBenefitsCatalogSchema.parse(amerivetBenefits2024_2025);

const allPlans = [
  ...amerivetBenefits2024_2025.medicalPlans,
  amerivetBenefits2024_2025.dentalPlan,
  amerivetBenefits2024_2025.visionPlan,
  ...amerivetBenefits2024_2025.voluntaryPlans,
];

export function getPlanById(planId: string): BenefitPlan | undefined {
  return allPlans.find(plan => plan.id === planId);
}

export const STATE_ABBREV_TO_NAME: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

export function getPlansByRegion(region: string): BenefitPlan[] {
  const normalizedRegion = region.toLowerCase();
  // Expand 2-letter abbreviation to full state name for regionalPlans key lookup
  const expandedName = STATE_ABBREV_TO_NAME[region.toUpperCase()] ?? region;
  const directMatches =
    amerivetBenefits2024_2025.regionalPlans[region] ??
    amerivetBenefits2024_2025.regionalPlans[expandedName] ??
    [];
  return allPlans.filter(plan => {
    if (directMatches.includes(plan.id)) {
      return true;
    }

    const regions = plan.regionalAvailability.map(r => r.toLowerCase());
    if (regions.includes('nationwide')) {
      return true;
    }

    // Match against the raw region code or the expanded full state name
    return regions.includes(normalizedRegion) || regions.includes(expandedName.toLowerCase());
  });
}

export function isEligibleForPlan(
  planId: string,
  employeeType: 'full-time' | 'part-time',
  hoursWorked: number,
  region: string,
): boolean {
  const plan = getPlanById(planId);
  if (!plan) {
    return false;
  }

  const meetsHours = employeeType === 'full-time'
    ? hoursWorked >= Math.max(30, plan.eligibility.minHours)
    : hoursWorked >= Math.max(amerivetBenefits2024_2025.eligibility.partTimeHours, plan.eligibility.minHours);

  if (!meetsHours) {
    return false;
  }

  const normalizedRegion = region.toLowerCase();
  const availableRegions = plan.regionalAvailability.map(r => r.toLowerCase());

  if (availableRegions.includes('nationwide')) {
    return true;
  }

  return availableRegions.includes(normalizedRegion);
}

export function getAllPlans(): BenefitPlan[] {
  return [...allPlans];
}

export function listPlanTypes(): string[] {
  return Array.from(new Set(allPlans.map(plan => plan.type)));
}

export function listProviders(): string[] {
  return Array.from(new Set(allPlans.map(plan => plan.provider)));
}

export function calculateTierMonthly(planId: string, tier: BenefitTier): number | undefined {
  const plan = getPlanById(planId);
  if (!plan) {
    return undefined;
  }
  return plan.tiers[tier];
}

// =============================================================================
// PROMPT SERIALISER — Immutable Truth Table for LLM grounding
// =============================================================================

/**
 * Serialises the AmeriVet benefit catalog into a compact, LLM-readable string
 * that acts as an immutable lookup table inside the system prompt.
 *
 * - Only plans available in `stateCode` (or nationwide) are included.
 * - A "NOT IN CATALOG" block lists common benefits AmeriVet does NOT offer,
 *   giving the LLM an explicit decline list instead of hallucinating.
 *
 * @param stateCode  2-letter US state code (e.g. "IL"). Pass null for nationwide only.
 */
export function getCatalogForPrompt(stateCode?: string | null): string {
  const catalog = amerivetBenefits2024_2025;
  const availablePlans = getPlansByRegion(stateCode ?? 'nationwide');
  const biw = (m: number) => `$${((m * 12) / 26).toFixed(2)}`;

  const lines: string[] = [
    `=== AMERIVET BENEFITS CATALOG (${catalog.openEnrollment.year}) — IMMUTABLE LOOKUP TABLE ===`,
    `Respond ONLY with plans listed here. Plans not listed DO NOT EXIST for AmeriVet employees.`,
    `NOT IN CATALOG (decline politely if asked): pet insurance, legal insurance, ID theft protection,`,
    `  gym membership, wellness reimbursement, student loan repayment, long-term care, cancer-only plans.`,
    '',
    '── CARRIER LOCK (immutable — never re-assign a carrier to a different plan type) ──',
    '  UNUM       = Basic Life & AD&D, Voluntary Term Life, Short-Term Disability, Long-Term Disability, Accident Insurance, Hospital Indemnity ONLY.',
    '  ALLSTATE   = Group Whole Life (Permanent), Critical Illness ONLY.',
    '  BCBSTX     = Medical plans (Standard HSA, Enhanced HSA, PPO), Dental PPO, AND Vision Plan (EyeMed network) ONLY.',
    '  KAISER     = Medical HMO — California, Oregon, Washington ONLY. NEVER mention Kaiser for any other state including Georgia.',
    '  RIGHTWAY   — NOT an AmeriVet benefit. NEVER mention Rightway in any response.',
    '  QUANTUM HEALTH — Navigation/care coordinator service (NOT a medical plan). Available Jan 1, 2026. Phone: 866-499-5170.',
    '',
  ];

  // ── Medical ────────────────────────────────────────────────────────────────
  const medPlans = availablePlans.filter(p => p.type === 'medical');
  if (medPlans.length) {
    lines.push('── MEDICAL PLANS ──────────────────────────────────────────────────────────');
    for (const p of medPlans) {
      lines.push(`[${p.id}] ${p.name} | Provider: ${p.provider}`);
      lines.push(`  Premiums: Employee $${p.tiers.employeeOnly}/mo (${biw(p.tiers.employeeOnly)}/bi-wk) | +Spouse $${p.tiers.employeeSpouse}/mo | +Child $${p.tiers.employeeChildren}/mo | Family $${p.tiers.employeeFamily}/mo`);
      const familyOop = p.coverage?.outOfPocketMaxFamily ? ` / $${p.coverage.outOfPocketMaxFamily} family` : '';
      lines.push(`  Deductible: $${p.benefits.deductible} ind / $${p.coverage?.deductibles?.family ?? '?'} family | OOP Max: $${p.benefits.outOfPocketMax} ind${familyOop} | Coinsurance: ${p.benefits.coinsurance * 100}%`);
      if (p.coverage?.copays && Object.keys(p.coverage.copays).length > 0) {
        const copayStr = Object.entries(p.coverage.copays).map(([k, v]) => `${k}: $${v}`).join(' | ');
        lines.push(`  Copays: ${copayStr}`);
      }
      lines.push(`  Key features: ${p.features.slice(0, 3).join(' | ')}`);
      if (p.limitations.length) lines.push(`  Limitations: ${p.limitations[0]}`);
      lines.push('');
    }
  }

  // ── Dental ─────────────────────────────────────────────────────────────────
  const d = catalog.dentalPlan;
  lines.push('── DENTAL PLAN ─────────────────────────────────────────────────────────────');
  lines.push(`[${d.id}] ${d.name} | Provider: ${d.provider}`);
  lines.push(`  Premiums: Employee $${d.tiers.employeeOnly}/mo | +Spouse $${d.tiers.employeeSpouse}/mo | +Child $${d.tiers.employeeChildren}/mo | Family $${d.tiers.employeeFamily}/mo`);
  lines.push(`  Deductible: $${d.benefits.deductible}/individual | Annual Max: $${d.benefits.outOfPocketMax}`);
  lines.push(`  Key features: ${d.features.slice(0, 4).join(' | ')}`);
  lines.push('');

  // ── Vision ─────────────────────────────────────────────────────────────────
  const v = catalog.visionPlan;
  lines.push('── VISION PLAN ─────────────────────────────────────────────────────────────');
  lines.push(`[${v.id}] ${v.name} | Provider: ${v.provider} (EyeMed network)`);
  lines.push(`  Premiums: Employee $${v.tiers.employeeOnly}/mo | +Spouse $${v.tiers.employeeSpouse}/mo | +Child $${v.tiers.employeeChildren}/mo | Family $${v.tiers.employeeFamily}/mo`);
  lines.push(`  Key features: ${v.features.join(' | ')}`);
  lines.push('');

  // ── HSA Employer Contributions ─────────────────────────────────────────────
  const hsa = catalog.specialCoverage.hsa;
  lines.push('── HSA EMPLOYER CONTRIBUTIONS ──────────────────────────────────────────────');
  if (typeof hsa.employerContribution === 'object') {
    for (const [key, val] of Object.entries(hsa.employerContribution)) {
      lines.push(`  ${key}: $${val}/yr`);
    }
  } else {
    lines.push(`  All tiers: $${hsa.employerContribution}/yr`);
  }
  lines.push(`  NOTE: PPO plan and Kaiser plans are NOT HSA-eligible.`);
  lines.push('');

  // ── Voluntary / Life & Disability ─────────────────────────────────────────
  const volPlans = availablePlans.filter(p => p.type === 'voluntary');
  if (volPlans.length) {
    lines.push('── VOLUNTARY / SUPPLEMENTAL PLANS ──────────────────────────────────────────');
    for (const p of volPlans) {
      lines.push(`[${p.id}] ${p.name} | Provider: ${p.provider}`);
      if (p.tiers.employeeOnly > 0) {
        lines.push(`  Premiums: Employee $${p.tiers.employeeOnly}/mo | +Spouse $${p.tiers.employeeSpouse}/mo | Family $${p.tiers.employeeFamily}/mo`);
      } else {
        lines.push(`  Premiums: Age-banded or variable — see plan details`);
      }
      lines.push(`  Key features: ${p.features.slice(0, 3).join(' | ')}`);
      lines.push('');
    }
  }

  // ── Special Accounts ───────────────────────────────────────────────────────
  lines.push('── SPENDING ACCOUNTS & COMMUTER ────────────────────────────────────────────');
  lines.push(`Healthcare FSA: $3,200/yr max (must not have HSA) | Dependent Care FSA: $5,000/yr`);
  lines.push(`Commuter Benefits (WEX): up to $${catalog.specialCoverage.commuter.monthlyBenefit}/mo pretax`);
  lines.push('');

  // ── Enrollment Window ──────────────────────────────────────────────────────
  lines.push('── ENROLLMENT WINDOW ───────────────────────────────────────────────────────');
  lines.push(`Open: ${catalog.openEnrollment.startDate} – ${catalog.openEnrollment.endDate} | Effective: ${catalog.openEnrollment.effectiveDate}`);
  lines.push(`Eligibility: Full-time ≥${catalog.eligibility.fullTimeHours}h/wk. Coverage ${catalog.eligibility.coverageEffective}`);
  lines.push(`Dependents: Spouse=${catalog.eligibility.dependents.spouse} | Children: ${catalog.eligibility.dependents.children}`);

  return lines.join('\n');
}
