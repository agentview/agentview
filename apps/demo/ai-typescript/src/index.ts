import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { tool, Agent, run } from '@openai/agents';
import { z } from 'zod';
import { OpenAI } from 'openai';
import { parseBody } from "agentview";

const app = new Hono();

const manifest = {
  version: "0.0.1",
  env: "dev"
}

app.post('/agentview/chat', async (c) => {
  const { sessionId, input, token } = await c.req.json();

  const history = sessionId ? await fetchSession(sessionId, token).history : [];

  const client = new OpenAI()
  const response = await client.responses.create({
    model: "gpt-5-nano",
    input: [...history, input]
  });

  await pushItems({ output: response.output })

  return c.json({ 
    manifest,
    items: response.output
  })
})






app.post('/agentview/simple_chat/run', async (c) => {
  const { items, input } = parseBody(await c.req.json());

  const client = new OpenAI()
  const response = await client.responses.create({
    model: "gpt-5-nano",
    input: [...items, input]
  });

  return c.json({ 
    manifest,
    items: response.output
  })
})

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


app.onError((error, c) => {
  if (error instanceof Error) {
    return c.json({ message: error.message }, (error as any).status ?? 500);
  }

  return c.json({ message: 'Internal server error' }, 500);
});

app.get('/', (c) => {
  return c.text('Hello Hono!')
})


serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Agent App server is running on localhost:${info.port}`)
})
