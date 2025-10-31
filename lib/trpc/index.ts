import { initTRPC } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

export async function createContext(opts: FetchCreateContextFnOptions) {
  return {
    req: opts.req,
    resHeaders: opts.resHeaders,
  };
}

export const t = initTRPC.context<typeof createContext>().create();
