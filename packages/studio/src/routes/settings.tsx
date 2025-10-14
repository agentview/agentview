import { useLoaderData, Link, data } from "react-router";
import type { RouteObject } from "react-router";

import { Header, HeaderTitle } from "~/components/header";
import { apiFetch } from "~/lib/apiFetch";

// async function loader() {
//   const response = await apiFetch(`/api/dev/emails`);

//   if (!response.ok) {
//     throw data('Failed to fetch emails', {
//       status: response.status, // TODO: standardised error handling from clientLoaders!!! 
//     });
//   }
//   return { emails: response.data };
// }

function Component() {
  // const { emails } = useLoaderData<typeof loader>();

  return <div>

    <Header>
      <HeaderTitle title="Settings" />
    </Header>

    <div className="p-6 max-w-6xl">
      Bam bam.
    </div>
  </div>
}

export const settingsRoute: RouteObject = {
  Component,
  // loader,
}