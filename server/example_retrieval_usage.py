#!/usr/bin/env python3
"""
Example usage of the retrieval service
Demonstrates various search scenarios and filters
"""

import asyncio
import os
from datetime import datetime, timedelta
from app.services.retrieval import RetrievalService, SearchFilters

async def main():
    """Example usage of retrieval service"""
    
    print("Retrieval Service Example Usage")
    print("=" * 40)
    
    # Initialize service
    service = RetrievalService(embedding_provider="bge-m3")
    
    # Example 1: Basic search
    print("\n1. Basic search:")
    print("-" * 20)
    results = await service.search_proposals(
        query="treasury proposal funding",
        top_k=5
    )
    
    for i, result in enumerate(results, 1):
        print(f"{i}. {result.title}")
        print(f"   Network: {result.network}, Type: {result.type}")
        print(f"   Amount: {result.amount}, Score: {result.score:.3f}")
        print(f"   Snippet: {result.snippet}")
        print()
    
    # Example 2: Search with filters
    print("\n2. Search with filters:")
    print("-" * 25)
    filters = SearchFilters(
        network="polkadot",
        proposal_type="treasury",
        min_amount=1000.0
    )
    
    results = await service.search_proposals(
        query="development funding",
        filters=filters,
        top_k=3
    )
    
    for i, result in enumerate(results, 1):
        print(f"{i}. {result.title}")
        print(f"   Network: {result.network}, Type: {result.type}")
        print(f"   Amount: {result.amount}")
        print()
    
    # Example 3: Fuzzy search (typo tolerance)
    print("\n3. Fuzzy search with typos:")
    print("-" * 30)
    results = await service.search_proposals(
        query="goverance proposl",  # Intentional typos
        top_k=3
    )
    
    for i, result in enumerate(results, 1):
        print(f"{i}. {result.title}")
        print(f"   Network: {result.network}, Type: {result.type}")
        print()
    
    # Example 4: Date range search
    print("\n4. Date range search:")
    print("-" * 22)
    filters = SearchFilters(
        start_date=datetime.now() - timedelta(days=30),
        end_date=datetime.now()
    )
    
    results = await service.search_proposals(
        query="recent proposals",
        filters=filters,
        top_k=3
    )
    
    for i, result in enumerate(results, 1):
        print(f"{i}. {result.title}")
        print(f"   Created: {result.created_at}")
        print()
    
    # Example 5: Vector-only semantic search
    print("\n5. Semantic search:")
    print("-" * 20)
    results = await service.search_proposals(
        query="blockchain infrastructure improvements",
        top_k=3
    )
    
    for i, result in enumerate(results, 1):
        print(f"{i}. {result.title}")
        print(f"   Snippet: {result.snippet}")
        print()
    
    # Example 6: Search with reranking disabled
    print("\n6. Search without reranking:")
    print("-" * 28)
    results = await service.search_proposals(
        query="community events",
        use_rerank=False,
        top_k=3
    )
    
    for i, result in enumerate(results, 1):
        print(f"{i}. {result.title}")
        print(f"   Score: {result.score:.3f}")
        print()

if __name__ == "__main__":
    # Set up environment
    os.environ.setdefault("OPENAI_API_KEY", "")
    os.environ.setdefault("COHERE_API_KEY", "")
    
    # Run example
    asyncio.run(main())

