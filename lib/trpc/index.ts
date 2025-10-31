import { initTRPC } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

export const createContext = ({ req, resHeaders, info }: FetchCreateContextFnOptions) => ({
  req,
  resHeaders,
  info,
});

export const t = initTRPC.context<typeof createContext>().create();
