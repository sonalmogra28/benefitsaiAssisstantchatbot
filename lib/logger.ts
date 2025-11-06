// lib/logger.ts
import pino from "pino";

const pinoLogger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  // Use default pino levels, avoid customLevels to prevent build errors
  formatters: { level: (label) => ({ level: label }) },
});

function call(method: "info" | "warn" | "error" | "debug", ...args: any[]) {
  const [a, b, c] = args;

  // ("msg", obj?, err?)
  if (typeof a === "string") {
    const msg = a;
    const obj = b && typeof b === "object" ? b : undefined;
    const err = c instanceof Error ? c : undefined;
    if (err) return (pinoLogger as any)[method]({ ...(obj ?? {}), err }, msg);
    if (obj)  return (pinoLogger as any)[method](obj, msg);
    return (pinoLogger as any)[method](msg);
  }

  // (obj, "msg"?, err?)
  if (a && typeof a === "object") {
    const obj = a;
    const msg = typeof b === "string" ? b : undefined;
    const err = c instanceof Error ? c : undefined;
    if (err) return (pinoLogger as any)[method]({ ...obj, err }, msg);
    if (msg)  return (pinoLogger as any)[method](obj, msg);
    return (pinoLogger as any)[method](obj);
  }

  return (pinoLogger as any)[method](String(a ?? ""));
}

export const loggerApi = {
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
export const logInfo  = (...args: any[]) => loggerApi.info(...args);
export const logWarn  = (...args: any[]) => loggerApi.warn(...args);
export const logError = (...args: any[]) => loggerApi.error(...args);
export const logDebug = (...args: any[]) => loggerApi.debug(...args);

// Export as "logger" for backward compatibility
export const logger = loggerApi;

// Also export default for `import log from '@/lib/logger'`
export default loggerApi;
