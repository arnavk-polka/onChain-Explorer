#!/usr/bin/env python3
"""
Example usage of the ETL service
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.etl import ETLService
from app.logger import get_logger

logger = get_logger(__name__)

async def example_etl_usage():
    """Example of how to use the ETL service"""
    
    # Example 1: Process specific JSON files
    logger.info("Example 1: Processing specific JSON files")
    
    # Create ETL service with OpenAI embeddings
    etl_service = ETLService(
        embedding_provider="openai",  # or "bge-m3" for local embeddings
        batch_size=50
    )
    
    # Example file paths (replace with actual files)
    example_files = [
        "data/onchain_data/polkadot_DemocracyProposal_20241203_123456.json",
        "data/onchain_data/kusama_TreasuryProposal_20241203_123456.json"
    ]
    
    # Check if files exist
    existing_files = [f for f in example_files if Path(f).exists()]
    
    if existing_files:
        logger.info(f"Processing {len(existing_files)} existing files")
        await etl_service.process_files(existing_files)
    else:
        logger.info("No example files found, creating sample data...")
        
        # Create sample data for demonstration
        sample_data = [
            {
                "id": "sample_1",
                "network": "polkadot",
                "type": "DemocracyProposal",
                "title": "Sample Proposal 1",
                "description": "This is a sample proposal for testing the ETL service",
                "proposer": "sample_address_1",
                "amount": "1000.5",
                "currency": "DOT",
                "status": "pending",
                "created_at": "2024-01-01T00:00:00Z"
            },
            {
                "id": "sample_2", 
                "network": "kusama",
                "type": "TreasuryProposal",
                "title": "Sample Treasury Proposal",
                "description": "This is a sample treasury proposal for testing",
                "proposer": "sample_address_2",
                "amount": "500.0",
                "currency": "KSM",
                "status": "approved",
                "created_at": "2024-01-02T00:00:00Z"
            }
        ]
        
        # Save sample data to JSON file
        import json
        sample_file = "sample_data.json"
        with open(sample_file, 'w') as f:
            json.dump(sample_data, f, indent=2)
        
        logger.info(f"Created sample data file: {sample_file}")
        await etl_service.process_files([sample_file])
        
        # Clean up sample file
        os.remove(sample_file)
    
    logger.info("ETL example completed")

def main():
    """Run the example"""
    try:
        asyncio.run(example_etl_usage())
        logger.info("Example completed successfully")
        return 0
    except Exception as e:
        logger.error(f"Example failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
