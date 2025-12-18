import { z } from "zod";
import { defineConfig } from "agentview";
import { AssistantMessage, ItemCard, ItemCardMarkdown, ItemCardTitle, UserMessage, UserMessageInput, select, multiSelect, Colors } from "@agentview/studio";
import { Brain, CircleDollarSign, DollarSign } from "lucide-react";
import { WeatherItem } from './src/WeatherItem';
import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@agentview/studio/components/ui/select";
import { Button } from "@agentview/studio/components/ui/button";

export default defineConfig({
  apiBaseUrl: "http://localhost:1990",
  agents: [
    {
      name: "weather-chat",
      metadata: {
        userLocation: z.string()
      },
      newSessionComponent: ({ submit, isRunning }) => {
        const [selectedCity, setSelectedCity] = React.useState<string>("");

        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          if (selectedCity) {
            submit({ metadata: { userLocation: selectedCity } });
          }
        };

        const cities = [
          "New York",
          "London",
          "Tokyo",
          "Paris",
          "Warsaw"
        ];

        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger>
                <SelectValue placeholder="Select a city" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="submit"
              disabled={!selectedCity || isRunning}
            >
              {isRunning ? "Creating session..." : "Create Session"}
            </Button>
          </form>
        );
      },
      displayProperties: [
        {
          title: "User Location",
          value: ({ session }) => session?.metadata?.userLocation
        }
      ],
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
                name: "forecast_accuracy",
                title: "Forecast Accuracy",
                options: [
                  {
                    value: "accurate",
                    label: "Accurate",
                    color: Colors.green
                  },
                  {
                    value: "partially_accurate",
                    label: "Partially Accurate",
                    color: Colors.yellow
                  },
                  {
                    value: "inaccurate",
                    label: "Inaccurate",
                    color: Colors.red
                  },
                ]
              }),
              multiSelect({
                name: "style",
                title: "Style",
                options: [
                  {
                    value: "too-long",
                    label: "Too long"
                  },
                  {
                    value: "too-brief",
                    label: "Too brief"
                  },
                  {
                    value: "confusing",
                    label: "Confusing"
                  },
                  {
                    value: "overly-technical",
                    label: "Overly technical"
                  }
                ]
              })
            ]
          },
          displayProperties: [
            {
              title: "Input tokens",
              value: ({ run }) => <div className="flex items-center gap-0.5">{run?.metadata?.usage?.inputTokens}</div>
            },
            {
              title: "Output tokens",
              value: ({ run }) => <div className="flex items-center gap-0.5">{run?.metadata?.usage?.outputTokens}</div>
            }
          ]
        }
      ],
      inputComponent: ({ submit, cancel, isRunning, session, token }) => <UserMessageInput
        onSubmit={(val) => {
          submit("http://localhost:3000/weather-chat", {
            id: session.id,
            token,
            input: {
              type: "message",
              role: "user",
              content: val,
            }
          })
        }}
        onCancel={cancel}
        isRunning={isRunning}
      />
    }
  ]
});