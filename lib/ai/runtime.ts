// lib/ai/runtime.ts
export const isVitest = !!(process.env.VITEST || process.env.NODE_ENV === 'test');
export const isNodeRuntime =
  // Next.js sets NEXT_RUNTIME in app routes; in Vitest it's typically undefined.
  !process.env.NEXT_RUNTIME || process.env.NEXT_RUNTIME === 'nodejs';
