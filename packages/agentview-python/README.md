# AgentView Python SDK

Python SDK for the AgentView API.

## Installation

```bash
# Using pip
pip install agentview

# Using uv
uv add agentview
```

## Usage

```python
from agentview import AgentView, PublicAgentView

# Admin client (with API key)
client = AgentView(
    api_base_url="http://localhost:1990",
    api_key="your-api-key",
)

# Create a user
user = client.create_user(external_id="user-123")
print(user)

# Create a session
session = client.create_session(agent="my-agent", user_id=user.id)
print(session)

# Create a run
run = client.create_run(
    session_id=session.id,
    version="1.0.0",
    items=[{"role": "user", "content": "Hello"}],
)

# Get sessions with pagination
result = client.get_sessions(agent="my-agent", limit=10)
for session in result.sessions:
    print(session.id, session.agent)

# Scope client to a specific user
user_client = client.as_(user)
me = user_client.get_user()

# Public client (user-scoped, no API key needed)
public_client = PublicAgentView(
    api_base_url="http://localhost:1990",
    user_token=user.token,
)
me = public_client.get_me()
```

## Async Support

All methods have async variants prefixed with `a`:

```python
import asyncio
from agentview import AgentView

async def main():
    client = AgentView(api_base_url="http://localhost:1990", api_key="your-key")
    user = await client.acreate_user()
    session = await client.acreate_session(agent="my-agent", user_id=user.id)
    print(session)

asyncio.run(main())
```

## Development

```bash
cd packages/agentview-python

# Create venv
python3 -m venv .venv
source .venv/bin/activate

# Install dev dependencies
pip install -e ".[dev]"

# Run tests (requires running API server)
export AGENTVIEW_API_BASE_URL=http://localhost:1990
export AGENTVIEW_API_KEY=your-api-key
pytest
```

## Regenerating Models

Models are generated from TypeScript Zod schemas. To regenerate:

```bash
cd packages/agentview-python
pnpm run generate-models
```
