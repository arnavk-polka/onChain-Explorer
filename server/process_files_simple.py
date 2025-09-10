#!/usr/bin/env python3
"""
Simple script to process JSON files one by one using the existing ETL pipeline
"""

import asyncio
import glob
import os
import sys
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.logger import get_logger

logger = get_logger(__name__)

async def process_single_file(file_path: str):
    """Process a single JSON file using the ETL pipeline"""
    try:
        # Import here to avoid issues
        from app.services.etl import ETLService
        
        logger.info(f"Processing: {file_path}")
        
        # Initialize ETL service
        etl = ETLService(batch_size=50, embedding_provider="bge-m3")
        
        # Load and process data
        df = etl.load_data([file_path])
        logger.info(f"Loaded {len(df)} records")
        
        if len(df) == 0:
            logger.warning("No data found, skipping")
            return 0, 0
        
        # Normalize data
        normalized_data = etl.normalize_data(df)
        logger.info(f"Normalized {len(normalized_data)} records")
        
        # Upsert proposals
        upserted_count = await etl.upsert_proposals(normalized_data)
        logger.info(f"Upserted {upserted_count} proposals")
        
        # Recompute doc_tsv
        await etl.recompute_doc_tsv()
        
        # Compute embeddings
        embeddings_count = await etl.compute_embeddings(df)
        logger.info(f"Computed {embeddings_count} embeddings")
        
        logger.info(f"✅ Successfully processed {file_path}")
        return upserted_count, embeddings_count
        
    except Exception as e:
        logger.error(f"❌ Error processing {file_path}: {e}")
        return 0, 0

async def main():
    """Main processing function"""
    # Get all JSON files
    data_dir = Path("data/onchain_data")
    json_files = list(data_dir.glob("*.json"))
    
    if not json_files:
        logger.error("No JSON files found in data/onchain_data/")
        return
    
    logger.info(f"Found {len(json_files)} JSON files to process")
    
    total_processed = 0
    total_embeddings = 0
    
    for i, json_file in enumerate(json_files, 1):
        logger.info(f"\n{'='*60}")
        logger.info(f"Processing file {i}/{len(json_files)}: {json_file.name}")
        logger.info(f"{'='*60}")
        
        processed, embeddings = await process_single_file(str(json_file))
        total_processed += processed or 0
        total_embeddings += embeddings or 0
    
    logger.info(f"\n{'='*60}")
    logger.info(f"PROCESSING COMPLETE")
    logger.info(f"{'='*60}")
    logger.info(f"Total proposals processed: {total_processed}")
    logger.info(f"Total embeddings computed: {total_embeddings}")
    logger.info(f"Files processed: {len(json_files)}")

if __name__ == "__main__":
    asyncio.run(main())
