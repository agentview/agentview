from __future__ import annotations

from typing import Any, Literal, overload

from ._http import HTTPClient
from ._utils import with_model
from .models import (
    Config,
    Env,
    Run,
    RunCreate,
    RunUpdate,
    Session,
    SessionCreate,
    SessionUpdate,
    SessionsGetQueryParams,
    SessionsPaginatedResponse,
    PublicSessionsGetQueryParams,
    User,
    UserCreate,
)


class AgentView:
    """Admin client using API key authentication."""

    def __init__(
        self,
        api_base_url: str,
        api_key: str,
        user_token: str | None = None,
        env: Env | Literal["playground", "production", "shared-playground"] = "playground",
    ):
        self._http = HTTPClient(api_base_url, api_key, user_token)
        self._api_base_url = api_base_url
        self._api_key = api_key
        self._user_token = user_token
        self._env = Env(env) if isinstance(env, str) else env

    # --- User Methods ---

    @with_model(UserCreate)
    def create_user(self, options: UserCreate | None = None) -> User:
        body: dict[str, Any] = {"env": self._env.value}
        if options:
            body.update(options.model_dump(by_alias=True, exclude_none=True))
        data = self._http.request("POST", "/api/users", json=body)
        return User.model_validate(data)

    @with_model(UserCreate)
    async def acreate_user(self, options: UserCreate | None = None) -> User:
        body: dict[str, Any] = {"env": self._env.value}
        if options:
            body.update(options.model_dump(by_alias=True, exclude_none=True))
        data = await self._http.arequest("POST", "/api/users", json=body)
        return User.model_validate(data)

    @overload
    def get_user(self) -> User: ...

    @overload
    def get_user(self, *, id: str) -> User: ...

    @overload
    def get_user(self, *, token: str) -> User: ...

    @overload
    def get_user(self, *, external_id: str, env: Env | None = None) -> User: ...

    def get_user(
        self,
        *,
        id: str | None = None,
        token: str | None = None,
        external_id: str | None = None,
        env: Env | None = None,
    ) -> User:
        if id:
            data = self._http.request("GET", f"/api/users/{id}")
        elif token:
            if self._user_token and self._user_token != token:
                raise ValueError(
                    "Cannot get user with token when scoped with another user's token"
                )
            data = self.as_(token)._http.request("GET", "/api/users/me")
        elif external_id:
            env_val = (env or self._env).value
            data = self._http.request(
                "GET", f"/api/users/by-external-id/{external_id}?env={env_val}"
            )
        else:
            data = self._http.request("GET", "/api/users/me")
        return User.model_validate(data)

    @overload
    async def aget_user(self) -> User: ...

    @overload
    async def aget_user(self, *, id: str) -> User: ...

    @overload
    async def aget_user(self, *, token: str) -> User: ...

    @overload
    async def aget_user(self, *, external_id: str, env: Env | None = None) -> User: ...

    async def aget_user(
        self,
        *,
        id: str | None = None,
        token: str | None = None,
        external_id: str | None = None,
        env: Env | None = None,
    ) -> User:
        if id:
            data = await self._http.arequest("GET", f"/api/users/{id}")
        elif token:
            if self._user_token and self._user_token != token:
                raise ValueError(
                    "Cannot get user with token when scoped with another user's token"
                )
            data = await self.as_(token)._http.arequest("GET", "/api/users/me")
        elif external_id:
            env_val = (env or self._env).value
            data = await self._http.arequest(
                "GET", f"/api/users/by-external-id/{external_id}?env={env_val}"
            )
        else:
            data = await self._http.arequest("GET", "/api/users/me")
        return User.model_validate(data)

    @with_model(UserCreate)
    def update_user(self, id: str, options: UserCreate | None = None) -> User:
        body = options.model_dump(by_alias=True, exclude_none=True) if options else {}
        data = self._http.request("PATCH", f"/api/users/{id}", json=body)
        return User.model_validate(data)

    @with_model(UserCreate)
    async def aupdate_user(self, id: str, options: UserCreate | None = None) -> User:
        body = options.model_dump(by_alias=True, exclude_none=True) if options else {}
        data = await self._http.arequest("PATCH", f"/api/users/{id}", json=body)
        return User.model_validate(data)

    # --- Session Methods ---

    @with_model(SessionCreate)
    def create_session(self, options: SessionCreate) -> Session:
        body: dict[str, Any] = {"env": self._env.value}
        body.update(options.model_dump(by_alias=True, exclude_none=True))
        data = self._http.request("POST", "/api/sessions", json=body)
        return Session.model_validate(data)

    @with_model(SessionCreate)
    async def acreate_session(self, options: SessionCreate) -> Session:
        body: dict[str, Any] = {"env": self._env.value}
        body.update(options.model_dump(by_alias=True, exclude_none=True))
        data = await self._http.arequest("POST", "/api/sessions", json=body)
        return Session.model_validate(data)

    def get_session(self, id: str) -> Session:
        data = self._http.request("GET", f"/api/sessions/{id}")
        return Session.model_validate(data)

    async def aget_session(self, id: str) -> Session:
        data = await self._http.arequest("GET", f"/api/sessions/{id}")
        return Session.model_validate(data)

    @with_model(SessionsGetQueryParams)
    def get_sessions(self, options: SessionsGetQueryParams | None = None) -> SessionsPaginatedResponse:
        params: dict[str, Any] = {"env": self._env.value}
        if options:
            dumped = options.model_dump(by_alias=True, exclude_none=True)
            # Convert values to strings for query params
            for k, v in dumped.items():
                if isinstance(v, bool):
                    params[k] = "true" if v else "false"
                elif isinstance(v, Env):
                    params[k] = v.value
                else:
                    params[k] = str(v)
        data = self._http.request("GET", "/api/sessions", params=params)
        return SessionsPaginatedResponse.model_validate(data)

    @with_model(SessionsGetQueryParams)
    async def aget_sessions(self, options: SessionsGetQueryParams | None = None) -> SessionsPaginatedResponse:
        params: dict[str, Any] = {"env": self._env.value}
        if options:
            dumped = options.model_dump(by_alias=True, exclude_none=True)
            for k, v in dumped.items():
                if isinstance(v, bool):
                    params[k] = "true" if v else "false"
                elif isinstance(v, Env):
                    params[k] = v.value
                else:
                    params[k] = str(v)
        data = await self._http.arequest("GET", "/api/sessions", params=params)
        return SessionsPaginatedResponse.model_validate(data)

    @with_model(SessionUpdate)
    def update_session(self, id: str, options: SessionUpdate) -> Session:
        body = options.model_dump(by_alias=True, exclude_none=True)
        data = self._http.request("PATCH", f"/api/sessions/{id}", json=body)
        return Session.model_validate(data)

    @with_model(SessionUpdate)
    async def aupdate_session(self, id: str, options: SessionUpdate) -> Session:
        body = options.model_dump(by_alias=True, exclude_none=True)
        data = await self._http.arequest("PATCH", f"/api/sessions/{id}", json=body)
        return Session.model_validate(data)

    # --- Star Methods ---

    def star_session(self, session_id: str) -> dict[str, bool]:
        return self._http.request("PUT", f"/api/sessions/{session_id}/star")

    async def astar_session(self, session_id: str) -> dict[str, bool]:
        return await self._http.arequest("PUT", f"/api/sessions/{session_id}/star")

    def unstar_session(self, session_id: str) -> dict[str, bool]:
        return self._http.request("DELETE", f"/api/sessions/{session_id}/star")

    async def aunstar_session(self, session_id: str) -> dict[str, bool]:
        return await self._http.arequest("DELETE", f"/api/sessions/{session_id}/star")

    def is_session_starred(self, session_id: str) -> dict[str, bool]:
        return self._http.request("GET", f"/api/sessions/{session_id}/star")

    async def ais_session_starred(self, session_id: str) -> dict[str, bool]:
        return await self._http.arequest("GET", f"/api/sessions/{session_id}/star")

    # --- Run Methods ---

    @with_model(RunCreate)
    def create_run(self, options: RunCreate) -> Run:
        body = options.model_dump(by_alias=True, exclude_none=True)
        data = self._http.request("POST", "/api/runs", json=body)
        return Run.model_validate(data)

    @with_model(RunCreate)
    async def acreate_run(self, options: RunCreate) -> Run:
        body = options.model_dump(by_alias=True, exclude_none=True)
        data = await self._http.arequest("POST", "/api/runs", json=body)
        return Run.model_validate(data)

    @with_model(RunUpdate)
    def update_run(self, id: str, options: RunUpdate | None = None) -> Run:
        body = options.model_dump(by_alias=True, exclude_none=True) if options else {}
        data = self._http.request("PATCH", f"/api/runs/{id}", json=body)
        return Run.model_validate(data)

    @with_model(RunUpdate)
    async def aupdate_run(self, id: str, options: RunUpdate | None = None) -> Run:
        body = options.model_dump(by_alias=True, exclude_none=True) if options else {}
        data = await self._http.arequest("PATCH", f"/api/runs/{id}", json=body)
        return Run.model_validate(data)

    # --- Config Methods (Internal) ---

    def _get_config(self) -> Config:
        data = self._http.request("GET", "/api/config")
        return Config.model_validate(data)

    async def _aget_config(self) -> Config:
        data = await self._http.arequest("GET", "/api/config")
        return Config.model_validate(data)

    def _update_config(self, *, config: Any) -> Config:
        data = self._http.request("PUT", "/api/config", json={"config": config})
        return Config.model_validate(data)

    async def _aupdate_config(self, *, config: Any) -> Config:
        data = await self._http.arequest("PUT", "/api/config", json={"config": config})
        return Config.model_validate(data)

    # --- User Scoping ---

    def as_(self, user_or_token: User | str) -> AgentView:
        """Returns a new client instance scoped to the given user."""
        token = user_or_token if isinstance(user_or_token, str) else user_or_token.token
        return AgentView(
            api_base_url=self._api_base_url,
            api_key=self._api_key,
            user_token=token,
            env=self._env,
        )


class PublicAgentView:
    """User-scoped client using user token authentication (no API key needed)."""

    def __init__(self, api_base_url: str, user_token: str):
        self._http = HTTPClient(api_base_url, user_token=user_token)

    def get_me(self) -> User:
        data = self._http.request("GET", "/api/public/me")
        return User.model_validate(data)

    async def aget_me(self) -> User:
        data = await self._http.arequest("GET", "/api/public/me")
        return User.model_validate(data)

    def get_session(self, id: str) -> Session:
        data = self._http.request("GET", f"/api/public/sessions/{id}")
        return Session.model_validate(data)

    async def aget_session(self, id: str) -> Session:
        data = await self._http.arequest("GET", f"/api/public/sessions/{id}")
        return Session.model_validate(data)

    @with_model(PublicSessionsGetQueryParams)
    def get_sessions(self, options: PublicSessionsGetQueryParams | None = None) -> SessionsPaginatedResponse:
        params: dict[str, Any] = {}
        if options:
            dumped = options.model_dump(by_alias=True, exclude_none=True)
            for k, v in dumped.items():
                params[k] = str(v)
        data = self._http.request("GET", "/api/public/sessions", params=params)
        return SessionsPaginatedResponse.model_validate(data)

    @with_model(PublicSessionsGetQueryParams)
    async def aget_sessions(self, options: PublicSessionsGetQueryParams | None = None) -> SessionsPaginatedResponse:
        params: dict[str, Any] = {}
        if options:
            dumped = options.model_dump(by_alias=True, exclude_none=True)
            for k, v in dumped.items():
                params[k] = str(v)
        data = await self._http.arequest("GET", "/api/public/sessions", params=params)
        return SessionsPaginatedResponse.model_validate(data)
