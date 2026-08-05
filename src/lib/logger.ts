type LogContext = Record<string, unknown> & { error?: unknown };

type LogLevel = "info" | "warn" | "error";

// JSON.stringify(new Error(...)) produces "{}" — Error's own properties
// (message, stack) are non-enumerable. Normalize any `error` field so it
// actually shows up in the emitted log line.
function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return error;
}

function write(level: LogLevel, message: string, context?: LogContext) {
  const line = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
    ...(context?.error !== undefined ? { error: serializeError(context.error) } : {}),
  };

  const json = JSON.stringify(line);
  // error/warn → stderr, info → stdout — both captured by Docker's log driver.
  if (level === "error") console.error(json);
  else if (level === "warn") console.warn(json);
  else console.log(json);
}

export const logger = {
  error: (message: string, context?: LogContext) => write("error", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
};
