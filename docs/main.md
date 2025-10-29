# AgentView Documentation

Welcome to the AgentView documentation!

## What is AgentView?

Agentview is the "CMS for agents" aka AMS - Agent Management System. I conined a new term becuase this kind of tool doesn't exist yet.

(what is agentview shortly)

The whole point of agentview is to let developers build conversational agent **with code** and IN ANY STACK. Any programming langauge, any framework. 
In AgentView developer provides a stateless endpoint, which can be coded any way he wants. This endpoint takes conversation history, user memory and is supposed to return response and new memories. 

Now AgentView takes this endpoint and provides everything around it:
- session storage
- version management
- clean *stateful* api, capable of reconnecting dropped clients
- powerful super customisable data viewer in React -> where you can modify / exchange any component. The goal is to make it "vibecodable".
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

