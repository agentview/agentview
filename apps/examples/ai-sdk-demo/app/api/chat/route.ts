import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  tool,
  UIMessage,
} from "ai";
import { z } from "zod";

const weatherTool = tool({
  description: "Get weather information for a location using wttr.in",
  inputSchema: z.object({
    location: z.string().describe("The city name to get weather for"),
  }),
  execute: async ({ location }) => {
    const response = await fetch(
      `https://wttr.in/${encodeURIComponent(location)}?format=j2`
    );
    if (!response.ok) {
      return { error: "Failed to fetch weather data" };
    }
    const data = await response.json();
    const current = data.current_condition?.[0];
    return {
      location,
      temperature_c: current?.temp_C,
      temperature_f: current?.temp_F,
      description: current?.weatherDesc?.[0]?.value,
      humidity: current?.humidity,
      wind_speed_kmph: current?.windspeedKmph,
    };
  },
});

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  console.log('messages: ', messages);

  const result = streamText({
    model: openai("gpt-5-mini"),
    system:
      "You are a helpful assistant with access to a weather tool. When the user asks about weather, use the tool to get real data. Be concise.",
    messages: await convertToModelMessages(messages),
    tools: { weather: weatherTool },
    stopWhen: stepCountIs(5),
    onChunk({ chunk }) {
      if (chunk.type === "text-delta") {
        process.stdout.write(chunk.text);
      } else if (chunk.type === "tool-call") {
        console.log(
          `\n[tool-call] ${chunk.toolName}(${JSON.stringify(chunk.input)})`
        );
      } else if (chunk.type === "tool-result") {
        console.log(
          `[tool-result] ${chunk.toolName}: ${JSON.stringify(chunk.output)}`
        );
      } else if (chunk.type === "reasoning-delta") {
        process.stdout.write(`[reasoning] ${chunk.text}`);
      }
    },
    onStepFinish({ finishReason, text, toolCalls, usage }) {
      console.log(
        `\n[step-finish] reason=${finishReason} tools=${toolCalls.length} text=${text.slice(0, 100)}`
      );
    },
    onFinish({ text, steps, usage }) {
      console.log(
        `[finish] steps=${steps.length} tokens=${JSON.stringify(usage)}`
      );
    },
  });

  return result.toUIMessageStreamResponse();
}
