from __future__ import annotations

from typing import Any


class AgentViewError(Exception):
    """Exception raised for AgentView API errors."""

    def __init__(
        self,
        message: str,
        status_code: int,
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}

    def __str__(self) -> str:
        base = f"AgentViewError: {self.message} (status: {self.status_code})"
        if self.details:
            base += f", details: {self.details}"
        return base

    def __repr__(self) -> str:
        return f"AgentViewError({self.message!r}, {self.status_code}, {self.details!r})"
