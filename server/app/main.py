from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router
from app.logging import setup_logging
from app.database import close_pool

# Setup logging
setup_logging()

# Create FastAPI app
app = FastAPI(
    title="Onchain Explorer Server",
    description="Server with FastAPI and LangGraph for onchain data exploration",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    print("✅ Server started successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await close_pool()
    print("🔄 Server shutdown complete")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Onchain Explorer Server",
        "version": "0.1.0",
        "endpoints": {
            "health": "/api/v1/healthz",
            "query": "/api/v1/query"
        }
    }
