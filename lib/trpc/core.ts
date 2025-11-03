import { initTRPC } from '@trpc/server';

// Skip initialization during build - return stub objects
const isBuild = typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build';

let t: ReturnType<typeof initTRPC.create>;

if (isBuild) {
  // During build, provide complete stub that mirrors the API
  const stub = () => stub; // Chainable stub
  const procedureStub = {
    query: stub,
    mutation: stub,
    input: stub,
    output: stub,
    meta: stub,
  };
  
  t = {
    router: ((routes: any) => routes) as any,
    procedure: procedureStub as any,
    middleware: (() => procedureStub) as any,
  } as any;
} else {
  t = initTRPC.create();
}

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

export type { inferAsyncReturnType } from '@trpc/server';
