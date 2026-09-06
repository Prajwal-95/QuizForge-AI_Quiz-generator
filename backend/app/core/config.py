from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./quizforge.db"
    llm_provider: str = "groq"
    groq_api_key: str = ""
    api_port: int = 8001  # backend port
    max_upload_size_mb: int = 20
    similarity_threshold: float = 0.85
    max_correction_attempts: int = 3
    max_llm_context_chars: int = 12000

    # Auth
    jwt_secret: str = "quizforge-dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
