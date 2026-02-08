
export type AuditEvent = { type: string; message: string; timestamp: number }
const history: AuditEvent[] = []
export function logEvent(type: string, message: string) {
  const ev = { type, message, timestamp: Date.now() }
  history.unshift(ev)
  console.info('[AUDIT]', ev)
}
export function getHistory() { return history }
