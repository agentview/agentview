<div align="center">
  <a href="#">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="packages/studio/public/logo_light.svg" height="40">
      <img alt="agentview logo" src="packages/studio/public/logo.svg" height="40">
    </picture>
  </a>
  <br/><br/>
</div>

Agent View is an open-source session viewer and backend for conversational agents.
Framework-agnostic, collaborative, and fully extensible. It’s feels a bit like a CMS, only for agents.

1. [Read the docs](https://docs.agentview.app)
2. [Getting Started](https://docs.agentview.app)

## How it works?

**AgentView is completely framework-agnostic**. You write a stateless AI logic in Python or TypeScript, with any framework or none at all. The **AgentView API and SDK** provides a persistence layer that stores and orchestrates your session state, so you never have to build or maintain a complex backend.

AgentView also includes **Studio**: a visual interface for exploring and managing your agents. It's designed for ease of use by non-technical users, with built-in support for collaboration. Studio is **extremly customisable**, you can provide your custom components for any part of the experience.

## Features

#### Studio

- **Browse and inspect real agent sessions**
- **Invite teammates; multi-user by default**
- **Comment, mention, and get notified (Notion-style)**
- **Use a realistic playground**: create private test sessions, share with stakeholders when ready
- **Customize deeply**: define how sessions, cards, inputs, and custom pages render by providing React components in a config file

#### Backend

- **Store session data** in a simple, flexible array-based format
- **Validate data via schemas**
- **Manage session lifecycle via runs**
- **Track session versions** and prevent incompatible changes after agent updates
- **Expose a clean, stateful API** with streaming
- **Manage agent users and their sessions**
- **Expose a public, read-only API** that can be called directly from the browser
- **Communicate via TypeScript and Python SDKs**

## License

- AgentView Studio is MIT.
- AgentView Backend is AGPL.

