#!/usr/bin/env python3
"""
Simple script to add embeddings for a few proposals at a time
"""

import asyncio
import os
import sys

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.db import get_session
from app.services.etl import ETLService
from app.logger import get_logger

logger = get_logger(__name__)

async def add_embeddings_simple():
    """Add embeddings for a small batch of proposals"""
    
    logger.info("Starting simple embedding generation...")
    
    # Get database pool
    from app.db import get_pool
    pool = await get_pool()
    
    # Get just 10 proposals without embeddings
    async with pool.acquire() as conn:
        proposals = await conn.fetch("""
            SELECT p.id, p.title, p.description, p.network, p.type
            FROM proposals p 
            LEFT JOIN proposals_embeddings pe ON p.id = pe.proposal_id
            WHERE pe.proposal_id IS NULL
            ORDER BY p.created_at DESC
            LIMIT 10
        """)
        
        logger.info(f"Found {len(proposals)} proposals without embeddings")
        
        if not proposals:
            logger.info("All proposals already have embeddings!")
            return
        
        # Create ETL service
        etl_service = ETLService(
            embedding_provider="openai",
            batch_size=10
        )
        
        # Prepare texts for embedding
        texts = []
        proposal_ids = []
        
        for proposal in proposals:
            title = proposal['title'] or ''
            description = proposal['description'] or ''
            text = f"{title}\n{description}".strip()
            
            if text:
                texts.append(text)
                proposal_ids.append(proposal['id'])
                logger.info(f"Prepared text for proposal {proposal['id']}: {text[:100]}...")
        
        if not texts:
            logger.warning("No valid texts found")
            return
        
        # Compute embeddings
        logger.info(f"Computing embeddings for {len(texts)} proposals...")
        try:
            embeddings = await etl_service.embedding_provider.get_embeddings_batch(texts)
            logger.info(f"Generated {len(embeddings)} embeddings")
            
            # Store embeddings
            for proposal_id, embedding in zip(proposal_ids, embeddings):
                embedding_str = '[' + ','.join(map(str, embedding)) + ']'
                await conn.execute("""
                    INSERT INTO proposals_embeddings (proposal_id, embedding)
                    VALUES ($1, $2::vector)
                    ON CONFLICT (proposal_id) 
                    DO UPDATE SET embedding = EXCLUDED.embedding
                """, proposal_id, embedding_str)
                logger.info(f"Stored embedding for proposal {proposal_id}")
            
            logger.info("Embeddings stored successfully!")
            
        except Exception as e:
            logger.error(f"Error computing embeddings: {e}")
            return
        
        # Check final count
        final_count = await conn.fetchval("SELECT COUNT(*) FROM proposals_embeddings")
        logger.info(f"Total embeddings in database: {final_count}")

def main():
    try:
        asyncio.run(add_embeddings_simple())
        return 0
    except Exception as e:
        logger.error(f"Script failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
