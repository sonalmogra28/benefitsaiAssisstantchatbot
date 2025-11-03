import { initTRPC } from '@trpc/server';

// Skip initialization during build
const isBuild = typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build';

const t = isBuild ? ({} as any) : initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

export type { inferAsyncReturnType } from '@trpc/server';
