from __future__ import annotations

import inspect
from functools import wraps
from typing import Any, Callable, TypeVar

from pydantic import BaseModel
from pydantic.fields import PydanticUndefined

F = TypeVar("F", bound=Callable[..., Any])


def with_model(model_class: type[BaseModel], param_name: str = "options") -> Callable[[F], F]:
    """
    Decorator that expands a Pydantic model parameter into keyword arguments.

    The decorated function should accept the model as a parameter named `param_name`.
    Callers can then pass individual fields as kwargs instead.

    Example:
        @with_model(UserCreate)
        def create_user(self, options: UserCreate | None) -> User:
            ...

        # Can be called as:
        client.create_user(external_id="test")
    """

    def decorator(func: F) -> F:
        sig = inspect.signature(func)

        # Build new parameters: keep all except model param, replace with model fields
        new_params: list[inspect.Parameter] = []
        for name, param in sig.parameters.items():
            if name == param_name:
                # Replace model param with its fields as keyword-only args
                for field_name, field_info in model_class.model_fields.items():
                    # Determine default value
                    if field_info.default is not PydanticUndefined:
                        default = field_info.default
                    elif field_info.default_factory is not None:
                        default = inspect.Parameter.empty  # Will be computed at runtime
                    else:
                        default = inspect.Parameter.empty

                    new_params.append(
                        inspect.Parameter(
                            field_name,
                            inspect.Parameter.KEYWORD_ONLY,
                            default=default,
                            annotation=field_info.annotation,
                        )
                    )
            else:
                new_params.append(param)

        new_sig = sig.replace(parameters=new_params)

        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Separate model fields from other kwargs
            model_kwargs: dict[str, Any] = {}
            other_kwargs: dict[str, Any] = {}
            model_field_names = set(model_class.model_fields.keys())

            for k, v in kwargs.items():
                if k in model_field_names:
                    if v is not None:  # Only include non-None values
                        model_kwargs[k] = v
                else:
                    other_kwargs[k] = v

            # Create model instance if we have any fields, otherwise None
            model_instance = model_class(**model_kwargs) if model_kwargs else None

            # Call original function with model instance
            return func(*args, **{param_name: model_instance, **other_kwargs})

        wrapper.__signature__ = new_sig  # type: ignore
        return wrapper  # type: ignore

    return decorator
