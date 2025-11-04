/**
 * Build-phase guard for Cosmos DB access
 * Prevents build-time initialization of Azure resources
 */

export const assertNotBuild = (): void => {
  if (process.env.NEXT_PHASE?.includes('phase-production-build')) {
    throw new Error('COSMOS_MISSING: Cosmos DB access attempted during build phase');
  }
};
