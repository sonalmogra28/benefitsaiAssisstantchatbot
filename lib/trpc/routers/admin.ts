import { t } from '../index';
import { authProcedure } from '../auth-procedure';

export const adminRouter = t.router({
  getPlatformStats: authProcedure.query(async () => {
    // Return mock data during build to avoid circular dependencies
    return {
      totalUsers: 0,
      totalDocuments: 0,
      totalBenefitPlans: 0,
      storageUsed: 0,
    };
  }),
});
