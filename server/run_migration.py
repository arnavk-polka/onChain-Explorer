#!/usr/bin/env python3
"""
Simple script to run database migrations
"""

import asyncio
import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.db import run_migrations

async def main():
    print("Running database migrations...")
    success = await run_migrations()
    if success:
        print("Migrations completed successfully!")
    else:
        print("Migrations failed!")
    return 0 if success else 1

if __name__ == "__main__":
    exit(asyncio.run(main()))
