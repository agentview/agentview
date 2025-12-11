import os

import pytest
from dotenv import load_dotenv

# Load .env file if present
load_dotenv()


def get_env_or_skip(name: str) -> str:
    """Get environment variable or skip test if not set."""
    value = os.environ.get(name)
    if not value:
        pytest.skip(f"Environment variable {name} not set")
    return value


@pytest.fixture
def api_base_url() -> str:
    return get_env_or_skip("AGENTVIEW_API_BASE_URL")


@pytest.fixture
def api_key() -> str:
    return get_env_or_skip("AGENTVIEW_API_KEY")


@pytest.fixture
def client(api_base_url: str, api_key: str):
    from agentview import AgentView

    return AgentView(api_base_url=api_base_url, api_key=api_key)
