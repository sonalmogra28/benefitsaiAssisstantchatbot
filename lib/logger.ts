import pino from "pino";

const level = (process.env.LOG_LEVEL ?? "info").toLowerCase();

export const logger = pino({
  level,
  // Keep standard levels; do NOT set useOnlyCustomLevels
  customLevels: { http: 25, analytics: 15 },
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

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
  http: (msg: string, ctx: Record<string, unknown> = {}) => logger.http(ctx, msg),
};

export default logger;

// Legacy compatibility (deprecated - use log.error instead)
export const logError = (msg: string, err?: Error, context?: any) => {
  log.error(msg, err, context || {});
};