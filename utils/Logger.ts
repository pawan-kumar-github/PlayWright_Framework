import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { PATHS } from '../config/constants';

const { combine, timestamp, colorize, printf, errors, json } = format;

// Ensure logs directory exists
if (!fs.existsSync(PATHS.logs)) {
  fs.mkdirSync(PATHS.logs, { recursive: true });
}

// ─── Console format ──────────────────────────────────────────────────────────
const consoleFormat = printf(({ level, message, timestamp: ts, context, ...meta }) => {
  const ctx = context ? `[${context}]` : '';
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  return `${ts} ${level} ${ctx} ${message}${metaStr}`;
});

// ─── File format ─────────────────────────────────────────────────────────────
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  errors({ stack: true }),
  json(),
);

// ─── Daily rotate transport ──────────────────────────────────────────────────
const dailyRotateTransport = new DailyRotateFile({
  filename: path.join(PATHS.logs, 'automation-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat,
});

const errorRotateTransport = new DailyRotateFile({
  filename: path.join(PATHS.logs, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  zippedArchive: true,
  maxSize: '10m',
  maxFiles: '30d',
  format: fileFormat,
});

// ─── Root logger instance ────────────────────────────────────────────────────
const rootLogger: WinstonLogger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    new transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'HH:mm:ss.SSS' }),
        consoleFormat,
      ),
    }),
    dailyRotateTransport,
    errorRotateTransport,
  ],
  exitOnError: false,
});

// ─── Logger wrapper class ─────────────────────────────────────────────────────
/**
 * Logger provides contextual Winston-backed logging.
 * Usage:
 *   const log = new Logger('LoginPage');
 *   log.info('Navigating to login page');
 *   log.error('Element not found', { locator: '//button[@id="submit"]' });
 */
export class Logger {
  private readonly context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, meta?: Record<string, unknown>): void {
    rootLogger.info(message, { context: this.context, ...meta });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    rootLogger.warn(message, { context: this.context, ...meta });
  }

  error(message: string, meta?: Record<string, unknown>): void {
    rootLogger.error(message, { context: this.context, ...meta });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    rootLogger.debug(message, { context: this.context, ...meta });
  }

  /** Log a step boundary — useful for tracing test execution flow */
  step(stepName: string): void {
    rootLogger.info(`▶ STEP: ${stepName}`, { context: this.context });
  }

  /** Log a healing event when a fallback locator is used */
  healing(primaryLocator: string, usedLocator: string, strategy: string): void {
    rootLogger.warn(`🔧 SELF-HEALING: Primary locator failed. Used fallback.`, {
      context: this.context,
      primary: primaryLocator,
      used: usedLocator,
      strategy,
    });
  }

  /** Flush all transports (call at end of test run) */
  static async flush(): Promise<void> {
    return new Promise((resolve) => {
      rootLogger.on('finish', resolve);
      rootLogger.end();
    });
  }
}

export default Logger;
