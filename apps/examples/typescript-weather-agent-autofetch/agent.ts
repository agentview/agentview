import { serve } from '@hono/node-server';
import { Runner } from "@openai/agents";
import type { RunBody } from "agentview/apiTypes";
import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { weatherAgent } from './src/weatherAgent';

const app = new Hono();

app.use('*', cors({
  origin: ['http://localhost:1989', 'http://127.0.0.1:1989'],
  credentials: true,
}))

app.post('/weather-chat', async (c) => {
  const { session } = await c.req.json() as RunBody;

  // All items across all runs (the full conversation history)
  const allItems = session.runs.flatMap(run => run.sessionItems.map(si => si.content));

  // The last item is the new user input
  const lastInput = allItems[allItems.length - 1];

  const runner = new Runner();
  const result = await runner.run(
    weatherAgent({ userLocation: session.metadata?.userLocation }),
    allItems,
    {
      stream: true,
    }
  );

  c.header('X-AgentView-Version', '0.0.1');
  c.header('Content-Type', 'text/event-stream');

  return streamSSE(
    c,
    async (stream) => {
      for await (const event of result) {
        if (event.type === 'run_item_stream_event') {
          const item = event.item.rawItem;

          console.log('item: ', item);

          await stream.writeSSE({
            data: JSON.stringify({ items: [item] }),
            event: 'run.patch',
          });
        }
      }

      const inputTokens = result.rawResponses.reduce((acc, rawResponse) => acc + rawResponse.usage?.inputTokens, 0);
      const outputTokens = result.rawResponses.reduce((acc, rawResponse) => acc + rawResponse.usage?.outputTokens, 0);

      // Get the final output item (last message from the agent)
      const finalOutput = result.finalOutput;

      console.log('complete: ', finalOutput);
      await stream.writeSSE({
        data: JSON.stringify({
          items: finalOutput ? [finalOutput] : [],
          status: "completed",
          metadata: {
            usage: {
              inputTokens,
              outputTokens
            }
          }
        }),
        event: 'run.patch',
      });
    },
    async (error, stream) => {
      console.error('error: ', error);
      await stream.writeSSE({
        data: JSON.stringify({
          type: 'error',
          message: 'Error occured',
        }),
        event: 'error',
      });
      stream.close();
    }
  );
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Agent API server is running on http://localhost:${info.port}`)
})
