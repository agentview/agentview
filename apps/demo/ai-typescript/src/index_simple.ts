import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { AgentView, AgentViewError } from "agentview";
import { OpenAI } from 'openai';

const app = new Hono();
const client = new OpenAI()
const agentView = new AgentView({
  apiUrl: 'http://localhost:8080',
  apiKey: process.env.AGENTVIEW_API_KEY!
})

app.post('/chat', async (c) => {
  const body = await c.req.json();

  console.log('hellow', body);

  const endUserToken = body.endUserToken ?? (await agentView.createEndUser()).token;

  console.log('endUserToken', endUserToken);

  const session = body.sessionId ? await agentView.getSession({ id: body.sessionId, endUserToken }) : await agentView.createSession({ agent: "simple_chat", endUserToken });

  console.log('session', session);

  console.log('input', [...session.history, body.input]);
  
  const run = await agentView.createRun({ 
    sessionId: session.id, 
    items: [body.input], 
    version: "0.0.1", 
    endUserToken
  });


  const response = await client.responses.create({
    model: "gpt-5-nano",
    input: [...session.history, body.input]
  });

  await agentView.updateRun({
    id: run.id,
    items: response.output,
    status: "completed"
  });

  return c.json({
    ok: true
  })
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
