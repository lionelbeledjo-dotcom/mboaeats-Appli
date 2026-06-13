type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? "info";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

function emit(entry: LogEntry) {
  const line = JSON.stringify(entry);
  if (entry.level === "error") {
    console.error(line);
  } else if (entry.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (shouldLog("debug"))
      emit({ level: "debug", message, context, timestamp: new Date().toISOString() });
  },
  info(message: string, context?: Record<string, unknown>) {
    if (shouldLog("info"))
      emit({ level: "info", message, context, timestamp: new Date().toISOString() });
  },
  warn(message: string, context?: Record<string, unknown>) {
    if (shouldLog("warn"))
      emit({ level: "warn", message, context, timestamp: new Date().toISOString() });
  },
  error(message: string, context?: Record<string, unknown>) {
    if (shouldLog("error"))
      emit({ level: "error", message, context, timestamp: new Date().toISOString() });
  },
};
