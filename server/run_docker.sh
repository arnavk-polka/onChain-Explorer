#!/bin/bash

# Run the retrieval service in Docker
echo "🐳 Building and running retrieval service in Docker..."

# Build the Docker image
echo "Building Docker image..."
docker build -t onchain-retrieval-service .

# Run the container
echo "Starting container..."
docker run -d \
  --name onchain-retrieval \
  -p 8000:8000 \
  --env-file .env \
  onchain-retrieval-service

echo "✅ Server is running at http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo "🔍 Search endpoint: POST http://localhost:8000/api/v1/search"
echo ""
echo "To stop the container: docker stop onchain-retrieval"
echo "To remove the container: docker rm onchain-retrieval"




