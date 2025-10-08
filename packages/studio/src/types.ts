import type { RouteObject } from "react-router";
import type { BaseScoreConfig, BaseSessionItemConfig, BaseAgentConfig, BaseConfig, BaseRunConfig } from "./lib/shared/configTypes";
import type { Run, Session } from "./lib/shared/apiTypes";
import type { z } from "zod";
import type { BaseError } from "./lib/errors";
import type { AVFormControlProps } from "./components/form";

export type FormInputProps<T=any> = {
  id: string,
  name: string,
  value: T,
  onChange: (value: T) => void,
  options?: any
}

export type DisplayComponentProps<T=any> = {
  value: T,
}

export type CustomRoute = {
  route: RouteObject;
  scope: "default" | "loggedIn",
  title: React.ReactNode,
}

export type DisplayProperty<InputArgsT=any> = {
  title: string;
  value: (args: InputArgsT) => React.ReactNode;
}

export type FormComponentProps = {
  submit: (value: any) => void,
  cancel: () => void,
  isRunning: boolean,
  error?: BaseError,
  schema: z.ZodTypeAny,
}

export type FormComponent = React.ComponentType<FormComponentProps>;

export type ControlComponentProps<TValue> = {
  value: TValue | undefined;
  onChange: (value: TValue | undefined) => void;
  name?: string;
  onBlur?: () => void;
  disabled?: boolean;
}

export type ControlComponent<TValue> = React.ComponentType<ControlComponentProps<TValue>>;

export type ScoreConfig<TValue=any> = BaseScoreConfig & {
  title?: string;
  inputComponent: ControlComponent<TValue>;
  displayComponent?: React.ComponentType<{ value: TValue }>;
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
