type Level = "debug" | "info" | "warning" | "error";
type Event =
  | "app.start"
  | "storage.open"
  | "sync.commit"
  | "sync.conflict"
  | "backup.created"
  | "backup.preview"
  | "validation.failed"
  | "sync.projection-failed";
/** Only numeric, explicitly allowed context enters the log. Never accept an entity or request body. */
export function log(
  level: Level,
  event: Event,
  context: {
    revision?: number;
    peopleCount?: number;
    connectionCount?: number;
  } = {},
) {
  const { revision, peopleCount, connectionCount } = context;
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      operationId: crypto.randomUUID(),
      context: { revision, peopleCount, connectionCount },
    }),
  );
}
