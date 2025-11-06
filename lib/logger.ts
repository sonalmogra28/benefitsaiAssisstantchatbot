// lib/logger.ts
import pino from 'pino';

// allow override but default to 'info'
const level = (process.env.LOG_LEVEL ?? 'info').toLowerCase();

const p = pino({
  level,
  // Keep the standard levels and add any custom ones.
  // DO NOT enable useOnlyCustomLevels.
  customLevels: {
    // standard (keep them so 'info' is present)
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    debug: 20,
    trace: 10,
    // your extras
    http: 25,
    analytics: 15,
  },
  base: undefined, // optional: drop pid/hostname to keep logs clean
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Wrapper object with convenience methods
export const logger = {
  info: (msg: string | object, obj?: any) => {
    if (typeof msg === 'string') {
      p.info(obj, msg);
    } else {
      p.info(msg);
    }
  },
  warn: (msg: string | object, obj?: any) => {
    if (typeof msg === 'string') {
      p.warn(obj, msg);
    } else {
      p.warn(msg);
    }
  },
  error: (msg: string | object, obj?: any, err?: Error) => {
    if (typeof msg === 'string') {
      if (err) {
        p.error({ ...obj, err }, msg);
      } else {
        p.error(obj, msg);
      }
    } else {
      p.error(msg);
    }
  },
  debug: (msg: string | object, obj?: any) => {
    if (typeof msg === 'string') {
      p.debug(obj, msg);
    } else {
      p.debug(msg);
    }
  },
  apiResponse: (method: string, endpoint: string, statusCode: number, duration: number, context?: any) => {
    p.info({
      method,
      endpoint,
      statusCode,
      duration,
      ...context
    }, `API ${method} ${endpoint}`);
  },
};

export default logger;