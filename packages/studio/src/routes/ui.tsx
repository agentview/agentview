import { useState } from "react";
import { type RouteObject } from "react-router";
import { ItemCard, ItemCardContent, ItemCardTitle, ItemCardJSON, ItemCardMarkdown } from "../components/session-item";
import { BrainIcon, Wrench, CircleIcon, SquareIcon, TriangleIcon, HexagonIcon, StarIcon } from "lucide-react";
import { PillSelect } from "../components/PillSelect";
import { PillMultiSelect } from "../components/PillMultiSelect";

const markdownExample = `
### This is a subtitle

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

- This is a first list item
- This is a second list item

Thanks for reading.
`;

const miniMarkdownExample = `
#### This is a subtitle

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
`;

const jsonExample = {
  name: "John Doe",
  age: 30,
  email: "john.doe@example.com",
  address: {
    street: "123 Main St",
    city: "Anytown",
  }
};

const shapeOptions = [
  { value: "circle", label: "Circle", color: "#fecaca", icon: <CircleIcon className="size-4" /> },
  { value: "square", label: "Square", color: "#bbf7d0", icon: <SquareIcon className="size-4" /> },
  { value: "triangle", label: "Triangle", color: "#bfdbfe", icon: <TriangleIcon className="size-4" /> },
  { value: "hexagon", label: "Hexagon", color: "#fef08a", icon: <HexagonIcon className="size-4" /> },
  { value: "star", label: "Star", color: "#e9d5ff", icon: <StarIcon className="size-4" /> },
];

function Component() {
  const [selectValue, setSelectValue] = useState<string | null>("circle");
  const [multiSelectValue, setMultiSelectValue] = useState<string[]>(["circle", "star"]);

  return (
    <div className="container mx-auto mt-16 p-4">

      <div className="">

        <h1 className="text-2xl font-medium mb-6">AgentView UI Components</h1>

        <h2 className="text-lg font-medium mb-6">Session Items</h2>

        <ComponentWrapper title="ItemCard / Default">
          <ItemCard>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="ItemCard / Default + markdown">
          <ItemCard>
            <ItemCardMarkdown text={markdownExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="ItemCard / Default + markdown + small">
          <ItemCard size="sm">
            <ItemCardMarkdown text={markdownExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="ItemCard / Outline">
          <ItemCard variant="outline">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="ItemCard / Outline + markdown"   >
          <ItemCard variant="outline">
            <ItemCardMarkdown text={markdownExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="ItemCard / Fill">
          <ItemCard variant="fill">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="ItemCard / Fill + markdown">
          <ItemCard variant="fill">
            <ItemCardMarkdown text={markdownExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="With Title">
          <ItemCard variant="fill">
            <ItemCardTitle><BrainIcon /> Thought for 3 seconds</ItemCardTitle>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="With Title + small">
          <ItemCard size="sm">
            <ItemCardTitle><BrainIcon /> Thought for 3 seconds</ItemCardTitle>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="With Title + markdown">
          <ItemCard variant="fill">
            <ItemCardTitle><BrainIcon /> Thought for 3 seconds</ItemCardTitle>
            <ItemCardMarkdown text={miniMarkdownExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="With Title + small + markdown">
          <ItemCard size="sm">
            <ItemCardTitle><BrainIcon /> Thought for 3 seconds</ItemCardTitle>
            <ItemCardMarkdown text={miniMarkdownExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="JSON">
          <ItemCard>
            <ItemCardJSON value={jsonExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="JSON + outline">
          <ItemCard variant="outline">
            <ItemCardJSON value={jsonExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="JSON + fill">
          <ItemCard variant="fill">
            <ItemCardJSON value={jsonExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="JSON + small">
          <ItemCard size="sm">
            <ItemCardJSON value={jsonExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="JSON + small + outline">
          <ItemCard size="sm" variant="outline">
            <ItemCardJSON value={jsonExample} />
          </ItemCard>
        </ComponentWrapper>
        
        <ComponentWrapper title="JSON + small + fill">
          <ItemCard size="sm" variant="fill">
              <ItemCardJSON value={jsonExample} />
          </ItemCard>
        </ComponentWrapper>
        
        <ComponentWrapper title="JSON + title + small">
          <ItemCard size="sm">
            <ItemCardTitle><Wrench /> Tool call</ItemCardTitle>
            <ItemCardJSON value={jsonExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="JSON + title + small + outline">
          <ItemCard size="sm" variant="outline">
            <ItemCardTitle><Wrench /> Tool call</ItemCardTitle>
            <ItemCardJSON value={jsonExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="JSON + title + fill">
          <ItemCard size="default" variant="fill">
            <ItemCardTitle><Wrench /> Tool call</ItemCardTitle>
            <ItemCardJSON value={jsonExample} />
          </ItemCard>
        </ComponentWrapper>

        <h2 className="text-lg font-medium mb-6">Pill Selects</h2>

        <ComponentWrapper title="PillSelect">
          <PillSelect
            value={selectValue}
            onChange={setSelectValue}
            options={shapeOptions}
            placeholder="Select a shape..."
            className="w-full"
          />
        </ComponentWrapper>

        <ComponentWrapper title="PillMultiSelect">
          <PillMultiSelect
            value={multiSelectValue}
            onChange={setMultiSelectValue}
            options={shapeOptions}
            placeholder="Select shapes..."
            className="w-full"
          />
        </ComponentWrapper>
      </div>
    </div>
  );
}

function ComponentWrapper({ children, title }: { children: React.ReactNode, title?: string }) {
  return (
    <div className="max-w-3xl">
      {title && <h4 className="text-sm text-muted-foreground font-medium mb-1">{title}</h4>}

      <div className="mb-8 mt-2 border rounded-md p-16">
        {children}
      </div>

    </div>
  );
}

export const uiRoute: RouteObject = {
  Component
}