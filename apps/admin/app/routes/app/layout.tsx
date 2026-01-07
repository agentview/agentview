import {
  Outlet,
  redirect,
  type LoaderFunctionArgs
} from "react-router";

import { authClient } from "~/authClient";

export async function clientLoader({ request }: LoaderFunctionArgs) {
  const session = await authClient.getSession()

  const url = new URL(request.url);
  const relativeUrl = url.pathname + url.search + url.hash;

  if (!session.data) {
    if (relativeUrl !== '/') {
      return redirect('/login?redirect=' + encodeURIComponent(relativeUrl));
    }
    else {
      return redirect('/login');
    }
  }
}

export default function AppLayout() {
  return <Outlet />
}
