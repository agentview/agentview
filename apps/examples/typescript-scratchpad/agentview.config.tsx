import { z } from "zod";
import { defineConfig } from "agentview";
import { AssistantMessage, ItemCard, ItemCardMarkdown, ItemCardTitle, UserMessage, UserMessageInput } from "@agentview/studio/components/session-item";
import { Book, Brain, ExternalLink, Link, ThumbsDown, ThumbsUp } from "lucide-react";
import { WeatherItem } from './src/WeatherItem';

import { PillSelect } from "@agentview/studio/components/PillSelect";
import { ToggleGroupControl } from "@agentview/studio/components/ToggleGroup";
import { OptionDisplay } from "@agentview/studio/components/OptionDisplay";
import { Colors } from "agentview/colors";

const likeOptions = [{ value: true, icon: <ThumbsUp />, label: "Like" }, { value: false, icon: <ThumbsDown />, label: "Don't Like" }]
const selectOptions = [
  { value: "one", label: "Five", icon: <ThumbsDown />, color: Colors.red },
  { value: "two", label: "Two", icon: <Book />, color: Colors.blue },
  { value: "three", label: "Four", icon: <ThumbsUp />, color: Colors.green },
  { value: "four", label: "One", icon: <Link />, color: Colors.purple },
  { value: "five", label: "Three", icon: <ExternalLink />, color: Colors.yellow },
]


export default defineConfig({
  apiBaseUrl: "http://localhost:1990",
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
              {
                name: "like",
                title: "Like / Dislike",
                schema: z.boolean(),
                inputComponent: (props) => <ToggleGroupControl {...props} options={likeOptions} hideOptionsOnSelect showLabels="on-select" />,
                displayComponent: (props) => <OptionDisplay {...props} options={likeOptions} />,
                actionBarComponent: (props) => <ToggleGroupControl {...props} options={likeOptions} hideOptionsOnSelect showLabels="on-select" />
              },
              {
                name: "test",
                title: "Test",
                schema: z.string(),
                inputComponent: (props) => <PillSelect {...props} options={selectOptions} />,
                displayComponent: (props) => <OptionDisplay {...props} options={selectOptions} />,
              }
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