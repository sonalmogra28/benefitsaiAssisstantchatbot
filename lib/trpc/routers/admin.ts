import { t } from '../index';
import { authProcedure } from '../auth-procedure';
<<<<<<< HEAD
import { getContainer } from '@/lib/azure/cosmos-db';
import { superAdminService } from '@/lib/services/super-admin.service';

export const adminRouter = t.router({
  getPlatformStats: authProcedure.query(async () => {
    return await superAdminService.getPlatformStats();
=======

export const adminRouter = t.router({
  getPlatformStats: authProcedure.query(async () => {
    // Return mock data during build to avoid circular dependencies
    return {
      totalUsers: 0,
      totalDocuments: 0,
      totalBenefitPlans: 0,
      storageUsed: 0,
    };
>>>>>>> main
  }),
});
