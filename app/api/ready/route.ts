import { type NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/ready
 * Readiness probe for container orchestration (Kubernetes, Cloud Run, etc.)
 * Returns 200 when the application is ready to serve traffic
 * Returns 503 when the application is not ready
 */
export async function GET(req: NextRequest) {
  // Fast path for local/dev environments: return 200-OK without external checks
  // Enable unless explicitly disabled via FAST_HEALTH=0
  if (process.env.NODE_ENV !== 'production' && process.env.FAST_HEALTH !== '0') {
    return NextResponse.json({
      ready: true,
      fast: true,
      reason: 'dev-short-circuit',
      timestamp: new Date().toISOString(),
    });
  }

  const checks = {
    cosmos: false,
    azureAuth: false,
    environment: false,
  };

  try {
    // Check Azure Cosmos DB is accessible (production only; dynamic import)
    try {
      const { getContainer }: any = await import('@/lib/azure/cosmos-db');
      const container = await getContainer('system');
      await container.items.query('SELECT TOP 1 * FROM c').fetchAll();
      checks.cosmos = true;
    } catch (error) {
      // Avoid tight coupling to logger in readiness path
      console.warn('Cosmos DB not ready', (error as Error)?.message);
    }

    // Check Azure AD B2C configuration
    try {
      checks.azureAuth = !!(
        process.env.AZURE_AD_CLIENT_ID &&
        process.env.AZURE_AD_TENANT_ID
      );
    } catch (error) {
      console.warn('Azure AD B2C not ready', (error as Error)?.message);
    }

    // Check required environment variables
    checks.environment = !!(
      process.env.AZURE_AD_CLIENT_ID &&
      process.env.COSMOS_DB_ENDPOINT &&
      (process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY)
    );

    // All checks must pass for readiness
    const isReady = Object.values(checks).every((check) => check === true);

    if (isReady) {
      return NextResponse.json({
        ready: true,
        checks,
        timestamp: new Date().toISOString(),
      });
    } else {
  console.warn('Application not ready', { checks });
      return NextResponse.json(
        {
          ready: false,
          checks,
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      );
    }
  } catch (error) {
  console.error('Readiness check failed', error);
    return NextResponse.json(
      {
        ready: false,
        error: 'Internal error during readiness check',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}

/**
 * GET /api/live
 * Liveness probe - simple check that the process is running
 * Should restart the container if this fails
 */
export async function HEAD(req: NextRequest) {
  return new NextResponse(null, { status: 200 });
}
