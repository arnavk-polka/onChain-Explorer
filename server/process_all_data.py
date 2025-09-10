#!/usr/bin/env python3
"""
Script to process all JSON data files in the onchain_data directory
"""

import asyncio
import glob
import os
import sys
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.etl import ETLService
from app.logger import get_logger

logger = get_logger(__name__)

async def process_all_files():
    """Process all JSON files in the data directory"""
    
    # Get all JSON files
    data_dir = Path("data/onchain_data")
    json_files = list(data_dir.glob("*.json"))
    
    if not json_files:
        logger.error("No JSON files found in data/onchain_data/")
        return
    
    logger.info(f"Found {len(json_files)} JSON files to process")
    
    # Initialize ETL service with BGE-M3 (local) provider
    etl = ETLService(batch_size=50, embedding_provider="bge-m3")
    
    total_processed = 0
    total_embeddings = 0
    
    for i, json_file in enumerate(json_files, 1):
        logger.info(f"\n{'='*60}")
        logger.info(f"Processing file {i}/{len(json_files)}: {json_file.name}")
        logger.info(f"{'='*60}")
        
        try:
            # Process the file
            df = etl.load_data([str(json_file)])
            logger.info(f"Loaded {len(df)} records from {json_file.name}")
            
            if len(df) == 0:
                logger.warning(f"No data found in {json_file.name}, skipping")
                continue
            
            # Normalize data
            normalized_data = etl.normalize_data(df)
            logger.info(f"Normalized {len(normalized_data)} records")
            
            # Upsert proposals (async)
            upserted_count = await etl.upsert_proposals(normalized_data)
            logger.info(f"Upserted {upserted_count} proposals")
            
            # Recompute doc_tsv (async)
            await etl.recompute_doc_tsv()
            
            # Compute embeddings (async)
            embeddings_count = await etl.compute_embeddings(df)
            logger.info(f"Computed {embeddings_count} embeddings")
            
            total_processed += upserted_count
            total_embeddings += embeddings_count
            
            logger.info(f"✅ Successfully processed {json_file.name}")
            
        except Exception as e:
            logger.error(f"❌ Error processing {json_file.name}: {e}")
            continue
    
    logger.info(f"\n{'='*60}")
    logger.info(f"PROCESSING COMPLETE")
    logger.info(f"{'='*60}")
    logger.info(f"Total proposals processed: {total_processed}")
    logger.info(f"Total embeddings computed: {total_embeddings}")
    logger.info(f"Files processed: {len(json_files)}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(process_all_files())
