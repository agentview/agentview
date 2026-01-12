import { TerminalIcon } from "lucide-react";
import { useFetcher, useLoaderData } from "react-router";
import type { RouteObject } from "react-router";

import { Header, HeaderTitle } from "../components/header";
import { Button } from "../components/ui/button";
import { getRemoteConfig } from "../lib/remoteConfig";
import { useSessionContext } from "../lib/SessionContext";
import { Pill } from "../components/Pill";
import { PropertyList, PropertyListTextValue, PropertyListItem, PropertyListTitle } from "../components/PropertyList";

async function loader() {
  return { config: await getRemoteConfig() };
}

function Component() {
  const { config } = useLoaderData<typeof loader>();
  const { organization } = useSessionContext()
  const configEnvOwner = organization.members.find(m => m.userId === config.envId);

  return <div>
    <Header>
      <HeaderTitle title="Config" />
    </Header>

    <div className="p-6 max-w-6xl">
      <div>
        <PropertyList>
          <PropertyListItem>
            <PropertyListTitle>Environment</PropertyListTitle>
            <PropertyListTextValue>
              {config.envId === null && "production"}
              {config.envId !== null && `dev (${configEnvOwner?.user.email})`}
            </PropertyListTextValue>
          </PropertyListItem>

        </PropertyList>
        
        <Button variant="outline" onClick={() => {
          console.log(config.config);
        }} className="mt-4"><TerminalIcon /> Print config to console</Button>
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm mt-4">
          {JSON.stringify(config.config, null, 2)}
        </pre>
      </div>
    </div>
  </div>
}

export const configsRoute: RouteObject = {
  Component,
  loader,
}