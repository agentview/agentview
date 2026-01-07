import { redirect, Form, useActionData, data, type LoaderFunctionArgs, type ActionFunctionArgs, type RouteObject } from "react-router";
import { Button } from "@agentview/studio/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@agentview/studio/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@agentview/studio/components/ui/alert";
import { Input } from "@agentview/studio/components/ui/input";
import { Label } from "@agentview/studio/components/ui/label";
import { AlertCircleIcon } from "lucide-react";
import { betterAuthErrorToBaseError, type ActionResponse } from "@agentview/studio/lib/errors";
import { authClient } from "../../authClient";

function getRedirectUrl(request: Request) {
  const url = new URL(request.url);

  // If invitationId is present, redirect to accept-invitation after login
  const invitationId = url.searchParams.get('invitationId');
  if (invitationId) {
    return '/accept-invitation?invitationId=' + encodeURIComponent(invitationId);
  }

  // Otherwise use the redirect param or default to /
  const redirectTo = url.searchParams.get('redirect');
  if (redirectTo && redirectTo.startsWith('/')) {
    return redirectTo;
  }
  return '/';
}

export async function clientAction({
  request,
}: ActionFunctionArgs): Promise<ActionResponse> {
  console.log("Login action");
  const formData = await request.formData();
  const email = formData.get('email') as string || '';
  const password = formData.get('password') as string || '';

  console.log("Email:", email);
  console.log("Password:", password);

  const { error } = await authClient.signIn.email({
      email,
      password,
  });

  if (error) {
    console.log("Error:", error);
    return { ok: false, error: betterAuthErrorToBaseError(error) };
  }

  console.log("Redirecting to:", getRedirectUrl(request));
  return { ok: true, data: redirect(getRedirectUrl(request)) };
}

export default function LoginPage() {
  const actionData = useActionData<typeof clientAction>();

  return (
    <div className="container mx-auto p-4 max-w-md mt-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <Form className="flex flex-col gap-4" method="post">
            {/* General error alert */}
            {actionData?.ok === false && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Login failed.</AlertTitle>
                <AlertDescription>{actionData.error.message}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                required
              />
              {actionData?.ok === false && actionData?.error.fieldErrors?.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {actionData.error.fieldErrors.email}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                name="password"
                placeholder="Enter your password"
                required
              />
              {actionData?.ok === false && actionData?.error.fieldErrors?.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {actionData.error.fieldErrors.password}
                </p>
              )}
            </div>

            <Button type="submit">
              Login
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
