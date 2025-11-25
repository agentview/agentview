import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { AgentView, AgentViewError } from "agentview";
import { OpenAI } from 'openai';

const app = new Hono();
const client = new OpenAI()
const av = new AgentView({
  apiUrl: 'http://localhost:8080',
  apiKey: process.env.AGENTVIEW_API_KEY!
})

app.post('/chat', async (c) => {
  const { id, token, input } = await c.req.json();

  const endUserToken = token ?? (await av.createEndUser()).token;

  const session = id ? 
    await av.getSession({ id, endUserToken }) : 
    await av.createSession({ agent: "simple_chat", endUserToken });

  const run = await av.createRun({ 
    sessionId: session.id, 
    items: [input], 
    version: "0.0.1", 
    endUserToken
  });

  try {
    const response = await client.responses.create({
      model: "gpt-5-nano",
      reasoning: {
        effort: "low",
        summary: "detailed"
      },
      input: [...session.history, input]
    });

    await av.updateRun({
      id: run.id,
      items: response.output,
      status: "completed"
    });

    return c.json({
      token: endUserToken,
      sessionId: session.id,
      output: response.output
    })

  } catch (error) {
    await av.updateRun({
      id: run.id,
      status: "failed",
      failReason: {
        message: (error as Error).message,
      }
    });

    throw error;
  }
})

app.onError((error, c) => {
  if (error instanceof AgentViewError) {
    return c.json({ ...error.details, message: error.message }, error.statusCode as any);
  }

  throw error;
});

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Agent API server is running on http://localhost:${info.port}`)
})
