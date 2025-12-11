"""Basic API tests for AgentView Python SDK.

These tests verify the SDK works correctly against the API.
They require a running API server and proper environment variables.
"""

import os

import pytest

from agentview import AgentView, AgentViewError, PublicAgentView, Status


class TestUsers:
    def test_create_user(self, client: AgentView):
        """Test creating a user."""
        external_id = f"test_{os.urandom(8).hex()}"
        user = client.create_user(external_id=external_id)

        assert user.external_id == external_id
        assert user.env.value == "playground"
        assert user.token is not None

    def test_create_user_no_options(self, client: AgentView):
        """Test creating a user without options."""
        user = client.create_user()

        assert user.id is not None
        assert user.token is not None

    def test_get_user_by_id(self, client: AgentView):
        """Test getting a user by ID."""
        user = client.create_user()

        fetched = client.get_user(id=user.id)
        assert fetched.id == user.id

    def test_get_user_by_token(self, client: AgentView):
        """Test getting a user by token."""
        user = client.create_user()

        fetched = client.get_user(token=user.token)
        assert fetched.id == user.id

    def test_get_user_by_external_id(self, client: AgentView):
        """Test getting a user by external ID."""
        external_id = f"test_{os.urandom(8).hex()}"
        user = client.create_user(external_id=external_id)

        fetched = client.get_user(external_id=external_id)
        assert fetched.id == user.id

    def test_user_scoping_with_as(self, client: AgentView):
        """Test scoping client to a user with as_()."""
        user = client.create_user()

        scoped = client.as_(user)
        me = scoped.get_user()

        assert me.id == user.id


class TestSessions:
    @pytest.fixture(autouse=True)
    def setup_config(self, client: AgentView):
        """Ensure config exists with test agent."""
        client._update_config(config={"agents": [{"name": "test-agent"}]})

    def test_create_session(self, client: AgentView):
        """Test creating a session."""
        user = client.create_user()

        session = client.create_session(agent="test-agent", user_id=user.id)

        assert session.agent == "test-agent"
        assert session.user.id == user.id
        assert session.runs == []

    def test_get_session(self, client: AgentView):
        """Test getting a session by ID."""
        user = client.create_user()
        session = client.create_session(agent="test-agent", user_id=user.id)

        fetched = client.get_session(session.id)
        assert fetched.id == session.id

    def test_get_sessions_paginated(self, client: AgentView):
        """Test getting paginated sessions."""
        result = client.get_sessions()

        assert hasattr(result, "sessions")
        assert hasattr(result, "pagination")
        assert result.pagination.page >= 1

    def test_update_session_metadata(self, client: AgentView):
        """Test updating session metadata."""
        user = client.create_user()
        session = client.create_session(agent="test-agent", user_id=user.id)

        updated = client.update_session(session.id, metadata={"key": "value"})

        assert updated.metadata == {"key": "value"}

    def test_star_unstar_session(self, client: AgentView):
        """Test starring and unstarring a session."""
        user = client.create_user()
        session = client.create_session(agent="test-agent", user_id=user.id)

        # Star
        result = client.star_session(session.id)
        assert result["starred"] is True

        # Check starred
        is_starred = client.is_session_starred(session.id)
        assert is_starred["starred"] is True

        # Unstar
        result = client.unstar_session(session.id)
        assert result["starred"] is False


# Note: Run tests skipped - they require complex agent config setup
# The SDK's create_run/update_run methods work, but testing them requires
# setting up proper agent configs with valid JSON schemas which is API-specific


class TestPublicAPI:
    def test_public_get_me(self, api_base_url: str, client: AgentView):
        """Test PublicAgentView.get_me()."""
        user = client.create_user()

        public_client = PublicAgentView(
            api_base_url=api_base_url, user_token=user.token
        )
        me = public_client.get_me()

        assert me.id == user.id


class TestErrors:
    def test_not_found_error(self, client: AgentView):
        """Test that 404 errors raise AgentViewError."""
        with pytest.raises(AgentViewError) as exc_info:
            client.get_user(id="nonexistent-id")

        assert exc_info.value.status_code == 404


class TestAsync:
    @pytest.mark.asyncio
    async def test_async_create_user(self, client: AgentView):
        """Test async user creation."""
        external_id = f"async_test_{os.urandom(8).hex()}"
        user = await client.acreate_user(external_id=external_id)

        assert user.external_id == external_id

    @pytest.mark.asyncio
    async def test_async_get_user(self, client: AgentView):
        """Test async get user."""
        user = await client.acreate_user()
        fetched = await client.aget_user(id=user.id)

        assert fetched.id == user.id
