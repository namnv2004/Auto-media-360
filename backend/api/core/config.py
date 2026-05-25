from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import uuid

class Settings(BaseSettings):
    """Application settings."""

    PROJECT_NAME: str = "KEYWORD API API"
    DATABASE_URL: str
    DEBUG: bool = False
    
    # Auth settings
    AUTH_ENABLED: bool = False  # Set to False to disable auth in development
    # CHANGE THIS: The type hint should be uuid.UUID
    MOCK_USER_ID: Optional[uuid.UUID] = uuid.UUID("a1b2c3d4-e5f6-7890-1234-567890abcdef") # <-- Wrap the string in uuid.UUID()
    MOCK_USER_ROLE: Optional[str] = "admin"  # This can remain a string

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
