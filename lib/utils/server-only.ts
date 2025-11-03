// lib/utils/server-only.ts
import { isVitest, isNodeRuntime } from '@/lib/ai/runtime';

export function assertServerOnly() {
  if (!isNodeRuntime && !isVitest) {
    throw new Error('Server-only module');
  }
}
