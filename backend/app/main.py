import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import SETTINGS
from app.routers import health, workflows

# Validation writes one line per finding, so the log has to have a handler.
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Workflow API — Full-Stack Exercise",
    description="Create, validate, save, and retrieve machine-learning workflows.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=SETTINGS.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(workflows.router)
