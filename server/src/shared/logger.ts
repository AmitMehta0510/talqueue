import winston from "winston";

const { combine, timestamp, json, colorize, simple, errors } = winston.format;

const isProduction = process.env.NODE_ENV === "production";

/**
 * Singleton Winston logger for the Engineers Platform server.
 *
 * - **Production**: JSON output on stdout — ready for Datadog, Loki, CloudWatch.
 * - **Development/test**: Human-readable colorized output.
 *
 * Use `logger.child({ requestId })` inside request handlers to attach
 * correlation IDs to every log line for a given request.
 */
const logger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  format: isProduction
    ? combine(
        errors({ stack: true }),
        timestamp(),
        json(),
      )
    : combine(
        errors({ stack: true }),
        colorize({ all: true }),
        simple(),
      ),
  transports: [new winston.transports.Console()],
  // Never throw on logger errors -- a broken logger must not crash the server.
  exitOnError: false,
});

export default logger;
