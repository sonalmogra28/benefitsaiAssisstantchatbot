import { t } from '../index';
import { authProcedure } from '../auth-procedure';
import { z } from 'zod';

export const adminRouter = t.router({
  // Placeholder admin procedures - implement as needed
  getStats: authProcedure
    .input(z.object({ companyId: z.string().optional() }))
    .query(async ({ input }: { input: { companyId?: string } }) => {
      return { message: 'Admin stats placeholder', companyId: input.companyId };
    }),
});
