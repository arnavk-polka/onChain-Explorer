from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from typing import Dict, Any, Optional, List
from datetime import datetime
from app.db import test_connection
from app.langgraph.graph import graph, GraphState, router as graph_router, sql_agent, retrieval, composer
from app.logger import get_logger
from app.services.retrieval import get_retrieval_service, SearchFilters, SearchResult

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


class SearchFiltersRequest(BaseModel):
    """Search filters with proper validation"""
    network: Optional[str] = None
    proposal_type: Optional[str] = None
    status: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class SearchRequest(BaseModel):
    query: str
    filters: Optional[SearchFiltersRequest] = None
    top_k: int = 10
    use_rerank: bool = True
    
    @field_validator('query')
    @classmethod
    def validate_query(cls, v):
        if not v or not v.strip():
            raise ValueError('Query cannot be empty')
        return v.strip()
    
    @field_validator('top_k')
    @classmethod
    def validate_top_k(cls, v):
        if v <= 0:
            raise ValueError('top_k must be positive')
        return v


class SearchResponse(BaseModel):
    results: List[SearchResult]
    total_found: int
    query: str
    filters_applied: Optional[Dict[str, Any]] = None


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


@router.post("/search", response_model=SearchResponse)
async def search_proposals(request: SearchRequest):
    """Search proposals using hybrid search with RRF fusion and optional reranking"""
    try:
        logger.info(f"Search request: query='{request.query}', filters={request.filters}, top_k={request.top_k}")
        
        # Convert validated filters to SearchFilters
        search_filters = None
        if request.filters:
            # Map frontend proposal types to database types
            proposal_type_mapping = {
                'treasury': 'TreasuryProposal',
                'democracy': 'DemocracyProposal', 
                'referendum': 'Referendum',
                'bounty': 'Bounty',
                'tip': 'Tip',
                'council': 'CouncilMotion',
                'tech': 'TechCommitteeProposal'
            }
            
            mapped_proposal_type = request.filters.proposal_type
            if request.filters.proposal_type and request.filters.proposal_type.lower() in proposal_type_mapping:
                mapped_proposal_type = proposal_type_mapping[request.filters.proposal_type.lower()]
            
            search_filters = SearchFilters(
                network=request.filters.network,
                proposal_type=mapped_proposal_type,
                status=request.filters.status,
                min_amount=request.filters.min_amount,
                max_amount=request.filters.max_amount,
                start_date=request.filters.start_date,
                end_date=request.filters.end_date
            )
        
        # Get retrieval service and search
        retrieval_service = get_retrieval_service()
        results = await retrieval_service.search_proposals(
            query=request.query,
            filters=search_filters,
            top_k=request.top_k,
            use_rerank=request.use_rerank
        )
        
        logger.info(f"Search completed: found {len(results)} results")
        
        return SearchResponse(
            results=results,
            total_found=len(results),
            query=request.query,
            filters_applied=request.filters.model_dump() if request.filters else None
        )
        
    except Exception as e:
        logger.error(f"Search failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )
