/**
 * JSON-lines logger (contract: docs/ENGINEERING.md §2). Vercel captures stdout,
 * so each log call is one JSON object you can filter by `event` or `request_id`.
 */

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const SECRET_KEY = /key|secret|token|password|authorization/i;

function serialise(fields: Fields): Fields {
  const out: Fields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (SECRET_KEY.test(k)) out[k] = "[REDACTED]";
    else if (v instanceof Error) out[k] = { type: v.name, message: v.message, stack: v.stack };
    else out[k] = v;
  }
  return out;
}

export interface Logger {
  debug(event: string, fields?: Fields): void;
  info(event: string, fields?: Fields): void;
  warn(event: string, fields?: Fields): void;
  error(event: string, fields?: Fields): void;
}

export function createLogger(context: { requestId?: string } = {}): Logger {
  const write = (level: Level, event: string, fields: Fields = {}) => {
    const record = {
      ts: new Date().toISOString(),
      level,
      service: "web",
      event,
      ...(context.requestId ? { request_id: context.requestId } : {}),
      ...serialise(fields),
    };
    console.log(JSON.stringify(record));
  };
  return {
    debug: (e, f) => write("debug", e, f),
    info: (e, f) => write("info", e, f),
    warn: (e, f) => write("warn", e, f),
    error: (e, f) => write("error", e, f),
  };
}
