import { type SessionItem, type Session, type Run, type SessionWithCollaboration, type RunWithCollaboration, type SessionItemWithCollaboration } from "./apiTypes"

export function getLastRun(session: Session) : Run | undefined;
export function getLastRun(session: SessionWithCollaboration) : RunWithCollaboration | undefined;
export function getLastRun(session: Session | SessionWithCollaboration) {
  return session.runs.length > 0 ? session.runs[session.runs.length - 1] : undefined
}

export function getActiveRuns(session: Session) : Run[];
export function getActiveRuns(session: SessionWithCollaboration) : RunWithCollaboration[];
export function getActiveRuns(session: Session | SessionWithCollaboration) {
  return session.runs.filter((run, index) => run.status !== 'failed' || index === session.runs.length - 1)
}

export function getAllSessionItems(session: Session, options?: { activeOnly?: boolean }) : SessionItem[];
export function getAllSessionItems(session: SessionWithCollaboration, options?: { activeOnly?: boolean }) : SessionItemWithCollaboration[];
export function getAllSessionItems(session: Session | SessionWithCollaboration, options?: { activeOnly?: boolean }) {
  const items: SessionItem[] = []

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
