from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List
import uuid

class Settings(BaseSettings):
    """Application settings."""

    PROJECT_NAME: str = "KEYWORD API API"
    DATABASE_URL: str
    DEBUG: bool = False
    
    # Auth settings
    AUTH_ENABLED: bool = False  # Set to False to disable auth in development
    MOCK_USER_ID: Optional[uuid.UUID] = uuid.UUID("a1b2c3d4-e5f6-7890-1234-567890abcdef")
    MOCK_USER_ROLE: Optional[str] = "admin"

    # External APIs (Smedia360 logic)
    YOUTUBE_API_KEY: str = "" # Comma-separated list of keys
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash" # Use gemini-1.5-flash as default

    @property
    def youtube_api_keys(self) -> List[str]:
        if not self.YOUTUBE_API_KEY:
            return []
        return [k.strip() for k in self.YOUTUBE_API_KEY.split(",") if k.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

