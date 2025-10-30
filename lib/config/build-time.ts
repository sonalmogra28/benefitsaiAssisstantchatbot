/**
 * Build-Time Configuration
 * 
 * This module provides build-time specific configuration that prevents
 * external service initialization during the build process.
 */

// Check if we're in build time
export const isBuildTime = process.env.NODE_ENV === 'test' || 
                          process.env.SKIP_AZURE_CONFIG === '1' ||
                          process.env.NEXT_PHASE === 'phase-production-build' ||
                          process.env.BUILD_TIME === '1';

// Mock implementations for build time
export const buildTimeMocks = {
  cosmos: {
    databases: {
      createIfNotExists: async () => ({
        database: {
          containers: {
            createIfNotExists: async () => ({
              container: {
                items: {
                  create: async () => ({ item: {} }),
                  read: async () => ({ resource: null }),
                  replace: async () => ({ resource: {} }),
                  query: async () => ({ resources: [] }),
                },
              },
            }),
          },
        },
      }),
    },
  },
  redis: {
    get: async () => null,
    set: async () => 'OK',
    setEx: async () => 'OK',
    del: async () => 0,
    disconnect: async () => {},
    on: () => {},
  },
  openai: {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: 'Build-time mock response' } }],
        }),
      },
    },
    embeddings: {
      create: async () => ({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      }),
    },
  },
};

// Safe service getter that returns mocks during build time
export function getSafeService(serviceName: string) {
  if (isBuildTime) {
    return buildTimeMocks[serviceName as keyof typeof buildTimeMocks];
  }
  return null;
}
