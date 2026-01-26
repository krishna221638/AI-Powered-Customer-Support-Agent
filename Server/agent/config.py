"""
Configuration settings for the AI components of the application.

This module uses Pydantic's BaseSettings to load configuration from environment
variables or use default values. It defines settings for AI models (language model,
embedding model), generation parameters (max tokens, temperature), RAG settings,
and cache configurations.
"""
from pydantic_settings import BaseSettings

class AIConfig(BaseSettings):
    """Defines configuration parameters for AI functionalities.

    Attributes:
        MODEL_NAME: Path to the main language model directory.
        EMBEDDING_MODEL: Name or path of the sentence transformer model for embeddings.
        MAX_NEW_TOKENS: Maximum number of new tokens to generate in AI responses.
        TEMPERATURE: Sampling temperature for AI generation (controls randomness).
        TOP_P: Nucleus sampling probability (controls diversity).
        VECTOR_SIMILARITY_THRESHOLD: Minimum similarity score for RAG context.
        MAX_CONTEXT_ENTRIES: Maximum number of knowledge base entries for RAG context.
        ENABLE_CACHE: Flag to enable or disable caching for AI operations.
        CACHE_TTL: Cache Time-To-Live in seconds.
    """
    MODEL_NAME: str = "F://CDC//Model"
    EMBEDDING_MODEL: str = "all-mpnet-base-v2" 
    SECTOR: str = "general"

    # Generation settings
    MAX_NEW_TOKENS: int = 512
    TEMPERATURE: float = 0.7
    TOP_P: float = 0.9
    
    # RAG settings
    VECTOR_SIMILARITY_THRESHOLD: float = 0.7
    MAX_CONTEXT_ENTRIES: int = 3
    
    # Cache settings
    ENABLE_CACHE: bool = True
    CACHE_TTL: int = 3600  # 1 hour
    
    class Config:
        """Pydantic configuration class.
        Specifies the environment variable prefix.
        """
        env_prefix = "AI_"

# Create global instance
ai_config = AIConfig()
