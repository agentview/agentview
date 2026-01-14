import { TerminalIcon } from "lucide-react";
import { useFetcher, useLoaderData } from "react-router";
import type { RouteObject } from "react-router";

import { Header, HeaderTitle } from "../components/header";
import { Button } from "../components/ui/button";
import { getEnvironment } from "../lib/environment";
import { useSessionContext } from "../lib/SessionContext";
import { Pill } from "../components/Pill";
import { PropertyList, PropertyListTextValue, PropertyListItem, PropertyListTitle } from "../components/PropertyList";

async function loader() {
  return { environment: await getEnvironment() };
}

function Component() {
  const { environment } = useLoaderData<typeof loader>();
  const { organization } = useSessionContext()
  const configEnvOwner = organization.members.find(m => m.userId === environment.userId);

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
              {environment.userId === null && "production"}
              {environment.userId !== null && `dev (${configEnvOwner?.user.email})`}
            </PropertyListTextValue>
          </PropertyListItem>

        </PropertyList>
        
        <Button variant="outline" onClick={() => {
          console.log(environment.config);
        }} className="mt-4"><TerminalIcon /> Print config to console</Button>
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm mt-4">
          {JSON.stringify(environment.config, null, 2)}
        </pre>
      </div>
    </div>
  </div>
}

export const configsRoute: RouteObject = {
  Component,
  loader,
}