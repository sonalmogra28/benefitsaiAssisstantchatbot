import {
  getAllPlans,
  getPlansByRegion as getPlansByRegionCatalog,
  calculateTierMonthly,
  type BenefitTier,
} from './amerivet';

export const AMERIVET_BENEFIT_PLANS = getAllPlans();

export const getPlansByType = (type: string) =>
  AMERIVET_BENEFIT_PLANS.filter((plan) => plan.type === type);

export const getPlansByRegion = (region: string) => getPlansByRegionCatalog(region);

export const calculateEmployeeCost = (planId: string, tier: BenefitTier = 'employeeOnly') =>
  calculateTierMonthly(planId, tier) ?? 0;
