import pino from "pino";

const level = (process.env.LOG_LEVEL ?? "info").toLowerCase();

const baseOptions: pino.LoggerOptions = {
  level,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
};

// Create logger without custom levels to avoid build-time issues
// Custom levels cause "default level:info must be included" errors in pino v10+
export const logger = pino(baseOptions);

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