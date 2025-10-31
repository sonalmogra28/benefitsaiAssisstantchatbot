export const isBuild =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  (process.env.NODE_ENV === 'production' && process.env.NEXT_RUNTIME === 'edge-build');
