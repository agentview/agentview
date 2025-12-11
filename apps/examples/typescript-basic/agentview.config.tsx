import { z } from "zod";
import { defineConfig } from "agentview";
import { UserMessage, AssistantMessage, UserMessageInput, BaseItem } from "@agentview/studio/components/session-item";

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
            displayComponent: ({ item }) => <UserMessage value={item} />,
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
              displayComponent: ({ item }) => <BaseItem title="Thinking" value={item.summary[0]?.text ?? "Hidden reasoning summary."} variant="muted" />,
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
            displayComponent: ({ item }) => <AssistantMessage value={item[0]?.text} />
          }
        }
      ],
      inputComponent: ({ submit, cancel, isRunning }) => <UserMessageInput
        onSubmit={(val) => submit("http://localhost:3000/simple_chat", { input: { content: val, type: "message", role: "user" } })}
        onCancel={cancel}
        isRunning={isRunning}
      />
    }
  ]
});