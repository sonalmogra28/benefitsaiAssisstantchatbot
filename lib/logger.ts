import pino from "pino";

const level = (process.env.LOG_LEVEL ?? "info").toLowerCase();

// Build-safe logger initialization with fallback
let logger: pino.Logger;

try {
  const baseOptions: pino.LoggerOptions = {
    level,
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  // Create logger without custom levels to avoid build-time issues
  logger = pino(baseOptions);
} catch (error) {
  // Fallback to console logging if pino fails during build
  logger = {
    info: (...args: any[]) => console.log(...args),
    warn: (...args: any[]) => console.warn(...args),
    error: (...args: any[]) => console.error(...args),
    debug: (...args: any[]) => console.debug(...args),
    fatal: (...args: any[]) => console.error(...args),
    trace: (...args: any[]) => console.log(...args),
  } as any as pino.Logger;
}

export { logger };

// Single adapter to forbid wrong call signatures
export const log = {
  info: (msg: string, ctx: Record<string, unknown> = {}) => logger.info(ctx, msg),
  warn: (msg: string, ctx: Record<string, unknown> = {}) => logger.warn(ctx, msg),
  error: (msg: string, err?: Error, ctx: Record<string, unknown> = {}) =>
    logger.error(
      { 
        ...ctx, 
        err: err ? { 
          name: err.name, 
          message: err.message, 
          stack: err.stack 
        } : undefined 
      },
      msg
    ),
  debug: (msg: string, ctx: Record<string, unknown> = {}) => logger.debug(ctx, msg),
  // Map http to debug level since custom levels are disabled
  http: (msg: string, ctx: Record<string, unknown> = {}) => logger.debug(ctx, msg),
};

export default logger;

// Legacy compatibility (deprecated - use log.error instead)
export const logError = (msg: string, err?: Error, context?: any) => {
  log.error(msg, err, context || {});
};