"""Environment-driven settings, validated at startup. A missing secret
crashes the app at boot instead of on the first request (ENGINEERING §6)."""

from __future__ import annotations

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    inference_api_key: SecretStr = Field(min_length=8)
    log_level: str = "info"
    git_sha: str = "dev"
