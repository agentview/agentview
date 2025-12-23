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
  invitationId: string | null;
  invitationEmail: string | null;
  organizationName: string | null;
  role: string | null;
};

async function loader({ request }: LoaderFunctionArgs): Promise<ActionResponse<LoaderData> | Response> {
  const session = await authClient.getSession();

  if (session.data) {
    return redirect('/');
  }

  // Check if new installation
  const statusResponse = await apiFetch<{ is_active: boolean }>('/api/health');
  if (!statusResponse.ok) {
    throw data(statusResponse.error, {
      status: statusResponse.status,
    });
  }

  const url = new URL(request.url);
  const invitationId = url.searchParams.get('invitationId');

  // If invitationId provided, fetch invitation details
  if (invitationId) {
    const invitationResponse = await authClient.organization.getInvitation({
      query: { id: invitationId }
    });

    if (!invitationResponse.data) {
      return {
        ok: false,
        error: { message: "Invitation not found or has expired." }
      };
    }

    if (invitationResponse.data.status !== 'pending') {
      return {
        ok: false,
        error: { message: "This invitation has already been used." }
      };
    }

    // Check if invitation has expired
    if (invitationResponse.data.expiresAt && new Date(invitationResponse.data.expiresAt) < new Date()) {
      return {
        ok: false,
        error: { message: "This invitation has expired." }
      };
    }

    return {
      ok: true,
      data: {
        invitationId,
        invitationEmail: invitationResponse.data.email,
        organizationName: invitationResponse.data.organization?.name ?? null,
        role: invitationResponse.data.role ?? null,
      },
    };
  }

  return {
    ok: true,
    data: {
      invitationId: null,
      invitationEmail: null,
      organizationName: null,
      role: null,
    },
  };
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
  })

  if (signupResponse.error) {
    return { ok: false, error: betterAuthErrorToBaseError(signupResponse.error) };
  }

  // Auto-accept invitation after signup
  if (invitationId) {
    const acceptResult = await authClient.organization.acceptInvitation({
      invitationId,
    });

    if (acceptResult.error) {
      // Log but don't block - user is already signed up
      console.error('Failed to accept invitation:', acceptResult.error);
    }
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

  const { invitationEmail, organizationName, role } = loaderData.data;

  return (
    <div className="container mx-auto p-4 max-w-md mt-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Sign up</CardTitle>
          {organizationName && (
            <CardDescription className="text-center">
              Join <strong>{organizationName}</strong> as <strong>{role}</strong>
            </CardDescription>
          )}
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
              {invitationEmail ? (
                <>
                  <Input
                    id="email"
                    type="email"
                    value={invitationEmail}
                    disabled
                    className="bg-muted"
                  />
                  <input type="hidden" name="email" value={invitationEmail} />
                </>
              ) : (
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="your_email@acme.com"
                  required
                />
              )}
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
