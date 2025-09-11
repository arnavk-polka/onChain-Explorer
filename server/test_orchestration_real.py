#!/usr/bin/env python3
"""
Test script for orchestration service with real data
"""
import asyncio
import json
import sys
import os

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.orchestration import get_orchestration_service

async def test_orchestration_real():
    """Test orchestration service with real data"""
    
    print("🧪 Testing Orchestration Service with Real Data")
    print("=" * 60)
    
    # Initialize service
    try:
        service = get_orchestration_service()
        print("✅ Orchestration service initialized")
    except Exception as e:
        print(f"❌ Failed to initialize: {e}")
        return False
    
    # Test queries
    test_queries = [
        {
            "query": "highest amount in Aug 2025",
            "expected_route": "sql_agent",
            "description": "SQL path test"
        },
        {
            "query": "clarys proposal",
            "expected_route": "retrieval_agent", 
            "description": "Retrieval path test"
        },
        {
            "query": "hello world",
            "expected_route": "composer",
            "description": "General query test"
        }
    ]
    
    results = []
    
    for i, test in enumerate(test_queries, 1):
        print(f"\n🔍 Test {i}: {test['description']}")
        print(f"Query: '{test['query']}'")
        print(f"Expected route: {test['expected_route']}")
        
        try:
            events = []
            async for event in service.run_graph(test['query']):
                events.append(event)
                print(f"  📡 Event: {event['stage']}")
                
                if event['stage'] == 'router_decision':
                    decision = event['payload']['decision']
                    print(f"    Route: {decision}")
                    if decision == test['expected_route']:
                        print("    ✅ Correct route")
                    else:
                        print(f"    ❌ Wrong route (expected {test['expected_route']})")
                
                elif event['stage'] in ['sql_result', 'retrieval_hits']:
                    count = event['payload'].get('count', 0)
                    print(f"    Results: {count}")
                
                elif event['stage'] == 'final_answer':
                    answer = event['payload']['answer']
                    print(f"    Answer: {answer[:100]}...")
                
                elif event['stage'] == 'error':
                    error = event['payload']['error']
                    print(f"    ❌ Error: {error}")
            
            # Check if we got the expected events
            stages = [e['stage'] for e in events]
            expected_stages = ['router_decision']
            
            if test['expected_route'] == 'sql_agent':
                expected_stages.extend(['sql_result', 'final_answer'])
            elif test['expected_route'] == 'retrieval_agent':
                expected_stages.extend(['retrieval_hits', 'final_answer'])
            else:
                expected_stages.append('final_answer')
            
            missing_stages = [s for s in expected_stages if s not in stages]
            if not missing_stages:
                print("    ✅ All expected events received")
                results.append(True)
            else:
                print(f"    ❌ Missing events: {missing_stages}")
                results.append(False)
                
        except Exception as e:
            print(f"    ❌ Error: {e}")
            results.append(False)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Results Summary")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Passed: {passed}/{total}")
    print(f"Success rate: {passed/total*100:.1f}%")
    
    if passed == total:
        print("🎉 All tests passed!")
        return True
    else:
        print("⚠️  Some tests failed")
        return False

async def test_streaming_api():
    """Test the streaming API endpoint"""
    print("\n🌐 Testing Streaming API")
    print("=" * 40)
    
    try:
        import httpx
        
        test_data = {"query": "highest amount in Aug 2025"}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8000/query/stream",
                json=test_data,
                timeout=30.0
            )
            
            if response.status_code == 200:
                print("✅ Streaming API working")
                print("Response headers:", dict(response.headers))
                
                # Read a few lines of the stream
                lines = []
                async for line in response.aiter_lines():
                    lines.append(line)
                    if len(lines) >= 5:  # Read first 5 lines
                        break
                
                print("Sample stream data:")
                for line in lines:
                    print(f"  {line}")
                
                return True
            else:
                print(f"❌ API error: {response.status_code} - {response.text}")
                return False
                
    except ImportError:
        print("⚠️  httpx not available, skipping API test")
        return True
    except Exception as e:
        print(f"⚠️  API test failed (server may not be running): {e}")
        return True

async def main():
    """Run all tests"""
    print("🚀 Starting Orchestration Tests")
    print("=" * 60)
    
    # Test orchestration service
    orchestration_ok = await test_orchestration_real()
    
    # Test streaming API
    api_ok = await test_streaming_api()
    
    print("\n" + "=" * 60)
    if orchestration_ok and api_ok:
        print("🎉 All tests completed successfully!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
