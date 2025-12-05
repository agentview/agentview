import { redirect, Form, useActionData, useFetcher, data, useLoaderData } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs, RouteObject } from "react-router";
import { Header, HeaderTitle } from "~/components/header";
import { apiFetch } from "~/lib/apiFetch";
import { getListParams, toQueryParams } from "~/lib/listParams";
import { type ActionResponse } from "~/lib/errors";
import { config } from "~/config";
import { requireAgentConfig } from "~/lib/shared/configUtils";
import { AVFormError } from "~/components/internal/form";

async function loader({ request }: LoaderFunctionArgs) {
  const listParams = getListParams(request);
  const agentConfig = requireAgentConfig(config, listParams.agent);

  return {
    agentConfig
  } 
}

async function action({ request, params }: ActionFunctionArgs): Promise<ActionResponse | Response> {
  const listParams = getListParams(request);
  const agentConfig = requireAgentConfig(config, listParams.agent);

  // This action only supports JSON payloads, other encoding methods (like form data) treat this request as if context was not provided
  let payload: any = undefined;
  if (request.headers.get("Content-Type") === "application/json") {
    payload = await request.json();
  }

  if (!payload && agentConfig.newSessionComponent) {
    return redirect(`/sessions/new?${toQueryParams(listParams)}`, { status: 303 });
  }



  const clientResponse = await apiFetch('/api/users', {
    method: 'POST',
    body: {
      isShared: false
    }
  });

  if (!clientResponse.ok) {
    throw data(clientResponse.error, { status: clientResponse.status });
  }
  
  const sessionResponse = await apiFetch('/api/sessions', {
    method: 'POST',
    body: {
      agent: agentConfig.name,
      clientId: clientResponse.data.id,
      metadata: payload?.metadata
    }
  });

  if (!sessionResponse.ok) {
    return { ok: false, error: sessionResponse.error };
  }

  return redirect(`/sessions/${sessionResponse.data.handle}?${toQueryParams(listParams)}`);
}

function Component() {
  const { agentConfig } = useLoaderData<typeof loader>();

  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher();
  const data = actionData ?? fetcher.data;
  const error = data?.ok === false ? data.error : undefined;

  return <div className="flex-1">
    <Header>
      <HeaderTitle title={`New Session`} />
    </Header>

    <div className="flex-1 overflow-y-auto">
      <div className="p-6 max-w-4xl space-y-6">
        {error && <AVFormError error={error} className="mb-6" />}

        {agentConfig.newSessionComponent && <agentConfig.newSessionComponent
          submit={(values) => { 

            console.log('submit!!!', values);
            fetcher.submit(values ?? {}, { method: 'post', encType: 'application/json' }) 
          }}
          isRunning={fetcher.state === "submitting"}
        />}

      </div>
    </div>
  </div>
}

export const sessionNewRoute: RouteObject = {
  Component,
  loader,
  action,
}