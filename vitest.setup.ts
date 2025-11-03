// vitest.setup.ts
if (!process.env.NEXT_RUNTIME) {
  (process.env as any).NEXT_RUNTIME = 'nodejs';
}
if (!process.env.NODE_ENV) {
  (process.env as any).NODE_ENV = 'test';
}
(process.env as any).VITEST = 'true';
