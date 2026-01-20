import type { SessionWithCollaboration } from "../SessionWithCollaboration";
import { getLastRun } from "agentview/sessionUtils";
import { useEffect, useRef, useState } from "react";
import { agentview } from "./agentview";
import { invalidateCache } from "./swr-cache";


export function useSession(
    externalSession: SessionWithCollaboration,
    options?: { wait?: boolean }
): SessionWithCollaboration {
    const { wait = false } = options ?? {};

    const [localSession, setLocalSession] = useState<SessionWithCollaboration | undefined>(undefined);

    const activeSession = localSession ?? externalSession; // localSession overrides externalSession EVEN IF isWatching is false! This is by design.
    const lastRun = getLastRun(activeSession);

    const abortControllerRef = useRef<AbortController | undefined>(undefined); // this is also a lock, if defined -> watch is in progrss

    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort(); // abort watch if exists on unmount
        }
    }, [])

    useEffect(() => {
        if (abortControllerRef.current !== undefined) { // is streaming?
            return;
        }

        if (lastRun?.status === "in_progress" || wait) {
            abortControllerRef.current = new AbortController();

            (async () => {
                try {
                    const stream = await agentview.getSessionStream({
                        id: externalSession.id,
                        signal: abortControllerRef.current!.signal,
                        wait
                    });

                    if (stream) {
                        for await (const { session, event } of stream) {
                            setLocalSession(session as SessionWithCollaboration);
                            invalidateCache(`session:${session.id}`) // this could be direct *update* of cache.
                        }
                    }

                } catch (err: any) {
                    if (err?.name === 'AbortError') {
                        return;
                    };
                } finally {
                    abortControllerRef.current = undefined;
                }
            })();
        }
        else {
            if (localSession) { // if not watching 
                const localSessionLastActivityAt = getLastActivityAt(localSession);
                const externalSessionLastActivityAt = getLastActivityAt(externalSession);
                if (localSessionLastActivityAt <= externalSessionLastActivityAt) {
                    setLocalSession(undefined);
                }
            }
        }
    })

    return activeSession;
}


function getLastActivityAt(session: SessionWithCollaboration): Date {
    let lastUpdatedAt = new Date(session.updatedAt);

    const lastRun = getLastRun(session);
    if (lastRun) {
        const lastRunUpdatedAt = new Date(lastRun.updatedAt);
        if (lastRunUpdatedAt > lastUpdatedAt) {
            lastUpdatedAt = lastRunUpdatedAt;
        }
    }

    return lastUpdatedAt;
}
