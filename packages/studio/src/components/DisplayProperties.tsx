import { PropertyList } from "./PropertyList"

import { ErrorBoundary } from "./ErrorBoundary"
import type { DisplayProperty } from "~/types"

export function DisplayProperties<T>(props: { displayProperties: DisplayProperty<T>[], inputArgs: T }) {
    return <ErrorBoundary>
        {props.displayProperties.map((property) => {

            return <PropertyList.Item key={property?.title}>
                <PropertyList.Title>{property?.title ?? "Unknown property"}</PropertyList.Title>
                <PropertyList.TextValue>
                    <DisplayPropertyRenderer value={property?.value} inputArgs={props.inputArgs} />
                </PropertyList.TextValue>
            </PropertyList.Item>
        })}
    </ErrorBoundary>
}


function DisplayPropertyRenderer<T>({ value, inputArgs }: { value: (inputArgs: T) => React.ReactNode, inputArgs: T }) {
    return <div>{value(inputArgs)}</div>
}