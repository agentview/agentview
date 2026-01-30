import { Alert, AlertDescription } from "@agentview/studio/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@agentview/studio/components/ui/card";
import { type ActionResponse } from "@agentview/studio/lib/errors";
import { AlertCircleIcon } from "lucide-react";
import { redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/auth";
import { authClient } from "~/authClient";
import { CardPageLayout } from "@agentview/studio/components/CardPageLayout";

export async function clientLoader({ request }: Route.LoaderArgs) : Promise<ActionResponse | Response> {
  const url = new URL(request.url);
  const originParam = url.searchParams.get('origin');

  console.log('AUTH!!!!!', originParam);

  if (!originParam) {
    return {
      ok: false,
      error: { message: "Origin is required." }
    }
  }
  
  const sessionResponse = await authClient.getSession();

  // Logged in users - auto-auth redirect
  if (sessionResponse.data) {
    const session = sessionResponse.data.session;
    const originUrl = new URL(originParam);
    originUrl.searchParams.set('token', session.token);
    window.location.href = originUrl.toString();
  }
  else {
    return redirect(`/login?origin=${encodeURIComponent(originParam)}`);
  }

  return {
    ok: true,
    data: {
    }
  }
}

// export async function clientAction({
//   request,
//   params
// }: Route.ActionArgs): Promise<ActionResponse> {
//   const formData = await request.formData();
//   const email = formData.get('email') as string || '';
//   const password = formData.get('password') as string || '';

//   const { data, error } = await authClient.signIn.email({
//       email,
//       password,
//   });

//   if (error) {
//     return { ok: false, error: betterAuthErrorToBaseError(error) };
//   }

//   const url = new URL(request.url);
//   const origin = url.searchParams.get('origin');

//   if (origin) {
//     const originUrl = new URL(origin);
//     originUrl.searchParams.set('token', data.token);
//     window.location.href = originUrl.toString();
//   }

//   return { ok: true, data: redirect(getRedirectUrl(request)) };
// }

export default function AuthPage() {
  // This component should never render since loader always redirects
  // But we'll show a loading state just in case
  const loaderData = useLoaderData<typeof clientLoader>();
  
  return (
    <CardPageLayout>
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Authenticate</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          { !loaderData.ok && <Alert variant="destructive"> 
            <AlertCircleIcon className="h-4 w-4" /> 
              <AlertDescription>{loaderData.error.message}</AlertDescription>
            </Alert>
          }
        </CardContent>
      </Card>
    </CardPageLayout>
  );
}