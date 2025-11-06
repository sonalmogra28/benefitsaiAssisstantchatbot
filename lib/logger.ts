// lib/logger.ts
import pino from "pino";

// Standard pino levels + any custom levels
const standardLevels = { fatal: 60, error: 50, warn: 40, info: 30, debug: 20, trace: 10 };
const customLevels = {
  audit: 35,   // Between warn(40) and info(30)
  metric: 25,  // Between info(30) and debug(20)
};

// Merge standard + custom so 'info' exists
const allLevels = { ...standardLevels, ...customLevels };

const base = pino({
  level: process.env.LOG_LEVEL ?? "info",
  customLevels: allLevels,
  useOnlyCustomLevels: false, // Allow standard levels
  formatters: { level: (label) => ({ level: label }) },
});

function call(method: "info" | "warn" | "error" | "debug", ...args: any[]) {
  const [a, b, c] = args;

  // ("msg", obj?, err?)
  if (typeof a === "string") {
    const msg = a;
    const obj = b && typeof b === "object" ? b : undefined;
    const err = c instanceof Error ? c : undefined;
    if (err) return (base as any)[method]({ ...(obj ?? {}), err }, msg);
    if (obj)  return (base as any)[method](obj, msg);
    return (base as any)[method](msg);
  }

  // (obj, "msg"?, err?)
  if (a && typeof a === "object") {
    const obj = a;
    const msg = typeof b === "string" ? b : undefined;
    const err = c instanceof Error ? c : undefined;
    if (err) return (base as any)[method]({ ...obj, err }, msg);
    if (msg)  return (base as any)[method](obj, msg);
    return (base as any)[method](obj);
  }

  return (base as any)[method](String(a ?? ""));
}

export const logger = {
  info: (...args: any[]) => call("info", ...args),
  warn: (...args: any[]) => call("warn", ...args),
  error: (...args: any[]) => call("error", ...args),
  debug: (...args: any[]) => call("debug", ...args),
  apiResponse: (method: string, endpoint: string, statusCode: number, duration: number, context?: any) => {
    return call("info", {
      method,
      endpoint,
      statusCode,
      duration,
      ...context
    }, `API ${method} ${endpoint}`);
  },
  securityEvent: (message: string, context?: any) => {
    return call("warn", {
      ...context,
      securityEvent: true,
      timestamp: new Date().toISOString(),
    }, `SECURITY: ${message}`);
  },
  auditEvent: (message: string, context?: any) => {
    return call("info", {
      ...context,
      auditEvent: true,
      timestamp: new Date().toISOString(),
    }, `AUDIT: ${message}`);
  },
};

// ✅ Compatibility helpers for existing code that imports named functions
export const logInfo  = (...args: any[]) => logger.info(...args);
export const logWarn  = (...args: any[]) => logger.warn(...args);
export const logError = (...args: any[]) => logger.error(...args);
export const logDebug = (...args: any[]) => logger.debug(...args);

// Also export default for `import log from '@/lib/logger'`
export default logger;
