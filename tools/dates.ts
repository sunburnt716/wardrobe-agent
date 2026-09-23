// now is injected via AgentContext (tool layer dev spec §2) rather than
// read from the system clock, so recency math here is deterministic under
// test.
export function daysAgo(now: Date, dateStr: string): number {
  const then = new Date(`${dateStr}T00:00:00Z`);
  const diffMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    - Date.UTC(then.getUTCFullYear(), then.getUTCMonth(), then.getUTCDate());
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

export function dateNDaysAgo(now: Date, days: number): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
