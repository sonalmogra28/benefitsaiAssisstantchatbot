export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/lib/trpc/app-router';

const createContext = async () => ({});

export const GET = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  });

export const POST = GET;
