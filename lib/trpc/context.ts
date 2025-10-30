import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { createContext } from './index';

export const createTRPCContext = (opts: FetchCreateContextFnOptions) => {
  return createContext(opts);
};
