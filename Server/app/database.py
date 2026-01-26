import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set. Please configure it in your .env file or environment.")

# Configure the engine with pooling and pgvector support
engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    poolclass=QueuePool,
    connect_args={
        "options": "-c search_path=public,vector"  # Enable vector extension
    }
)

SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()
