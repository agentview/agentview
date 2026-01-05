import { redirect, Form, useActionData, useLoaderData, data, type LoaderFunctionArgs, type ActionFunctionArgs, type RouteObject } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { AlertCircleIcon } from "lucide-react";
import { betterAuthErrorToBaseError, type ActionResponse } from "../lib/errors";
import { authClient } from "../lib/auth-client";
import { apiFetch } from "../lib/apiFetch";

type LoaderData = {
  invitation: any
};

async function loader({ request }: LoaderFunctionArgs): Promise<ActionResponse<LoaderData> | Response> {
  const session = await authClient.getSession();

  if (session.data) {
    return redirect('/');
  }

  // Check if new installation
  // const statusResponse = await apiFetch<{ is_active: boolean }>('/api/health');
  // if (!statusResponse.ok) {
  //   throw data(statusResponse.error, {
  //     status: statusResponse.status,
  //   });
  // }

  const url = new URL(request.url);
  const invitationId = url.searchParams.get('invitationId');

  const invitationResponse = await apiFetch<any>('/api/invitations/' + invitationId);
  if (!invitationResponse.ok) {
    return {
      ok: false,
      error: invitationResponse.error
    }
  }

  return {
    ok: true,
    data: {
      invitation: invitationResponse.data
    }
  }

  // // If invitationId provided, fetch invitation details
  // if (invitationId) {
  //   const invitationResponse = await authClient.organization.getInvitation({
  //     query: { id: invitationId }
  //   });

  //   if (!invitationResponse.data) {
  //     return {
  //       ok: false,
  //       error: { message: "Invitation not found or has expired." }
  //     };
  //   }

  //   if (invitationResponse.data.status !== 'pending') {
  //     return {
  //       ok: false,
  //       error: { message: "This invitation has already been used." }
  //     };
  //   }

  //   // Check if invitation has expired
  //   if (invitationResponse.data.expiresAt && new Date(invitationResponse.data.expiresAt) < new Date()) {
  //     return {
  //       ok: false,
  //       error: { message: "This invitation has expired." }
  //     };
  //   }

  //   return {
  //     ok: true,
  //     data: {
  //       invitationId,
  //       invitationEmail: invitationResponse.data.email,
  //       organizationName: invitationResponse.data.organization?.name ?? null,
  //       role: invitationResponse.data.role ?? null,
  //     },
  //   };
  // }

  // return {
  //   ok: true,
  //   data: {
  //     invitationId,
  //     email,
  //     role,
  //     org,
  //     // organizationName: null,
  //     // role: null,
  //   },
  // };
}


export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const invitationId = url.searchParams.get('invitationId');
  const formData = await request.formData();
  const name = formData.get('name') as string || '';
  const email = formData.get('email') as string || '';
  const password = formData.get('password') as string || '';
  const confirmPassword = formData.get('confirmPassword') as string || '';

  if (name.trim() === '') {
    return { ok: false, error: { message: "Validation error", fieldErrors: { name: "Name is required." } } };
  }

  if (password !== confirmPassword) {
    return {
      ok: false,
      error: { message: "Validation error", fieldErrors: { confirmPassword: "Passwords do not match." } }
    };
  }

  const signupResponse = await authClient.signUp.email({
    email,
    password,
    name: name.trim(),
    // @ts-ignore
    invitationId
  })

  if (signupResponse.error) {
    return { ok: false, error: betterAuthErrorToBaseError(signupResponse.error) };
  }

  // After signup, redirect to accept-invitation to complete the flow
  if (invitationId) {
    return redirect('/accept-invitation?invitationId=' + encodeURIComponent(invitationId));
  }

  return redirect('/');
}

function Component() {
  const actionData = useActionData<typeof action>();
  const loaderData = useLoaderData<typeof loader>();

  if (!loaderData.ok) {
    return (
      <div className="container mx-auto p-4 max-w-md mt-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Sign up</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{loaderData.error.message}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { invitation } = loaderData.data;

  return (
    <div className="container mx-auto p-4 max-w-md mt-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Sign up</CardTitle>
          {/* {invitationId && (
            <CardDescription className="text-center">
              Join <strong>{org}</strong> as <strong>{role}</strong>
            </CardDescription>
          )} */}
        </CardHeader>
        <CardContent>
          <Form className="flex flex-col gap-4" method="post">

            {actionData?.ok === false && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Signup failed.</AlertTitle>
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
                  value={invitation.email}
                  disabled
                  className="bg-muted"
                />
                <input type="hidden" name="email" value={invitation.email} />
                
              {actionData?.ok === false && actionData?.error?.fieldErrors?.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {actionData.error.fieldErrors.email}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="name" className="text-sm font-medium">
                Name
              </Label>
              <Input
                id="name"
                type="text"
                name="name"
                placeholder="Jon Doe"
                required
              />
              {actionData?.ok === false && actionData?.error?.fieldErrors?.name && (
                <p id="name-error" className="text-sm text-destructive">
                  {actionData.error.fieldErrors.name}
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
              {actionData?.ok === false && actionData?.error?.fieldErrors?.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {actionData.error.fieldErrors.password}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                placeholder="Confirm your password"
                required
              />
              {actionData?.ok === false && actionData?.error?.fieldErrors?.confirmPassword && (
                <p id="confirmPassword-error" className="text-sm text-destructive">
                  {actionData.error.fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <Button type="submit">
              Sign Up
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export const signupRoute: RouteObject = {
  Component,
  loader,
  action,
}
