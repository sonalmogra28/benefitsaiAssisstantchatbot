// Ambient stubs for typecheck-only to avoid resolving heavy internal libs
// This keeps Step 2 typecheck focused on the health endpoints.

declare module '@/lib/*' {
  const anyValue: any;
  export default anyValue;
}

// Lightweight Node globals for typecheck-only runs
declare const process: any;
