from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from routers import (
    auth,
    users,
    companies,
    departments,
    tickets,
    interactions,
    analytics,
    communications,
    ticketsort,
    company_settings
)
import time

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Customer Support Triage API",
    description="AI-powered customer support ticket management system",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Include all routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(companies.router)
app.include_router(departments.router)
app.include_router(ticketsort.router)
app.include_router(tickets.router)
app.include_router(interactions.router)
app.include_router(analytics.router)
app.include_router(company_settings.router)
# app.include_router(communications.router)

@app.get("/")
async def root():
    return {
        "message": "Welcome to Customer Support Triage API",
        "docs": "/docs",
        "redoc": "/redoc"
    }