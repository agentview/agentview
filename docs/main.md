# AgentView Documentation

Welcome to the AgentView documentation!

## What is AgentView?

AgentView is an open-source scaffolding that helps AI engineers build conversational agents like support bots, shopping assistants, etc. I call it AMS - Agnet Managemnet System, because it reminds of CMS.  

Core ideas around AgentView:
- It assumes **AI Engineer writes AI with code**. It's not a no-code builder. 
- It's framework- and language-agnostic, it doesn't take how you write an AI part. Developer is supposed to provide **statless endpoint** with AI code that can use any framework or any programming language. So it's not an agent framework.
- it helps with everything around, provides storage, manages sessions, storage, provides extremely customisable and powerful data viewer with collaboration features.


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

