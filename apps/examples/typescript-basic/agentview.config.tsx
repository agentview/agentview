import { z } from "zod";
import { defineConfig } from "agentview";
import { AssistantMessage, ItemCard, ItemCardMarkdown, ItemCardTitle, UserMessage, UserMessageInput } from "@agentview/studio";
import { Brain } from "lucide-react";

export default defineConfig({
  apiBaseUrl: "http://localhost:1990",
  agents: [
    {
      name: "simple_chat",
      runs: [
        {
          input: {
            schema: z.object({
              type: z.literal("message"),
              role: z.literal("user"),
              content: z.string(),
            }),
            displayComponent: ({ item }) => <UserMessage>{item.content}</UserMessage>,
          },
          steps: [
            {
              schema: z.looseObject({
                type: z.literal("reasoning"),
                summary: z.array(z.object({
                  type: z.literal("summary_text"),
                  text: z.string(),
                })),
              }),
              displayComponent: ({ item }) => {
                return (
                  <ItemCard size="sm" variant="fill">
                    <ItemCardTitle><Brain /> Thinking</ItemCardTitle>
                    <ItemCardMarkdown text={item.summary?.map((s: any) => s?.text ?? "").join("\n\n") ?? "Hidden reasoning summary."} />
                  </ItemCard>
                );
              }
            }
          ],
          output: {
            schema: z.looseObject({
              type: z.literal("message"),
              role: z.literal("assistant"),
              content: z.array(z.object({
                type: z.literal("output_text"),
                text: z.string(),
              })),
            }),
            displayComponent: ({ item }) => <AssistantMessage>{item.content.map((c: any) => c?.text ?? "").join("\n\n")}</AssistantMessage>
          }
        }
      ],
      inputComponent: ({ session, token, submit, cancel, isRunning }) => <UserMessageInput
        onSubmit={(val) => {
          submit("http://localhost:3000/simple_chat", 
            { 
              input: { content: val, type: "message", role: "user" },
              id: session.id,
              token,
            })
        }}
        onCancel={cancel}
        isRunning={isRunning}
      />
    }
  ]
});