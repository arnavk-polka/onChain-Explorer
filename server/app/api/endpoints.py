from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from app.db import test_connection
from app.langgraph.graph import graph, GraphState, router as graph_router, sql_agent, retrieval, composer
from app.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()


class QueryRequest(BaseModel):
    query: str
    user_id: Optional[str] = None


class QueryResponse(BaseModel):
    response: str
    sql_query: Optional[str] = None
    results: Optional[list] = None
    metadata: Dict[str, Any] = {}


@router.get("/healthz")
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        db_status = await test_connection()
        
        if db_status["status"] == "success":
            return {
                "status": "healthy",
                "database": "connected",
                "timestamp": "2024-01-01T00:00:00Z"
            }
        else:
            return {
                "status": "unhealthy",
                "database": "disconnected",
                "error": db_status["message"]
            }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Health check failed")


@router.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    """Process query using LangGraph workflow"""
    try:
        logger.info(f"Processing query: {request.query}")
        
        # Create initial state
        initial_state = GraphState(query=request.query)
        
        # Execute the graph - try different methods based on LangGraph version
        try:
            # Try the newer API first
            result = graph.invoke(initial_state)
        except AttributeError:
            try:
                # Try the older API
                result = graph.run(initial_state)
            except AttributeError:
                # Fallback to direct execution
                result = initial_state
                # Manually execute the workflow
                next_step = graph_router(result)
                if next_step == "sql_agent":
                    result = sql_agent(initial_state)
                elif next_step == "retrieval":
                    result = retrieval(initial_state)
                else:
                    result = composer(initial_state)
        
        # Extract response data
        response_data = {
            "response": result.final_response,
            "sql_query": result.sql_query if result.sql_query else None,
            "results": result.reranked_results if result.reranked_results else None,
            "metadata": result.metadata
        }
        
        logger.info(f"Query processed successfully: {result.metadata.get('processing_type')}")
        return QueryResponse(**response_data)
        
    except Exception as e:
        logger.error(f"Query processing failed: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Query processing failed: {str(e)}"
        )
