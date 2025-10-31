import { type SessionItem, type Session, type Run, type SessionWithCollaboration, type RunWithCollaboration, type SessionItemWithCollaboration } from "./apiTypes"

export function getLastRun<SessionT extends Session>(session: SessionT) : SessionT["runs"][number] | undefined {
  return session.runs.length > 0 ? session.runs[session.runs.length - 1] : undefined
}

export function getActiveRuns<SessionT extends Session>(session: SessionT) : SessionT["runs"][number][] {
  return session.runs.filter((run, index) => run.status !== 'failed' || index === session.runs.length - 1)
}

export function getAllSessionItems<SessionT extends Session>(session: SessionT, options?: { activeOnly?: boolean }) : SessionT["runs"][number]["items"][number][] {
  const items : SessionT["runs"][number]["items"][number][] = []
  const activeRuns = options?.activeOnly ? getActiveRuns(session) : session.runs
  activeRuns.map((run, index) => {
    items.push(...run.items)
  })
  return items
}

export function getVersions(session: Session | SessionWithCollaboration) {
  const seen = new Set<string>();
  return session.runs
    .map((run) => run.version)
    .filter((version) => {
      if (!version || seen.has(version.id)) return false;
      seen.add(version.id);
      return true;
    });
}
