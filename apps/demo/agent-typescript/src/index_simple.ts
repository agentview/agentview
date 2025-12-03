import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { AgentView, AgentViewError } from "agentview";
import { OpenAI } from 'openai';
import { cors } from 'hono/cors';

const app = new Hono();
const client = new OpenAI()
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

app.post('/simple_chat', async (c) => {
  const { id, token, input } = await c.req.json();

  const endUser = token ? 
    await av.getEndUser({ token }) : 
    await av.createEndUser();

  const session = id ?
    await av.as(endUser).getSession({ id }) : 
    await av.as(endUser).createSession({ agent: "simple_chat" });

  const run = await av.createRun({ 
    sessionId: session.id, 
    items: [input], 
    version: "0.0.1"
  });

  let response : Awaited<ReturnType<typeof client.responses.create>>;

  try {
    response = await client.responses.create({
      model: "gpt-5-nano",
      reasoning: {
        effort: "low",
        summary: "detailed"
      },
      input: [...session.history, input]
    });

  } catch (error) {
    console.error(error)
    await av.updateRun({
      id: run.id,
      status: "failed",
      failReason: {
        message: (error as Error).message,
      }
    });

    throw error;
  }

  await av.updateRun({
    id: run.id,
    status: "completed",
    items: response.output
  });


  return c.json({
    id: session.id,
    output: response.output,
    token: endUser.token,
  })
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Agent API server is running on http://localhost:${info.port}`)
})
