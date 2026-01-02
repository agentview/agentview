import React from "react";
// import type { Member } from "agentview/apiTypes";
import { authClient, type Member, type User, type Organization } from "./auth-client";

export type SessionContextValue = {
  me: User & { role: Member["role"] } // we append role to User. It's good, it doesn't introduce confusion of having member.id and user.id across the system.
  organization: Organization;
  locale: string;
};

export const SessionContext = React.createContext<SessionContextValue | undefined>(
  undefined
);

export function useSessionContext(): SessionContextValue {
  const context = React.useContext(SessionContext);
  if (!context) {
    throw new Error("useSessionContext must be used within a SessionContext.Provider");
  }
  return context;
}

