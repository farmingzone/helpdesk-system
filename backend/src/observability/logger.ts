export type LogLevel = "INFO" | "ERROR";

type LogPayload = Record<string, unknown>;

function writeLog(level: LogLevel, event: string, payload: LogPayload) {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...payload
  };

  const serialized = JSON.stringify(entry);
  if (level === "ERROR") {
    console.error(serialized);
    return;
  }

  console.log(serialized);
}

export function logInfo(event: string, payload: LogPayload = {}) {
  writeLog("INFO", event, payload);
}

export function logError(event: string, payload: LogPayload = {}) {
  writeLog("ERROR", event, payload);
}
