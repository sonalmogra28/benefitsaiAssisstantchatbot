// lib/logger.ts (pino-free, build-safe console wrapper)

type Level = "debug" | "info" | "warn" | "error";
const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function getLevel(): Level {
  const raw = (process.env.LOG_LEVEL || "info").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") return raw;
  return "info";
}

function shouldLog(level: Level): boolean {
  const current = getLevel();
  return LEVELS[level] >= LEVELS[current];
}

function call(method: Level, ...args: any[]) {
  if (!shouldLog(method)) return;
  const target = method === "debug" ? console.debug
    : method === "warn" ? console.warn
    : method === "error" ? console.error
    : console.info;

  const [a, b, c] = args;

  // ("msg", obj?, err?)
  if (typeof a === "string") {
    const msg = a;
    const obj = b && typeof b === "object" ? b : undefined;
    const err = c instanceof Error ? c : undefined;
    if (err) return target({ ...(obj ?? {}), err, level: method, ts: new Date().toISOString() }, msg);
    if (obj)  return target({ ...obj, level: method, ts: new Date().toISOString() }, msg);
    return target(`[${method}] ${msg}`);
  }

  // (obj, "msg"?, err?)
  if (a && typeof a === "object") {
    const obj = a;
    const msg = typeof b === "string" ? b : undefined;
    const err = c instanceof Error ? c : undefined;
    if (err) return target({ ...obj, err, level: method, ts: new Date().toISOString() }, msg);
    if (msg)  return target({ ...obj, level: method, ts: new Date().toISOString() }, msg);
    return target({ ...obj, level: method, ts: new Date().toISOString() });
  }

  return target(`[${method}] ${String(a ?? "")}`);
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

// Compatibility helpers for existing code that imports named functions
export const logInfo  = (...args: any[]) => logger.info(...args);
export const logWarn  = (...args: any[]) => logger.warn(...args);
export const logError = (...args: any[]) => logger.error(...args);
export const logDebug = (...args: any[]) => logger.debug(...args);

export default logger;
