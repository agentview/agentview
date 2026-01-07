import { useLoaderData } from "react-router";
import type { Route } from "./+types/home";

export async function clientLoader({ request, params }: Route.LoaderArgs) {
  return {
    orgId: params.orgId,
  }
}

export default function Home() { 
  const { orgId } = useLoaderData<typeof clientLoader>();
  return <div>Organization: { orgId }</div>;
}
