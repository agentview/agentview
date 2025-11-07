import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { parseBody } from "agentview";
import { OpenAI } from 'openai';

const app = new Hono();

app.post('/agentview/run', async (c) => {
  const { items, input } = parseBody(await c.req.json());

  const client = new OpenAI()
  const response = await client.responses.create({
    model: "gpt-5-nano",
    input: [...items, input]
  });

  return c.json({ 
    manifest: { 
      version: "0.0.1" 
    },
    items: response.output
  })
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Agent API server is running on http://localhost:${info.port}`)
})
