import type { RouteObject } from "react-router";
import type { BaseScoreConfig, BaseSessionItemConfig, BaseAgentConfig, BaseConfig, BaseRunConfig } from "./lib/shared/configTypes";
import type { Run, Session } from "./lib/shared/apiTypes";
import { z, type ZodType } from "zod";
import type { BaseError } from "./lib/errors";


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

/**
 * This is generic type:
 * - for "new item" / "new session" form after successful submit, AgentView already takes action (redirect or form reset). In that case submit success callback won't be called and value will be always undefined.
 * - for scores it's a bit different, value can be defined, it can come from external source (e.g. from API response), submit success callback might be also necessary.
 */
export type FormComponentProps<TSchema extends z.ZodTypeAny> = {
  value: z.infer<TSchema> | undefined, 
  submit: (value: z.infer<TSchema> | undefined) => Promise<void>,
  cancel: () => void,
  isRunning: boolean,
  error?: BaseError,
  schema: TSchema,
}

export type FormComponent = React.ComponentType<FormComponentProps>;

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
  actionBarComponent?: FormComponent;
}

export type SessionItemConfig = BaseSessionItemConfig<ScoreConfig> & {
  displayComponent?: React.ComponentType<DisplayComponentProps>;
};

export type SessionInputItemConfig = SessionItemConfig & {
  inputComponent?: FormComponent;
};

export type RunConfig = BaseRunConfig<SessionItemConfig, SessionInputItemConfig> & {
  title?: string;
  displayProperties?: DisplayProperty<{ session: Session, run: Run }>[];
};

export type AgentConfig = Omit<BaseAgentConfig<RunConfig>, "runs"> & {
  displayProperties?: DisplayProperty<{ session: Session }>[];
  inputComponent?: FormComponent;
  runs?: RunConfig[];
  run?: RunConfig;
}

export type AgentViewConfig = {
  apiBaseUrl: string;
  agents?: AgentConfig[],
  customRoutes?: CustomRoute[],
}
