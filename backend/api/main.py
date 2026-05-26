from fastapi import FastAPI

from api.core.config import settings
from api.core.logging import get_logger, setup_logging
from api.src.tiktok_research.routes import router as tiktok_research_router
from api.src.video_engine.routes import router as video_engine_router
from api.src.youtube_research.routes import router as youtube_research_router
from api.utils.migrations import run_migrations
from api.core.middleware import auth_middleware
from fastapi.middleware.cors import CORSMiddleware
# Set up logging configuration
setup_logging()

# Optional: Run migrations on startup
run_migrations()

# Set up logger for this module
logger = get_logger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    debug=settings.DEBUG,
)
# ADd Config CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Add middleware
app.middleware("http")(auth_middleware)

# Include routers
app.include_router(prefix="/api/v1/tiktok-research", router=tiktok_research_router)
app.include_router(prefix="/api/v1/video", router=video_engine_router)
app.include_router(prefix="/api/v1/youtube-research", router=youtube_research_router)



@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/")
async def root():
    """Root endpoint."""
    logger.debug("Root endpoint called")
    return {"message": "Welcome to Keyword API!"}
