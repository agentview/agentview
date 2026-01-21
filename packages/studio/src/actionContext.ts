import { createContext } from "react-router";

type ActionContextValue = {
    isAction: boolean;
}

export const actionContext =
  createContext<ActionContextValue | null>(null);
