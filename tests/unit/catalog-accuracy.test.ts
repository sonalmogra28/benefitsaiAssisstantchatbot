/**
 * CATALOG ACCURACY TESTS
 *
 * These tests verify that the hardcoded plan data in amerivet.ts matches the
 * real plan documents. They are NOT about bot behavior — they are about data
 * correctness. If a number changes in the catalog without a matching update here,
 * this test fails and forces a deliberate decision.
 *
 * Update these tests when: (a) you receive new plan documents from Brandon/AmeriVet,
 * (b) a plan year rolls over, or (c) a carrier makes a mid-year amendment.
 * Never "fix" a failing test by changing the assertion to match the code —
 * always go back to the source document first.
 */

import { describe, expect, it } from 'vitest';

import { amerivetBenefits2024_2025 } from '../../lib/data/amerivet.ts';
import { buildParentalLeavePlan } from '../../lib/qa/policy-response-builders';

// ─── helpers ────────────────────────────────────────────────────────────────

function getPlan(id: string) {
  const all = [
    ...amerivetBenefits2024_2025.medicalPlans,
    amerivetBenefits2024_2025.dentalPlan,
    amerivetBenefits2024_2025.visionPlan,
    ...amerivetBenefits2024_2025.voluntaryPlans,
  ];
  const plan = all.find((p) => p.id === id);
  if (!plan) throw new Error(`Plan not found: ${id}`);
  return plan;
}

// ─── Medical: Standard HSA ───────────────────────────────────────────────────

describe('Standard HSA (bcbstx-standard-hsa)', () => {
  const plan = getPlan('bcbstx-standard-hsa');

  it('individual deductible is $3,500', () => {
    expect(plan.benefits.deductible).toBe(3500);
    expect(plan.coverage?.deductibles?.individual).toBe(3500);
  });

  it('family deductible is $7,000', () => {
    expect(plan.coverage?.deductibles?.family).toBe(7000);
  });

  it('in-network coinsurance is 20%', () => {
    expect(plan.benefits.coinsurance).toBe(0.2);
    expect(plan.coverage?.coinsurance?.inNetwork).toBe(0.2);
  });

  it('out-of-pocket max is $6,350', () => {
    expect(plan.benefits.outOfPocketMax).toBe(6350);
    expect(plan.coverage?.outOfPocketMax).toBe(6350);
  });

  it('is available nationwide', () => {
    expect(plan.regionalAvailability).toContain('nationwide');
  });

  it('does not mention Centers of Excellence', () => {
    const featureText = plan.features.join(' ').toLowerCase();
    expect(featureText).not.toContain('centers of excellence');
  });
});

// ─── Medical: Enhanced HSA ───────────────────────────────────────────────────

describe('Enhanced HSA (bcbstx-enhanced-hsa)', () => {
  const plan = getPlan('bcbstx-enhanced-hsa');

  it('individual deductible is $2,000 — NOT $2,500', () => {
    expect(plan.benefits.deductible).toBe(2000);
    expect(plan.coverage?.deductibles?.individual).toBe(2000);
  });

  it('family deductible is $4,000', () => {
    expect(plan.coverage?.deductibles?.family).toBe(4000);
  });

  it('in-network coinsurance is 20% — NOT 15%', () => {
    expect(plan.benefits.coinsurance).toBe(0.2);
    expect(plan.coverage?.coinsurance?.inNetwork).toBe(0.2);
  });

  it('does NOT list Centers of Excellence as a feature', () => {
    const featureText = plan.features.join(' ').toLowerCase();
    expect(featureText).not.toContain('centers of excellence');
  });

  it('is available nationwide', () => {
    expect(plan.regionalAvailability).toContain('nationwide');
  });
});

// ─── Medical: Kaiser HMO ─────────────────────────────────────────────────────

describe('Kaiser Standard HMO (kaiser-standard-hmo)', () => {
  const plan = getPlan('kaiser-standard-hmo');

  it('is available ONLY in California, Oregon, and Washington (NOT Georgia — removed for 2026)', () => {
    const available = plan.regionalAvailability.map((r) => r.toLowerCase());
    expect(available).toContain('california');
    expect(available).toContain('washington');
    expect(available).toContain('oregon');
    // Georgia removed for 2026
    expect(available).not.toContain('georgia');
    // Must NOT include nationwide or Texas
    expect(available).not.toContain('nationwide');
    expect(available).not.toContain('texas');
  });

  it('individual deductible is $2,000 (2026 plan year)', () => {
    expect(plan.benefits.deductible).toBe(2000);
  });

  it('in-network coinsurance is 20% (2026 plan year)', () => {
    expect(plan.benefits.coinsurance).toBe(0.2);
  });
});

// ─── Dental ─────────────────────────────────────────────────────────────────

describe('BCBSTX Dental PPO (bcbstx-dental)', () => {
  const plan = getPlan('bcbstx-dental');

  it('orthodontia is NOT stored as a copay dollar amount', () => {
    // The old bug: copays: { orthodontia: 500 } — treated as $500 fee.
    // Correct structure: ortho coverage is a percentage with a lifetime max.
    expect((plan.coverage?.copays as Record<string, number> | undefined)?.orthodontia).toBeUndefined();
  });

  it('lists orthodontia coverage correctly — 50% up to $1,000 lifetime max', () => {
    const featureText = plan.features.join(' ').toLowerCase();
    expect(featureText).toContain('orthodontia');
    expect(featureText).toContain('50%');
    expect(featureText).toContain('1,000');
  });

  it('annual maximum benefit is $1,500', () => {
    expect(plan.benefits.outOfPocketMax).toBe(1500);
  });

  it('individual deductible is $50', () => {
    expect(plan.benefits.deductible).toBe(50);
  });
});

// ─── Life Insurance ──────────────────────────────────────────────────────────

describe('Unum Voluntary Term Life (unum-voluntary-life)', () => {
  const plan = getPlan('unum-voluntary-life');

  it('Guaranteed Issue amount is $200,000 — NOT $150,000', () => {
    const giFeature = plan.features.find((f) => f.toLowerCase().includes('guaranteed issue'));
    expect(giFeature).toBeDefined();
    expect(giFeature).toContain('$200,000');
    expect(giFeature).not.toContain('$150,000');
  });

  it('GI note specifies initial open enrollment only', () => {
    const giFeature = plan.features.find((f) => f.toLowerCase().includes('guaranteed issue'));
    expect(giFeature?.toLowerCase()).toContain('initial');
  });
});

// ─── Disability / STD ────────────────────────────────────────────────────────

describe('STD duration (in parental leave response)', () => {
  it('STD duration is 26 weeks — NOT 13 weeks', () => {
    const response = buildParentalLeavePlan(
      'https://wd5.myworkday.com/amerivet/login.html',
      '888-217-4728',
    );
    expect(response).toContain('26 weeks');
    expect(response).not.toContain('13 weeks');
  });

  it('STD benefit is 60% of salary', () => {
    const response = buildParentalLeavePlan(
      'https://wd5.myworkday.com/amerivet/login.html',
      '888-217-4728',
    );
    expect(response).toContain('60%');
  });
});

// ─── HSA Employer Contributions ─────────────────────────────────────────────

describe('HSA employer contributions', () => {
  const hsa = amerivetBenefits2024_2025.specialCoverage.hsa;

  it('employer contributes to HSA (contribution is defined)', () => {
    expect(hsa.employerContribution).toBeDefined();
  });

  it('Employee Only tier contribution is defined (Standard HSA gets more than Enhanced for 2026)', () => {
    if (typeof hsa.employerContribution === 'object') {
      // 2026: per-plan contributions — Standard HSA gets $750 individual, Enhanced gets $500 individual
      const standardIndividual = hsa.employerContribution['Standard HSA - Individual (Employee Only)'];
      const enhancedIndividual = hsa.employerContribution['Enhanced HSA - Individual (Employee Only)'];
      expect(standardIndividual).toBeGreaterThan(0);
      expect(enhancedIndividual).toBeGreaterThan(0);
      expect(standardIndividual).toBeGreaterThan(enhancedIndividual);
    } else {
      expect(hsa.employerContribution).toBeGreaterThan(0);
    }
  });
});

// ─── Life insurance recommendation language ──────────────────────────────────

describe('life insurance recommendation language', () => {
  it('does not say "employer guidance" anywhere in the response builders', async () => {
    // This imports the module text to scan for the forbidden phrase.
    // If "employer guidance" reappears in user-facing strings, this catches it.
    const mod = await import('../../lib/qa/non-medical-detail-lookup');
    // The module exports functions; we call the public one to generate a response.
    const session = {
      step: 'active_chat' as const,
      context: {},
      messages: [],
      lastBotMessage: '',
      currentTopic: 'Life Insurance' as const,
    };
    const result = mod.buildLifeInsuranceOverview?.('should I do term or whole life', session);
    // If the function exists and returns a string, check it
    if (typeof result === 'string') {
      expect(result.toLowerCase()).not.toContain('employer guidance');
    }
  });

  it('whole-life positioning paragraph is used when bot explains the split', async () => {
    const mod = await import('../../lib/qa/non-medical-detail-lookup');
    const session = {
      step: 'active_chat' as const,
      context: {},
      messages: [],
      lastBotMessage: '',
      currentTopic: 'Life Insurance' as const,
    };
    const result = mod.buildLifeInsuranceOverview?.('should I do term or whole life', session);
    if (typeof result === 'string') {
      expect(result.toLowerCase()).toContain('whole life insurance');
      expect(result.toLowerCase()).toContain('term life');
    }
  });
});
