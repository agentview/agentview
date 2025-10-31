import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import OpenAI from "openai";
import { type RunBody } from "agentview";

const app = new Hono()
const client = new OpenAI();

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.post('/agentview/run', async (c) => {
  const body = await c.req.json() as RunBody

  const items = body.session.runs.flatMap(run => run.items);

  const response = await client.responses.create({
    model: "gpt-5-nano",
    input: "Write a one-sentence bedtime story about a unicorn."
  });

  return c.json({ 
    manifest: {
      version: "0.0.1",
      env: "dev"
    },
    items: [
      {
        type: "message",
        role: "assistant",
        content: response.output_text
      }
    ]
  })
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
