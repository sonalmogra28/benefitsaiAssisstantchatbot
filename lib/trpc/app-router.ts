import { router, publicProcedure } from './core';

export const appRouter = router({
  ping: publicProcedure.query(() => ({ message: 'ok' })),
});

export type AppRouter = typeof appRouter;
