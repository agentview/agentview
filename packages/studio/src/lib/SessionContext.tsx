import React from "react";
// import type { Member } from "agentview/apiTypes";
import { authClient, type Member, type Organization } from "./auth-client";

export type SessionContextValue = {
  me: Member;
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

