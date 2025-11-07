# Architecture overview

AgentView consists of 2 main parts: Server and Studio.

## Server

The **Server** is an AgentView backend. It stores the sessions data in Postgres db and communicates with the world via 3 APIs:
1. **Client API** - the user-facing API for front-end (chatbot widgets).
2. **Agent API** - the server needs to generate AI response it sends request to the Agent App, which is provided by you. The request payload provides all the necessary information, so that your Agent App doesn't need to store anything and can be 100% stateless.
3. **Admin API** - administration API for all the stuff like managing admin users, collaboration, etc. Used extensively by Studio

The core idea here is that end-users communicate via Client API, server consumes the requests and if necessary makes a request to Agent App via Agent API. So basically it acts as a middleware and wraps your Agent App.

// THIS IS GOOD. Let's explain EVERYTHING REVOLVES ABOUT SERVER IT'S MAIN ORCHESTRATOR. LET'S WRITE THE WHOLE PREMISE -> that server handles a lot of stuff (let's list that stuff, validation, storage, session managemtn (creating sessions, listing, etc), keeping connevtion alive, stateful API, authenticating users, validating versions, in the future integrations with channels) -> and all you do is provide a simple stateless function that takes conversation history + state => produces output. It abstracts away a lot of difficult stuff you don't want to handle.



## Studio 

The **Studio** is a powerful and customisable session viewer. It's shipped as a React package. When you look at our example from *Getting Started* you'll see that Studio is a Vite app run in this way:


```ts
import "./styles.css";
import { renderStudio } from "agentview";
import agentviewConfig from "./agentview.config";

renderStudio(
    document.getElementById("agentview"), 
    agentviewConfig
);
```

Since it's React package is super easy to provide your own custom React components. 

## `agentview.config.tsx`

All the AgentView configuration is in `agentview.config.tsx` file. This file lives in Studio project and must be provided to Studio in `renderStudio(...)`.

The configuration file contains agent definitions: agent name and schemas of items, session metadata, run metadata and scores. It also has React components for data presentation in Studio.

All the agent definition information (mostly schemas) is sent to the AgentView Server. Thanks to this Server can do proper validation and prevent incorrect data getting into your system.


## Data model

The data model of AgentView is very simple and designed to provide maximum flexibility.













# -- old --








The goal of AgentView to let you build AI in any way you want, but not care about all the stitching around: data viewer, persistence, clean APIs, etc.

This chapter explains overall architecture of the AgentView stack.

[chart]

Here are parts you ship:
1. Agent APP - a HTTP server with your AI logic. It should expose a **stateless** endpoint (`POST /your_agent/run`), that takes all the conversation history, user memory, and produce results. It should implement AgentAPI protocol.
2. Front-end - a chatbot widget in your website or app. It communicates with AgentView SERVER via simple Client API.
3. Configuration with `agentview.config.tsx` - a configuration file that lives in a AgentView STUDIO project. In this file you say what agents you have, metadata, schemas, and visual components for presentation layer in a data viewer (Studio). This configuration file is shared between STUDIO and SERVER. 

AgentView parts:
1. SERVER - It's a backend app that stores the session history, provides stateful clean API (Client API), ensures validation, version compatibility etc. 
2. STUDIO - ultra-extendable data viewer shipped as an React app.








## The flow

- Imagine you build a shopping assistant for e-commerce website. 
- You build a front-end widget with chat in any tech you want.
- The chatbot widget communicates directly with the AgentView SERVER via Client API

## Client API

Client API is a very simple API:
- creates and reads sessions 
- send messages, read outputs, handles streaming
- authenticate users (if user is logged in e-commerce platform it's useful to bind it with his own account)

Client API is **stateful**. AgentView SERVER stores all the conversations so that you don't have to keep them in browser memory. To retrieve the conversation all you need is auth token and session id.

Client API is reconnecting dropped connections. It means that if user refreshes the browses or changes page, you can easily go back to the conversation even if connection with Client API was dropped.


## Flexible data format

AgentView is very unopinionated in terms of data format. It sets a "frame", that can be extended in any format you want:
- Agent has multiple Sessions. Each Session can have custom metadata.
- Each Session can have mutliple Runs. Each Run can have custom metadata.
- Run has items: input item, step items and output item. Each item is any object shape you want.
- Each Agent might have multiple run types, with different input and output items.
- there's also a Client object which represents a single user. Each Session is attached to the specific Client.

This ensures any use cases can be handled. 

[chart]

## AI App

When you send a new user message via Client API, AgentView Server doesn't produce a response.




## Agent App

Agent app is where your AI code sits. It should be provided by you, it can be written in any programming language or framework you want. The whole purpose is to give you full freedom and not lock in into any specific framework.

It communicates with AgentView server via HTTP. Therefore, it must be a HTTP Server, for example FastAPI for Python or Hono for JS/TS.

## Agent API

AgentView SERVER communicates with your Agent App via Agent API. If you have an agent called `simple_chat`, when the end-user 



