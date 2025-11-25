import type { RouteObject } from "react-router";
import type { BaseScoreConfig, BaseSessionItemConfig, BaseAgentConfig, BaseAgentViewConfig, BaseRunConfig } from "./lib/shared/configTypes";
import type { Run, Session } from "./lib/shared/apiTypes";
import { enhanceSession } from "./lib/shared/sessionUtils";
import { z, type ZodType } from "zod";
import type { BaseError } from "./lib/errors";
import { requireAgentConfig } from "./lib/shared/configUtils";


export type CustomRoute = {
  route: RouteObject;
  scope: "default" | "loggedIn",
  title: React.ReactNode,
}

export type DisplayComponentProps<T = any> = {
  value: T,
}

export type DisplayProperty<TInputArgs = any> = {
  title: string;
  value: (args: TInputArgs) => React.ReactNode;
}

export type FormComponentProps<TSchema extends z.ZodTypeAny> = {
  value?: z.infer<TSchema> | undefined, 
  submit: (value: z.infer<TSchema> | null) => void,
  cancel: () => void,
  isRunning: boolean,
  error?: BaseError,
  schema: TSchema,
}

export type FormComponent<TSchema extends z.ZodTypeAny> = React.ComponentType<FormComponentProps<TSchema>>;

export type ControlComponentProps<TValue> = {
  value: TValue | undefined | null;
  onChange: (value: TValue | null) => void;
  name?: string;
  onBlur?: () => void;
  disabled?: boolean;
}

export type ControlComponent<TValue> = React.ComponentType<ControlComponentProps<TValue>>;

export type ScoreConfig<TValue = any> = BaseScoreConfig & {
  title?: string;
  inputComponent: ControlComponent<TValue>;
  displayComponent?: React.ComponentType<{ value: TValue }>;
  actionBarComponent?: ControlComponent<TValue>;
}

export type SessionItemDisplayComponentProps<T=any> = DisplayComponentProps<T>;

export type SessionItemConfig = BaseSessionItemConfig<ScoreConfig> & {
  displayComponent?: React.ComponentType<DisplayComponentProps> | null;
  callResult?: SessionItemConfig;
};

// export type SessionInputItemConfig = SessionItemConfig & {
//   inputComponent?: FormComponent<any>;
// };

export type RunConfig = BaseRunConfig<SessionItemConfig, SessionItemConfig> & {
  title?: string;
  displayProperties?: DisplayProperty<{ session: Session, run: Run }>[];
};

export type AgentInputComponentProps<TSchema extends z.ZodTypeAny> = {
  session: ReturnType<typeof enhanceSession>,
  token: string,
  isRunning: boolean,
  cancel: () => void,
  submit: (url: string, options: RequestInit & { input?: z.infer<TSchema> }) => Promise<void>
}

export type AgentInputComponent<TSchema extends z.ZodTypeAny = z.ZodAny> = React.ComponentType<AgentInputComponentProps<TSchema>>

export type AgentConfig = BaseAgentConfig<RunConfig> & {
  displayProperties?: DisplayProperty<{ session: Session }>[];
  newSessionComponent?: FormComponent<any>;
  inputComponent?: AgentInputComponent;
  run?: RunConfig;
}

export type AgentViewConfig = BaseAgentViewConfig<AgentConfig> & {
  apiBaseUrl: string;
  // agents?: AgentConfig[],
  customRoutes?: CustomRoute[],
}
