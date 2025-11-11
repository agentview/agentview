# Getting Started

This guide will walk through setting up your first agent with AgentView. Along the way, you'll learn more about the concepts that are fundamental to using the SDK in your own projects.

Start by creating AgentView project:

```bash
npm create agentview@latest my-agentview-project
```

This will install example project in `my-agentview-project/` dir. Go to the project:

```
cd my-agentview-project
```

The root directory of the project has a following structure:
1. `studio/` - React app with data viewer
2. `agent-app-python/` - demo Agent App written in Python + FastAPI
3. `agent-app-ts/` - demo of Agent App written in TS + Hono
4. `docker-compose.yml` - since there's no cloud yet, you'll need to set up AgentView Server via docker-compose.

Depending on preference how you want to write AI code you can use either `agent-app-python/` or `agent-app-ts`. You'll need `studio/` in both cases.


### Set up AgentView Server

AgentView cloud service is work-in-progress so for now you gotta install it via docker compose. Just run:

```bash
docker compose up -d
```

To test whether server is running you can run:

```bash
curl http://localhost:1990/api/status
```

If you get a response with `{ "status": "ok", ... }` it means it's all good.

AgentView exposes Client API, with which users will communicate in the real world.

### Agent App

In AgentView you provide AI logic as a stateless HTTP endpoint called "Agent App". This gives you a full freedom over how you want to write AI and doesn't lock you in with any specific framework.

The example Agent App in TS is in `agent-app-ts`. Let's run it:

```
cd agent-app-ts
npm install
npm run dev
```

Your Agent App server should be running at `localhost:3000`.

Let's take a look at `src/index.ts`:

```typescript
import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { parseBody } from "agentview";
import { OpenAI } from 'openai';

const app = new Hono();

app.post('/agentview/my_super_agent/run', async (c) => {
  const { history, input } = parseBody(await c.req.json());

  const client = new OpenAI()
  const response = await client.responses.create({
    model: "gpt-5-nano",
    input: [...history, input]
  });

  return c.json({ 
    manifest: { 
      version: "0.0.1" 
    },
    output: response.output // output items array
  })
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Agent API server is running on http://localhost:${info.port}`)
})
```

As you can see we defined a single `POST /agentview/my_super_agent/run` HTTP endpoint. Any time user sends a message to the AgentView Server via Client API, under the hood the server will make a call to your endpoint to generate a response.

The `/{agent}/run` endpoint is **stateless**. It means that it doesn't have to care about storage, session management etc. Everything is handled by AgentView Server, which makes sure the endpoint gets everything it needs to generate a response:
- full conversation history
- user memory
- session metadata
- new input item

The `history` input and `output` is just an array of items. `input` is a single item too.

Items are arbitrary objects, they represents something happened in an agent (input message, tool call, tool result, handoff, reasoning, output etc). AgentView doesn't enforce any predefined structure over your items, so that you keep maxium flexibility.

*You can find full specification of `Agent API` here.*


### Install Studio

Before we continue, let's install and run the studio:

```bash
cd studio
npm install
npm run dev
```

Now go to the `localhost:1989` URL. You should see registration screen:

[registration screen]

The first user registered is gonna be the admin. You can invite more users via Settings.


### Configuration

The most important file in the AgentView ecosystem is `agentview.config.tsx`. It lives in your Studio project (`studio/agentview.config.tsx`), but any time you open the studio, it automatically sends it to the AgentView Server.

Let's take a look at it:

```typescript
export default defineConfig({
    server: "http://localhost:1990",
    agentApp: "http://localhost:3000/agentview",
    agents: [
        {
            name: "my_super_agent",
            run: {
                input: {
                    schema: {
                        type: "message",
                        role: "user",
                        content: z.string(),
                    }
                    displayComponent: UserMessage,
                    inputComponent: UserMessageInput
                },
                output: {
                    schema: {
                        type: "message",
                        role: "assistant",
                        content: z.string(),
                    }
                    displayComponent: AssistantMessage,
                }
            }
        }
    ]
})
```

`server` is a location of AgentView Server and `agentApp` is a base URL of your stateless Agent App.

In the properties we defined a single agent called `my_super_agent`. It has one run (*multiple runs* are supported).

Run is basically a single **turn** of an agent interaction. Run is always initiated by an input item done by user, usually an input message. It's ended with an output item (usually assistant message).

Let's try to initiate a new conversation via Client API. We must first create auth token:

```bash
curl -X POST https://localhost:1990/api/auth \
  -H "Content-Type: application/json" \
  -d '{}'
```

Result:

```json
{
  "token": "YOUR_TOKEN_HERE",
  "expiresAt": "...",
  "clientId": "..."
}
```

And now let's start a run.

```bash
curl -X POST https://localhost:1990/api/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "agent": "my_super_agent",
    "input": {
      "type": "message",
      "role": "user",
      "content": "Hello, my name is Bob. How are you?"
    }
  }'
```

You should get a response:

```json
{
  
}
```

Here's what AgentView did under the hood:
- validated whether the input for agent is correct (used Zod schemas you provided)
- created a session
- initiated the run
- called your Agent App to produce a response (`history` was empty)
- saved responses in DB
- returned response

Let's make a second turn to prove it:

```bash
curl -X POST https://localhost:1990/api/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "agent": "my_super_agent",
    "session": "SESSION_ID",
    "input": {
      "type": "message",
      "role": "user",
      "content": "Hello again, I have poor memory and forgot my name :( What is it?"
    }
  }'
```

Response:
```json

```

As you can see AgentView took care of persistence and session, under the hood your Agent App got proper `history`.

You can call `GET /sessions/YOUR_SESSION_ID` to fetch the full session history.

*You can find Client API docs here.*


## Studio

We all love `curl`, but it's not the most user-friendly way to test an agent. That's why we have the Studio.

Let's open `http://localhost:1989` in the browser: (todo: should redirect to single agent production sessions -> list should redirect to the last displayed session)

// screenshot

You can see studio automatically redirects you to the Production sessions of our only agent `my_super_agent`.


### Display Components

Let's for a moment comment out the components.

```typescript
export default defineConfig({
    server: "http://localhost:1990",
    agentApp: "http://localhost:3000/agentview",
    agents: [
        {
            name: "my_super_agent",
            run: {
                input: {
                    schema: {
                        type: "message",
                        role: "user",
                        content: z.string(),
                    }
                    // displayComponent: UserMessage,
                    // inputComponent: UserMessageInput
                },
                output: {
                    schema: {
                        type: "message",
                        role: "assistant",
                        content: z.string(),
                    }
                    // displayComponent: AssistantMessage,
                }
            }
        }
    ]
})
```

And see the studio again:

[screenshot]

You'll see the items are shown as their JSON data. AgentView assumes you should be able to customise any part of the UI in a domain-specific way. That's the only way to make domain-experts and business stakeholders willing to cooperate.

We provide a bunch of off-the-shelf components so that you don't need to build everything from scratch. Check out our *design system*. 

### Input Components

You can easily create Test Sessions in AgentView Studio. When you click on "Create Session" button, a new test session is created. The "Enter your message" component is also customisable, in this case it's `UserMessageInput`. 

### Collaboration

One of the key features of AgentView is collaboration. It should be easy to discuss Agent outputs, mention stakeholders, domain experts etc. You get powerful collaboration features out of the box:

[video]

## Expand the agent with tools

So far `my_super_agent` was very simple. Let's create a more advanced  example. We're gonna build a weather agent, that is capable of calling `weather_tool` for checking weather in given location.

To show the flexibility of AgnetView, let's use AgentSDK instead of pure Responses API for a change:

```typescript
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

app.post('/agentview/weather_agent/run', async (c) => {
  const { history, input } = parseBody(await c.req.json());

  const result = await run(weatherAgent, [...history, input]);

  return c.json({
    manifest,
    items: result.output
  })
})
```

And let's configure it in `agentview.config.tsx`:

```typescript
export default defineConfig({
  apiBaseUrl: "http://localhost:8080",
  agents: [
    // ...
    {
      name: "weather_chat",
      url: "http://127.0.0.1:3000/agentview/weather_chat/run",
      run: {
        input: {
          schema: {
            type: "message",
            role: "user",
            content: z.string(),
          },
          displayComponent: ({ value }) => <UserMessage value={value.content} />,
          inputComponent: (props) => <UserMessageInput {...props} submit={(val) => props.submit({ content: val, type: "message", role: "user" })} />
        },
        steps: [
          {
            schema: {
              type: "reasoning",
            },
            displayComponent: ({ value }) => <BaseItem title="Thinking" value={value.content[0]?.text} variant="muted" />,
          },
          {
            schema: {
              type: "function_call",
              name: "weather_tool",
              callId: z.string().meta({ callId: true })
            },
            displayComponent: ({ value }) => <BaseItem title="Weather Tool" value={"Checking weather in: " + JSON.parse(value.arguments).location + "..."} variant="muted" />,
            callResult: {
              schema: {
                type: "function_call_result",
                callId: z.string().meta({ callId: true })
              },
              displayComponent: ({ value }) => <WeatherComponent value={value} />
            }
          },
        ],
        output: {
          schema: {
            role: "assistant",
            type: "message",
            content: z.any(),
          },
          displayComponent: ({ value }) => <AssistantMessage value={value.content[0]?.text} />,
        }
      }
    }
})
```

As you can see we added `steps` property in our agent definition. `steps` are all the items that go in a run after `input` and before. Most commonly it's reasoning or tool calls, but it could be handoffs in multi-agent system or actually any custom object that we need to store or display.

As you can see we use `callResult` [to finish]

## Custom Scores

You might have noticed that each message can have Like / Don't Like button. This is a built in score added to every output object. Collecting feedback from users is very important and giving feedback should be as easy as possible to urge domain experts / business stakeholders to leave it.

[ quick score example with multi-select! ]

## Next steps

Learn more about foundation, start with Architecture Overview.

