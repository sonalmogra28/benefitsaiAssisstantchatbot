export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function ok() { return new Response('ok', { status: 200 }); }

export async function GET() {
  if (process.env.FAST_HEALTH === '1' || process.env.NODE_ENV !== 'production') return ok();
  return ok();
}

export async function HEAD() { return new Response(null, { status: 200 }); }

