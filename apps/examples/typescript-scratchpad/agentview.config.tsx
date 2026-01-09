import { z } from "zod";
import { Brain } from "lucide-react";

import { defineConfig } from "agentview";
import { AssistantMessage, ItemCard, ItemCardMarkdown, ItemCardTitle, UserMessage, UserMessageInput, select, multiSelect, like } from "@agentview/studio";
import { WeatherItem } from './src/WeatherItem';


export default defineConfig({
  agents: [
    {
      name: "weather-chat",
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
                content: z.array(z.object({
                  type: z.literal("input_text"),
                  text: z.string(),
                })),
              }),
              displayComponent: ({ item }) => {
                return (
                  <ItemCard size="sm" variant="fill">
                    <ItemCardTitle><Brain /> Thinking</ItemCardTitle>
                    <ItemCardMarkdown text={item.content?.map((s: any) => s?.text ?? "").join("\n\n") ?? "Hidden reasoning summary."} />
                  </ItemCard>
                );
              }
            },
            {
              schema: z.looseObject({
                type: z.literal("function_call"),
                name: z.literal("weather_tool"),
                callId: z.string().meta({ callId: true }),
              }),
              callResult: {
                schema: z.looseObject({
                  type: z.literal("function_call_result"),
                  callId: z.string().meta({ callId: true }),
                })
              },
              displayComponent: WeatherItem
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
            displayComponent: ({ item }) => <AssistantMessage>{item.content.map((c: any) => c?.text ?? "").join("\n\n")}</AssistantMessage>,
            scores: [
              select({
                name: "test",
                title: "Test",
                options: ["one", "two", "three", "four", "five"]
              }),
              multiSelect({
                name: "test2",
                title: "Test 2",
                options: ["one", "two", "three", "four", "five"]
              })
            ]
          }
        }
      ],
      inputComponent: ({ submit, cancel, isRunning }) => <UserMessageInput
        onSubmit={(val) => submit("http://localhost:3000/weather-chat", { input: { content: val, type: "message", role: "user" } })}
        onCancel={cancel}
        isRunning={isRunning}
      />
    }
  ]
});