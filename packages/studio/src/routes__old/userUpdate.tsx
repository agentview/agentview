import type { Env } from "agentview/apiTypes";
import { apiFetch } from "../lib/apiFetch";
import type { ActionFunctionArgs, RouteObject } from "react-router";

async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();

  const env = formData.get("env") as Env;
  
  const response = await apiFetch(`/api/users/${params.userId}`, {
    method: "PATCH",
    body: { env },
  });

  if (!response.ok) {
    return { ok: false, error: response.error };
  }

  return { ok: true, data: {} };
}

// function Component() {
//   return (
//     <div className="p-6">
//       <h1 className="text-2xl font-bold mb-4">End User Share</h1>
//       <p>Client share page content goes here.</p>
//     </div>
//   );
// }

export const userUpdateRoute: RouteObject = {
  // Component,
  action,
}
