#!/usr/bin/env python3
"""
Debug script to check embeddings and test search
"""

import asyncio
import os
import sys

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.db import get_pool
from app.services.retrieval import get_retrieval_service
from app.logger import get_logger

logger = get_logger(__name__)

async def debug_search():
    """Debug search functionality"""
    
    # Check what proposals have embeddings
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.fetch("""
            SELECT p.id, p.title, p.network, p.type 
            FROM proposals p 
            JOIN proposals_embeddings pe ON p.id = pe.proposal_id 
            LIMIT 10
        """)
        
        print("Proposals with embeddings:")
        for r in result:
            print(f"- {r['id']}: {r['title']} ({r['network']}, {r['type']})")
        
        # Check how many treasury proposals exist
        treasury_count = await conn.fetchval("""
            SELECT COUNT(*) FROM proposals 
            WHERE type = 'TreasuryProposal' AND network = 'polkadot'
        """)
        print(f"\nTotal polkadot treasury proposals: {treasury_count}")
        
        # Check how many treasury proposals have embeddings
        treasury_with_embeddings = await conn.fetchval("""
            SELECT COUNT(*) FROM proposals p
            JOIN proposals_embeddings pe ON p.id = pe.proposal_id
            WHERE p.type = 'TreasuryProposal' AND p.network = 'polkadot'
        """)
        print(f"Polkadot treasury proposals with embeddings: {treasury_with_embeddings}")
    
    # Test search without filters
    print("\nTesting search without filters...")
    service = get_retrieval_service()
    results = await service.search_proposals('treasury proposal funding', top_k=5)
    print(f"Found {len(results)} results without filters")
    for r in results:
        print(f"- {r.title}: {r.snippet}")
    
    # Test search with filters
    print("\nTesting search with filters...")
    from app.services.retrieval import SearchFilters
    filters = SearchFilters(network='polkadot', proposal_type='TreasuryProposal')
    results = await service.search_proposals('treasury proposal funding', filters=filters, top_k=5)
    print(f"Found {len(results)} results with filters")
    for r in results:
        print(f"- {r.title}: {r.snippet}")

def main():
    try:
        asyncio.run(debug_search())
        return 0
    except Exception as e:
        logger.error(f"Debug failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
