import { redirect, Form, useActionData, useLoaderData, type LoaderFunctionArgs, type ActionFunctionArgs, type RouteObject } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { AlertCircleIcon } from "lucide-react";
import { betterAuthErrorToBaseError, type ActionResponse } from "../lib/errors";
import { authClient } from "../lib/auth-client";

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function findUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const { data } = await authClient.organization.checkSlug({ slug });
    if (data?.status === true) {
      return slug;
    }
    suffix++;
    slug = `${baseSlug}-${suffix}`;
  }
}

async function loader({ request }: LoaderFunctionArgs) {
  const session = await authClient.getSession();

  if (!session.data) {
    const url = new URL(request.url);
    const relativeUrl = url.pathname + url.search + url.hash;
    return redirect('/login?redirect=' + encodeURIComponent(relativeUrl));
  }

  // Check if user already has organizations
  const orgListResponse = await authClient.organization.list();

  if (orgListResponse.error) {
    throw new Error(orgListResponse.error.message);
  }

  // If user already has orgs, redirect to home
  if (orgListResponse.data.length > 0) {
    return redirect('/');
  }

  return {
    userName: session.data.user.name,
  };
}

async function action({ request }: ActionFunctionArgs): Promise<ActionResponse | Response> {
  const formData = await request.formData();
  const orgName = (formData.get('orgName') as string || '').trim();

  if (orgName === '') {
    return {
      ok: false,
      error: { message: "Validation error", fieldErrors: { orgName: "Organization name is required." } }
    };
  }

  const baseSlug = generateSlug(orgName);
  const slug = await findUniqueSlug(baseSlug);

  const result = await authClient.organization.create({ name: orgName, slug });

  if (result.error) {
    return { ok: false, error: betterAuthErrorToBaseError(result.error) };
  }

  return redirect('/');
}

function Component() {
  const actionData = useActionData<typeof action>();
  const loaderData = useLoaderData<typeof loader>();

  const defaultOrgName = `${loaderData.userName}'s Organization`;

  return (
    <div className="container mx-auto p-4 max-w-md mt-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Create Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <Form className="flex flex-col gap-4" method="post">
            {actionData?.ok === false && !actionData.error.fieldErrors && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Failed to create organization.</AlertTitle>
                <AlertDescription>{actionData.error.message}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1">
              <Label htmlFor="orgName" className="text-sm font-medium">
                Organization Name
              </Label>
              <Input
                id="orgName"
                type="text"
                name="orgName"
                defaultValue={defaultOrgName}
                placeholder="Enter organization name"
                required
              />
              {actionData?.ok === false && actionData?.error.fieldErrors?.orgName && (
                <p id="orgName-error" className="text-sm text-destructive">
                  {actionData.error.fieldErrors.orgName}
                </p>
              )}
            </div>

            <Button type="submit">
              Create Organization
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export const createOrganizationRoute: RouteObject = {
  Component,
  loader,
  action,
}
