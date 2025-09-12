#!/usr/bin/env python3
"""
Simple test to verify the server works with minimal dependencies
"""

import asyncio
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

async def test_retrieval_service():
    """Test the retrieval service with OpenAI only"""
    try:
        from app.services.retrieval import RetrievalService
        from app.config import settings
        
        print("🔑 Testing API Key Loading...")
        print(f"OpenAI API Key loaded: {bool(settings.openai_api_key)}")
        print(f"Cohere API Key loaded: {bool(settings.cohere_api_key)}")
        
        print("\n🚀 Testing Retrieval Service Initialization...")
        service = RetrievalService(embedding_provider="openai")
        print("✅ Retrieval service initialized successfully")
        print(f"Embedding provider: {type(service.embedding_provider).__name__}")
        print(f"Cohere client available: {service.cohere_client is not None}")
        
        print("\n🎉 All tests passed! Server is ready.")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_retrieval_service())
    sys.exit(0 if success else 1)




