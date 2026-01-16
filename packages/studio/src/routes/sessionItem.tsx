import { data, useLoaderData, useOutletContext, useParams, useRevalidator } from "react-router";
import type { RouteObject } from "react-router";
import { Header, HeaderTitle } from "../components/header";
import type { Session, SessionWithCollaboration } from "agentview/apiTypes";
import { getAllSessionItems } from "agentview/sessionUtils";
import { CommentsThreadRaw } from "../components/internal/comments";
import { agentview } from "../lib/agentview";
import { useEffect } from "react";

function Component() {
    const { session } = useOutletContext<{ session: SessionWithCollaboration }>();
    const params = useParams();
    const revalidator = useRevalidator();

    const items = getAllSessionItems(session)
    const item = items.find((a) => a.id === params.itemId)

    if (!item) {
        throw data({ message: "Item not found" }, { status: 404 })
    }

    useEffect(() => {
        agentview.markItemSeen(session.id, item.id)
            .then(() => revalidator.revalidate())
            .catch((error) => console.error(error))
    }, [item.id]) // make sure /seen is called when switching sessions

    return <div className="flex-1  flex flex-col">
        <Header>
            <HeaderTitle title={`Session Item`} />
        </Header>
        <div className="flex-1 overflow-y-auto">
            <CommentsThreadRaw
                item={item}
                session={session}
                collapsed={false}
                singleLineMessageHeader={true}
            />

        </div>
    </div>
}

export const sessionItemRoute: RouteObject = {
  Component,
}
