import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { AgentView, AgentViewError } from "agentview";
import { cors } from 'hono/cors';
import { Experimental_Agent as Agent, tool, convertToModelMessages } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

const weatherAgent = new Agent({
  model: openai('gpt-5-nano'),
  instructions: 'You are a helpful assistant with tools to get the weather and convert temperatures.',
  tools: {
    weather: tool({
      description: 'Get the weather in a location (in Fahrenheit)',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
    convertFahrenheitToCelsius: tool({
      description: 'Convert temperature from Fahrenheit to Celsius',
      inputSchema: z.object({
        temperature: z.number().describe('Temperature in Fahrenheit'),
      }),
      execute: async ({ temperature }) => {
        const celsius = Math.round((temperature - 32) * (5 / 9));
        return { celsius };
      },
    }),
  }
});

const app = new Hono();
const av = new AgentView({
  apiUrl: 'http://localhost:1990',
  apiKey: process.env.AGENTVIEW_API_KEY!
})

app.use('*', cors({
  origin: ['http://localhost:1989'],
  credentials: true,
}))

// beautiful error handling
app.onError((error, c) => {
  if (error instanceof AgentViewError) {
    console.log('error', error)
    return c.json({ ...error.details, message: error.message }, error.statusCode as any);
  }
  throw error;
});

app.post('/chat/simple', async (c) => {
  const { id, token, input } = await c.req.json();

  // const endUser = token ?
  //   await av.getEndUser({ token }) :
  //   await av.createEndUser();

  // const session = id ?
  //   await av.as(endUser).getSession({ id }) :
  //   await av.as(endUser).createSession({ agent: "simple_chat" });

  const session = id ? 
    await av.getSession({ id }) :
    await av.createSession({ agent: "simple_chat" });

  const run = await av.createRun({
    sessionId: session.id,
    items: [input],
    version: "0.0.1"
  });

  const history = session.runs.map(run => [
    run.items[0],
    {
      role: 'assistant',
      parts: run.items.slice(1)
    }
  ]).flat();

  console.log('history', history);

  let result = await weatherAgent.stream({
    messages: convertToModelMessages([...history, input]),
    abortSignal: c.req.raw.signal,
  });

  return result.toUIMessageStreamResponse({
    onFinish: async ({ messages, isAborted }) => {
      await av.updateRun({
        id: run.id,
        status: "completed",
        items: messages[0].parts,
      });
    },
    onError(error) {
      const message = (error as Error).message || 'Unknown error';

      av.updateRun({
        id: run.id,
        status: "failed",
        failReason: { message },
      });

      return message;
    }
  });

})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Agent API server is running on http://localhost:${info.port}`)
})
