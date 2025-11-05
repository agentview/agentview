# AgentView Documentation


## ToC

1. Overview (AI SDK like)
    - Why use AgentView?
    - Features
    - Some basic concepts.

2. Getting Started
    - Set up the project
    - Explore features

3. Docs
    - Data model (sessions, runs, items, state, metadata)
    - Playground sessions
    - `agentview.config.ts` 
    - Schema validation
    - Custom Components
    - Versioning (Manifest)
    - Custom Pages
    - Metadata
    - Clients
    - Memory
    - Client API
    - Observability tools
    - Deployment




Welcome to the AgentView documentation!

## What is AgentView?

## (scratchpad)

AgentView is open-source scaffolding for building conversational agents.

It's for AI Engineers who want to build agents **with code**. It provides "everything-around-the-agent" like powerful data viewer, session storage, version management, etc... but lets developers write AI part however they want. They can do it in any programming language and in any framework they want.

### How it works?

Developer provides a STATELESS endpoint, which takes care of intelligence. It's stateless because it doesn't handle any storage. It takes conversation history, conversation state, user memory -> and its task is to generate and send back response + new memories. Since its HTTP endpoint it can be built with Python (FastAPI), Typescript (Hono, Vercel functions, whatever)... So essentially AgentView is NOT an agent framework - by design. It's completely as agnostic as it could be.

AgentView Server communicates with your stateless endpoint and provides following things:
- Conversation storage
- Clean, standardized stateful APIs for integration
- Session management, re‑connects dropped clients, and lets you resume long‑running chats.
- (soon) Integrations with input channels (email, Slack, Whatsapp, voice, etc...), and output channels for handoffs (Zendesk, etc.)

So essentially it wraps your stateless endpoint and wraps all the boring stuff you probably don't want to handle.

And now, let's switch to AgentView studio. AgentView Studio is an open-source data viewer of the session stored by AgentView server. IT's tasks:
- View and debug conversations
- Comment collaboratively on agent outputs (Google Docs-style)
- Score outputs with teammates or domain experts
- Manage users, permissions, and teams
- (soon) Edit prompts and knowledge bases easily
- Track agent versions
- Test in "dev mode" without writing code

AgentView Studio is not a cloud web app. It's a React package, where you provide your configuration with code. It makes it trivial to provide custom components for Session Views, custom messages, custom input forms, custom pages, whatever you need. However, it enforces certain design system to keep the Notion-like collaboration features working out-of-the-box.

To some extent it's similar to observability tools (viewing data, scoring and commenting outputs), but it's actually pretty different. AgentView should mostly focus on displaying information that you have to store + the information that end users would see. It's focused on beautiful presentation of data, so that non-technical people love using the tool. Observability tools are developer-first, have every possible detail, and it's great, but it's for devs. AgentView works in tandem with observability tools, you can easily link to traces from the runs displayed AgentView Studio. 

[CHART]

### Some philosophy 

I was hired to build a conversational agents recently for a bunch of companies (mostly shopping assistants). There are obviously bazzilion SaaS customer bot products that try to sell "AI Agent", but my feeling was that those are way too general-purpose. If you really dig into business needs of the client, you can quite easily build agent that is much better than by using off-the-shelf methods. So I wasn't interested in those Saas, I just wanted to build my agents with code.

But I quickly realised that building AI is only tiny part. Building great data viewer, storage, clean API can take even more time than teh agent itself and I thought it doesn't make much sense. 

Why Data Viewer with collaboration? The industry talks a lot about frameworks, workflow tools etc, but not many people talk about the fact that the most important part of the process is not "how you build an agent". It's "how you look at the data and distill it into improvements". If you build an agent for skicnare company, you probably are not a skincare expert and surely not the brands' expert. That's why engaging with stakeholders and domain experts from the company you build an agent for is CRUCIAL and we need great tools for that.

I really wanted to have this Notion-like simplicity where people can easily discuss, and leave scores. 
I wanted to build a tool where every journey, even the most custom one, can be easily tested in Studio playground.
The scores, messages, flows might be different, so that's why you can provide a custom React component for every part of the system.


## GETTING STARTED

Let's build a simple agent with AgnetView.

```
npm create agentview@latest my-agentview-project
```

This will install example project in `my-agentview-project/` dir. Go to the dir and install 

```
cd my-agentview-project
```

The project has a following structure:
```
studio/
ai-python/
ai-typescript/
docker-compose.yml
```

Let's break it down:
1. `studio/` - React app with data viewer
2. `ai-python/` - demo of AI endpoint written in python, simple FastAPI app.
3. `ai-typescript/` - demo of AI endpoint in TS, with Hono.
4. `docker-compose.yml` - since there's no cloud yet, you'll need to set up AgentView Server via docker-compose.

Depending on preference how you want to write AI code you can use either `ai-python/` or `ai-typescript`. You'll need `studio/` in both cases.


### Set up AgentView Server

AgentView cloud service is work-in-progress so for now you gotta install it via docker compose. Just run:

```
docker compose up -d
```

To test whether server is running you can run:

```
curl localhost:8080/api/status

// expected response: `{ "is_active": false }`
```

### AgentView Studio

Install and run the studio:

```bash
cd studio
npm install
npm run dev
```

Now go to the `localhost:1989` URL. You should see registration screen:

[registration screen]

The first user registered is gonna be the admin.

Let's quickly look at the most important config file in the AgentView: `studio/agentview.config.tsx`:

```
export default defineConfig({
    apiBaseUrl: "http://localhost:8080",
    agents: [
        {
            name: "simple_chat",
            url: "http://127.0.0.1:8000/simple_chat",
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

1. `apiBaseUrl` is the AgentView server. It's the only URL that Studio app communicates with. 
1. We set up one agent named `simple_chat`.
2. The `url` points to your Agent API. When generating responses it's the URL that AgentView Server will make request to -> your independent API server with "intelligence" (we'll set it up soon in `ai-python/` or `ai-typescript/`)
3. `input` defines that the agent run is initiated with { type: "message", role: "user", content: ... }, content is string (schema validation), and defines react components for both how User Message will be displayed, and what's the input form for it in the UI. (maybe let's write about schema validation)
4. `output` say that the output of the run is assistant message. 

Click at the "Start session". The component at the bottom of the page is UserMessageInput. Write "Hello", hit enter and let's see what happened.

// focus on stateless endpoint.
// write about data model (what is session, run, item, input, output, steps, state etc) -> link to docs.
// - THIS IS IMPORTANT. ALSO WRITE ABOUT STORAGE. 

// ALSO -> explain data viewer. Explain it's INTERNAL TOOL for playing around and exploring the agent -> not end-user app. That end-user app is connected via API.


// write about custom components -> link to docs.

You'll see 500 error. It means that AgentView server tried to call your AI to generate response but it couldn't, becasue the server is not up. Let's turn it on!


### Agent API (TS)

Open a new tab and go to the `ai-typescript`, install and run:

```
cd ai-typescript
npm install
npm run dev
```

The AI server is running at `localhost:3000`. This is where your AI should be. Let's see the code:

```
// micro hono app
```

This app calls OpenAI API to generate response.

- version
- output item. 

Streaming is possible, you can respond with SSE (defined later in *docs*)

- Let's create a new session and say "Hello", the response is back. 
- You can collaborative playground, anyone in the team can contribute.
- You can comment
- You can continue the discussion. 
- You can share with the team (your teamate will get notification about playground session you shared!)
- You can mention him.
- Like, don't like.
- Sessions are stored. 
- Add a session and refresh the browser. You'll see that session is still live (you can opt-out of this behaviour *docs*)


## Add tools

When the new run is started (new user message was added), there's a lot of stuff that can happen before generating an answer. You might call tools, model might be "thinking", actually you might even pass the control to mutliple subagents, etc etc. The architecture can be complex.

Let's add a classic `weather_tool` to our agent:

```
// weather agent
```

One thing that is interesting to consider: should we even save the tool call in the conversation state? It depends on the use case but it's helpful. If you don't do it, the model won't know how it behaved earlier, it's hard for it to determine that the weather was a result of a tool call. So it might get confused, call the tool again anyway (or keep calling it in next turns).

In this example we want to *store* the tool call so it must be emitted as an item.

Let's go to the viewer and see the result:

[result screen]


The tool is visible but not very nice. The superpower of AgentView is "custom-component-for-everything". Let's modify our `agentview.config.tsx`:

```
// custom component
// add "tool call" (first item) as `showOnlyWhenActive: true`, 
```

Let's see if it works:

[result screen with custom component]

Cool! It works. Please take note that users can leave comments on the items.

This increases the VISIBILTY fot he domain experts / business stakeholders. You can decide what is important to show and what is not, and the parts can have their scores and discussions.

### How to think about it?

Since you own the code, AgentView allows for literally anything you want, even the most complex workflows. The core concept about AgentView is that all it cares is:
- what new items does your agent produce?
- what is the new state of the session?

The items your agent produce are usually two categories:
- what end-user sees (if users sees sth, it should be in agentview for review)
- what you need to store for next turns in the conversation (whatever items you produce, if you need them in the next agent run, you must store them (even if end-user doesn't see them))


## Add scores




























## -- SCRATCHPAD AND BIN -- 


## What is AgentView?

Agentview is the "CMS for agents" aka AMS - Agent Management System. I conined a new term becuase this kind of tool doesn't exist yet.

(what is agentview shortly)

The whole point of agentview is to let developers build conversational agent **with code** and IN ANY STACK. Any programming langauge, any framework. 
In AgentView developer provides a stateless endpoint, which can be coded any way he wants. This endpoint takes conversation history, user memory and is supposed to return response and new memories. 

Now AgentView takes this endpoint and provides everything around it:
- session storage
- version management
- clean *stateful* api, capable of reconnecting dropped clients
- powerful super customisable data viewer in React -> where you can modify / exchange any component. The goal is to make it "vibecodable", but also well within proper frames.
- data viewer has collaboration, each agent item can be commented, discussed, use mentions and notifications
- simulation environment where users can test the agent -> private sessions, shared sessions, etc.
- adding scores and custom components is also super, easy which makes labeling way easier than in other tools

The philosophy behind data viewer is that:
- how you build agent is importnat, but even more important is domain experts "looking at data" and labeling them constantly
- if you want non-technical people to look at data, the data must be presented in the most digestable and domain-specific way
- collaboration is crucial for success
- observability tools are cool, but they're way too technical for non-technical users



The philosophy behind architecture:
- there are so many frameworks, the industry is buzzing and it's unclear what approach is the winning one, first phase of frameworks turned out to be flop with way too much abstractions and too little help.
- AgentView takes that into account and represents agent outputs as super raw item types, that can be molded into any flow



















## What is AgentView?

AgentView is an open-source scaffolding that helps AI engineers build conversational agents like support bots, shopping assistants, etc. I call it AMS - Agnet Managemnet System, because it reminds of CMS.  

Core ideas around AgentView:
- It assumes **AI Engineer writes AI with code**. It's not a no-code builder. 
- It's framework- and language-agnostic, it doesn't care how you write an AI part. Developer is supposed to provide **statless endpoint** with AI code that can use any framework or any programming language. So it's not an agent framework.
- it helps with everything around, provides storage, manages sessions, storage, provides extremely customisable and powerful data viewer with collaboration features.


## Philosophy

I believe we're very early and that developers should have full freedom of how they build AI.

Another aspect is looking at data, having agent blended with view layer were multiple stakeholders and domain experts can test, view and annotate data (collaboration!).
Observability tools are not up to the task, as they're very developer-centric and have too much detail.


### Explanation

Imagine you want to build a customer support bot for Acme company. You'll probably start with the following steps:
- build a simple HTTP server that exposes an "AI endpoint", which takes a user message and responds with assistant message.
- your code will be probably in Python or Typescript (others languages are possible too), and maybe (but not necessarily) use some framework like AgentSDK, LangGraph, Mastra, etc.
- to make it right you'll deploy all the AI Engineering techniques: right models, prompting, tools, RAG, etc etc.

I call this part stateless Agent API. It's stateless, becasue it doesn't yet handle storage. It just takes messages history (and potentially info about user, user memory etc), AI does "brr", tokens get burnt, and assistant response is generated.

Even you'll very quickly realise there's a big list of things that you also need to build:
- session storage
- data viewer with testing capabilities
- ... (to finish)


It has 2 parts:
- frontend: ultra-customisable Data Viewer
- backend: middleware that handles session storage, 




# Old Version

Agent View is an open-source UI and middleware layer for building, debugging, and managing your own conversational agents. Framework-agnostic and fully customizable.

### You own the AI part

Agent View stays out of your AI logic. You provide the stateless endpoint with intelligence that can be built in any framework (LangGraph, CrewAI, Agents SDK, vanilla, etc) or programming language you prefer. Agent View keeps AI Engineers in control of the intelligence layer.

### Agent View handles the rest

Agent View takes your stateless endpoint and builts everything you need around it.

#### UI Studio

- View and debug conversations
- Comment collaboratively on agent outputs (Google Docs-style)
- Score outputs with teammates or domain experts
- Manage users, permissions, and teams
- Edit prompts and knowledge bases easily
- Track agent versions
- Test in "dev mode" without writing code

UI Studio is built with React and provides almost framework-level customisability. Every conversation item can have its custom view, you can add new screens, and override anything.

#### Storage & Middleware

Agent View provides a server that handles a lot of stuff you probably don't want to worry about:

- Conversation storage
- Clean, standardized **stateful** APIs for integration
- Session management, re‑connects dropped clients, and lets you resume long‑running chats.
- Integrations with channels: email, Slack, Whatsapp, etc. 
- Hand-offs: it must be easy to pass the conversation to human when needed.

## Why?

Let's start what I believe in:

- AI will make conversation the primary interface (again)
- Every business will have a conversational agent. 
- The conversational agents and how they behave will be of a **strategic** importance.

For now, most of the conversational agents are done by SaaS (Fin, Decagon Sierra and 100 others). However, SaaS has a big problem:
- vendor lock-in + black box, you actually don't have control
- they have no "secret sauce", building agents is not **that hard**, it's mostly good prompts, tools + evals. It requires more services and less products.

I'm product engineer turned AI engineer and built conversational agents for a couple of comapnies. I discvered I spent more time on a good scaffolding than on building agent itself. So well... AgentView! :)











# Getting Started

Start by creating new AgentView app:

```bash
npm create agentview@latest my-agentview-app
```

Enter newly made directory:

```
cd my-agentview-app
```

