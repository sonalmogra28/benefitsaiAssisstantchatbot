import pino from "pino";
const level = (process.env.LOG_LEVEL ?? "info").toLowerCase();
const instance = pino({
  level,
  customLevels: { fatal:60, error:50, warn:40, info:30, debug:20, trace:10, http:25, analytics:15 },
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});
export const logger = instance;
export default logger;
export const logError = (msg: string, err?: Error, context?: any) => {
  if (err) {
    instance.error({ msg, error: err.message, stack: err.stack, ...context });
  } else {
    instance.error({ msg, ...context });
  }
};