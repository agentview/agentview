import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { tool, Agent, run } from '@openai/agents';
import { z } from 'zod';
import { parseBody } from "agentview";

const app = new Hono();

app.onError((error, c) => {
  if (error instanceof Error) {
    return c.json({ message: error.message }, (error as any).status ?? 500);
  }

  return c.json({ message: 'Internal server error' }, 500);
});

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

const manifest = {
  version: "0.0.1",
  env: "dev"
}

const weatherAgent = new Agent({
  name: 'Weather Assistant',
  model: 'gpt-5-mini',
  modelSettings: {
    reasoning: { effort: 'medium', summary: 'auto' }
  },
  instructions: 'You are a helpful general-purposeassistant. You have super skill of checking the weather for any location.',
  tools: [
    tool({
      name: 'weather_tool',
      description: 'Get weather information for a location using wttr.in',
      parameters: z.object({
        location: z.string().describe('The city name to get weather for'),
      }),
      execute: async ({ location }) => {
        const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j2`);
        if (!response.ok) {
          return { error: 'Failed to fetch weather data' };
        }
        return await response.json();
      },
    })
  ],
});

app.post('/agentview/run', async (c) => {
  const { items, input } = parseBody(await c.req.json());

  const result = await run(weatherAgent, [...items, input]);

  return c.json({
    manifest,
    items: result.output
  })
})


serve({
  fetch: app.fetch,
  port: 3000
})
