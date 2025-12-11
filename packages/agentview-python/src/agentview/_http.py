from __future__ import annotations

from typing import Any

import httpx

from .errors import AgentViewError


class HTTPClient:
    """Internal HTTP client wrapper supporting both sync and async."""

    def __init__(
        self,
        base_url: str,
        api_key: str | None = None,
        user_token: str | None = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.user_token = user_token

    def _get_headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        if self.user_token:
            headers["X-User-Token"] = self.user_token
        return headers

    def _handle_response(self, response: httpx.Response) -> Any:
        if not response.is_success:
            try:
                error_body = response.json()
                message = error_body.pop("message", "Unknown error")
            except Exception:
                message = response.text or "Unknown error"
                error_body = {}
            raise AgentViewError(message, response.status_code, error_body)

        if response.status_code == 204:
            return None
        return response.json()

    def request(
        self,
        method: str,
        path: str,
        json: Any | None = None,
        params: dict[str, Any] | None = None,
    ) -> Any:
        """Synchronous HTTP request."""
        with httpx.Client() as client:
            response = client.request(
                method,
                f"{self.base_url}{path}",
                headers=self._get_headers(),
                json=json,
                params=params,
            )
            return self._handle_response(response)

    async def arequest(
        self,
        method: str,
        path: str,
        json: Any | None = None,
        params: dict[str, Any] | None = None,
    ) -> Any:
        """Asynchronous HTTP request."""
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method,
                f"{self.base_url}{path}",
                headers=self._get_headers(),
                json=json,
                params=params,
            )
            return self._handle_response(response)
