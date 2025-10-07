import type { RouteObject } from "react-router";
import type { BaseScoreConfig, BaseSessionItemConfig, BaseAgentConfig, BaseConfig, BaseRunConfig } from "./lib/shared/configTypes";
import type { Run, Session } from "./lib/shared/apiTypes";
import type { z } from "zod";
import type { BaseError } from "./lib/errors";

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

export type InputComponentProps = {
  submit: (value: any) => void,
  cancel: () => void,
  isRunning: boolean,
  error?: BaseError,
  schema: z.ZodTypeAny,
}

export type InputComponent = React.ComponentType<InputComponentProps>;


export type ScoreConfig<T=any> = BaseScoreConfig & {
  title?: string;
  inputComponent: React.ComponentType<FormInputProps>;
  displayComponent?: React.ComponentType<DisplayComponentProps>;
}

export type SessionItemConfig = BaseSessionItemConfig<ScoreConfig> & {
  displayComponent?: React.ComponentType<DisplayComponentProps>;
};

export type SessionInputItemConfig = SessionItemConfig & {
  inputComponent?: React.ComponentType<InputComponentProps>;
};

export type RunConfig = BaseRunConfig<SessionItemConfig, SessionInputItemConfig> & {
  title?: string;
  displayProperties?: DisplayProperty<{ session: Session, run: Run }>[];
};


export type SharedAgentConfigProperties = {
  displayProperties?: DisplayProperty<{ session: Session }>[];
  inputComponent?: React.ComponentType<InputComponentProps>;
}

export type MultipleRunsAgentConfig = Omit<BaseAgentConfig<RunConfig>, "runs"> & SharedAgentConfigProperties & {
  multipleRuns: true;
  runs: RunConfig[];
}

export type SingleRunAgentConfig = Omit<BaseAgentConfig<RunConfig>, "runs"> & SharedAgentConfigProperties & {
  multipleRuns?: false;
  run: RunConfig;
}

export type AgentConfig = MultipleRunsAgentConfig | SingleRunAgentConfig;

export type AgentViewConfig = {
  apiBaseUrl: string;
  agents?: AgentConfig[],
  customRoutes?: CustomRoute[],
}

export type AgentViewConfigInternal = {
  apiBaseUrl: string;
  agents?: MultipleRunsAgentConfig[],
  customRoutes?: CustomRoute[],
}