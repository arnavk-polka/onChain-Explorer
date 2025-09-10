#!/usr/bin/env python3
"""
Test runner for retrieval service tests
"""

import subprocess
import sys
import os
from pathlib import Path

def run_tests():
    """Run all retrieval service tests"""
    
    # Change to server directory
    server_dir = Path(__file__).parent
    os.chdir(server_dir)
    
    # Test files to run
    test_files = [
        "tests/test_retrieval.py",
        "tests/test_search_endpoint.py"
    ]
    
    print("Running retrieval service tests...")
    print("=" * 50)
    
    for test_file in test_files:
        print(f"\nRunning {test_file}...")
        print("-" * 30)
        
        try:
            result = subprocess.run([
                sys.executable, "-m", "pytest", 
                test_file, 
                "-v", 
                "--tb=short"
            ], capture_output=True, text=True)
            
            print(result.stdout)
            if result.stderr:
                print("STDERR:", result.stderr)
            
            if result.returncode != 0:
                print(f"❌ Tests in {test_file} failed")
            else:
                print(f"✅ Tests in {test_file} passed")
                
        except Exception as e:
            print(f"❌ Error running {test_file}: {e}")
    
    print("\n" + "=" * 50)
    print("Test run completed!")

if __name__ == "__main__":
    run_tests()

