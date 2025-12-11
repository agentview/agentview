import { type RouteObject } from "react-router";
import { ItemCard, ItemCardContent, ItemCardTitle, JSONComponent, Markdown } from "../components/session-item";
import { BrainIcon, Wrench } from "lucide-react";

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

function Component() {
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
            <Markdown text={markdownExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="ItemCard / Default + markdown + small">
          <ItemCard size="sm">
            <Markdown text={markdownExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="ItemCard / Outline">
          <ItemCard variant="outline">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="ItemCard / Outline + markdown"   >
          <ItemCard variant="outline">
            <Markdown text={markdownExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="ItemCard / Fill">
          <ItemCard variant="fill">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="ItemCard / Fill + markdown">
          <ItemCard variant="fill">
            <Markdown text={markdownExample} />
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
            <Markdown text={miniMarkdownExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="With Title + small + markdown">
          <ItemCard size="sm">
            <ItemCardTitle><BrainIcon /> Thought for 3 seconds</ItemCardTitle>
            <Markdown text={miniMarkdownExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="JSON">
          <ItemCard>
            <JSONComponent value={jsonExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="JSON + outline">
          <ItemCard variant="outline">
            <JSONComponent value={jsonExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="JSON + fill">
          <ItemCard variant="fill">
            <JSONComponent value={jsonExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="JSON + small">
          <ItemCard size="sm">
            <JSONComponent value={jsonExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="JSON + small + outline">
          <ItemCard size="sm" variant="outline">
            <JSONComponent value={jsonExample} />
          </ItemCard>
        </ComponentWrapper>
        
        <ComponentWrapper title="JSON + small + fill">
          <ItemCard size="sm" variant="fill">
            <JSONComponent value={jsonExample} />
          </ItemCard>
        </ComponentWrapper>
        
        <ComponentWrapper title="JSON + title + small">
          <ItemCard size="sm">
            <ItemCardTitle><Wrench /> Tool call</ItemCardTitle>
            <JSONComponent value={jsonExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="JSON + title + small + outline">
          <ItemCard size="sm" variant="outline">
            <ItemCardTitle><Wrench /> Tool call</ItemCardTitle>
            <JSONComponent value={jsonExample} />
          </ItemCard>
        </ComponentWrapper>

        <ComponentWrapper title="JSON + title + fill">
          <ItemCard size="default" variant="fill">
            <ItemCardTitle><Wrench /> Tool call</ItemCardTitle>
            <JSONComponent value={jsonExample} />
          </ItemCard>
        </ComponentWrapper>
      </div>
    </div>
  );
}

function ComponentWrapper({ children, title }: { children: React.ReactNode, title?: string }) {
  return (
    <div>
      {title && <h4 className="text-sm text-muted-foreground font-medium mb-1">{title}</h4>}

      <div className="mb-8 mt-2 border rounded-md p-6">
        {children}
      </div>

    </div>
  );
}

export const uiRoute: RouteObject = {
  Component
}