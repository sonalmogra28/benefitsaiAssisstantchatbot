import { initTRPC } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

<<<<<<< HEAD
export const createContext = ({ req }: FetchCreateContextFnOptions) => ({
  req,
=======
export const createContext = ({ req, resHeaders, info }: FetchCreateContextFnOptions) => ({
  req,
  resHeaders,
  info,
>>>>>>> main
});

export const t = initTRPC.context<typeof createContext>().create();
