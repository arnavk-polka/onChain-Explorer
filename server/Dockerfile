FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including pgvector support
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies directly with pip
RUN pip install fastapi uvicorn[standard] langgraph langchain python-dotenv pydantic pydantic-settings asyncpg

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/healthz || exit 1

# Run the application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
