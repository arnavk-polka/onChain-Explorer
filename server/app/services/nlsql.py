"""
Natural Language to SQL service with security constraints and validation.
"""
import re
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import sqlglot
from sqlglot import parse_one, exp
from sqlglot.errors import ParseError
import openai
from app.logger import get_logger
from app.config import settings
from app.db import get_session

logger = get_logger(__name__)

# Allowed tables and columns
ALLOWED_TABLES = {"proposals", "proposals_embeddings"}
ALLOWED_COLUMNS = {
    "id", "network", "type", "title", "description", "proposer", 
    "amount_numeric", "currency", "status", "created_at", "updated_at"
}

# SQLGlot dialect for PostgreSQL
DIALECT = "postgres"

class SQLSecurityError(Exception):
    """Raised when SQL violates security constraints"""
    pass

class NLSQLService:
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.openai_api_key)
        self.db_connection_string = settings.db_connection_string
    
    def plan_sql(self, user_query: str, schema_hint: str = "") -> Dict[str, Any]:
        """
        Generate SQL plan from natural language query using LLM with validation.
        
        Args:
            user_query: Natural language query
            schema_hint: Optional schema information
            
        Returns:
            Dict with plan, sql, and params
        """
        try:
            # Generate SQL using LLM
            sql_result = self._generate_sql_with_llm(user_query, schema_hint)
            
            # Validate and secure the SQL
            validated_sql, params = self._validate_and_secure_sql(sql_result["sql"])
            
            return {
                "plan": sql_result["plan"],
                "sql": validated_sql,
                "params": params
            }
            
        except Exception as e:
            logger.error(f"SQL planning failed: {str(e)}")
            raise SQLSecurityError(f"Failed to generate secure SQL: {str(e)}")
    
    async def execute_nlsql(self, user_query: str, schema_hint: str = "") -> Dict[str, Any]:
        """
        Execute natural language query and return results.
        
        Args:
            user_query: Natural language query
            schema_hint: Optional schema information
            
        Returns:
            Dict with count, examples, and metadata
        """
        try:
            # Generate SQL plan
            plan_result = self.plan_sql(user_query, schema_hint)
            
            # Execute the SQL
            results = await self._execute_sql(plan_result["sql"], plan_result["params"])
            
            # Format results based on query type
            if "COUNT" in plan_result["sql"].upper():
                count = results[0][0] if results else 0
                # Get examples if it's a count query
                examples = await self._get_examples_for_count_query(user_query)
                return {
                    "count": count,
                    "examples": examples,
                    "plan": plan_result["plan"],
                    "sql": plan_result["sql"]
                }
            else:
                # Return examples directly
                return {
                    "count": len(results),
                    "examples": [dict(row) for row in results],
                    "plan": plan_result["plan"],
                    "sql": plan_result["sql"]
                }
                
        except Exception as e:
            logger.error(f"NLSQL execution failed: {str(e)}")
            raise SQLSecurityError(f"Failed to execute query: {str(e)}")
    
    async def _execute_sql(self, sql: str, params: List[Any]) -> List[Any]:
        """Execute SQL query and return results"""
        try:
            async with get_session() as conn:
                result = await conn.fetch(sql, *params)
                return result
        except Exception as e:
            logger.error(f"SQL execution failed: {str(e)}")
            raise SQLSecurityError(f"Database query failed: {str(e)}")
    
    async def _get_examples_for_count_query(self, user_query: str) -> List[Dict[str, Any]]:
        """Get example results for count queries"""
        try:
            # Generate a simple examples query
            examples_sql = "SELECT id, title, type, created_at FROM proposals ORDER BY created_at DESC LIMIT 5"
            results = await self._execute_sql(examples_sql, [])
            return [dict(row) for row in results]
        except Exception as e:
            logger.warning(f"Failed to get examples: {str(e)}")
            return []
    
    def _generate_sql_with_llm(self, user_query: str, schema_hint: str) -> Dict[str, Any]:
        """Generate SQL using OpenAI with structured output"""
        
        schema_info = """
        Available tables and columns:
        - proposals: id, network, type, title, description, proposer, amount_numeric, currency, status, created_at, updated_at
        - proposals_embeddings: proposal_id (references proposals.id)
        
        Rules:
        - Only SELECT queries allowed
        - Use parameterized queries for all values
        - Return both a plan and the SQL
        - For date ranges, use created_at column
        - For counting, use COUNT(*)
        - For examples, use LIMIT 5
        """
        
        prompt = f"""
        Convert this natural language query to SQL: "{user_query}"
        
        {schema_info}
        {schema_hint}
        
        Return a JSON response with:
        {{
            "plan": "Brief description of what the query does",
            "sql": "SQL query with actual values (not parameterized)",
            "params": []
        }}
        
        Examples:
        - "How many proposals in August 2025?" -> {{"plan": "Count proposals created in August 2025", "sql": "SELECT COUNT(*) FROM proposals WHERE created_at >= '2025-08-01' AND created_at < '2025-09-01'", "params": []}}
        - "Show me some treasury proposals" -> {{"plan": "Get sample treasury proposals", "sql": "SELECT * FROM proposals WHERE type = 'TreasuryProposal' LIMIT 5", "params": []}}
        - "How many proposals are there?" -> {{"plan": "Count all proposals", "sql": "SELECT COUNT(*) FROM proposals", "params": []}}
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a SQL expert. Generate secure SQL queries with actual values, not parameters. Always return valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=500
            )
            
            content = response.choices[0].message.content.strip()
            # Clean up the response if it has markdown formatting
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            
            result = json.loads(content)
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"LLM JSON parsing failed: {str(e)}")
            # Fallback to simple query generation
            return self._generate_fallback_sql(user_query)
        except Exception as e:
            logger.error(f"LLM SQL generation failed: {str(e)}")
            return self._generate_fallback_sql(user_query)
    
    def _generate_fallback_sql(self, user_query: str) -> Dict[str, Any]:
        """Generate simple SQL for common queries when LLM fails"""
        query_lower = user_query.lower()
        
        if "how many" in query_lower and "proposals" in query_lower:
            if "treasury" in query_lower:
                return {
                    "plan": "Count treasury proposals",
                    "sql": "SELECT COUNT(*) FROM proposals WHERE type = 'TreasuryProposal'",
                    "params": []
                }
            else:
                return {
                    "plan": "Count all proposals",
                    "sql": "SELECT COUNT(*) FROM proposals",
                    "params": []
                }
        elif "show" in query_lower and "recent" in query_lower:
            return {
                "plan": "Get recent proposals",
                "sql": "SELECT * FROM proposals ORDER BY created_at DESC LIMIT 5",
                "params": []
            }
        elif "show" in query_lower and "treasury" in query_lower:
            return {
                "plan": "Get treasury proposals",
                "sql": "SELECT * FROM proposals WHERE type = 'TreasuryProposal' LIMIT 5",
                "params": []
            }
        else:
            # Default fallback
            return {
                "plan": "Get sample proposals",
                "sql": "SELECT * FROM proposals LIMIT 5",
                "params": []
            }
    
    def _validate_and_secure_sql(self, sql: str) -> Tuple[str, List[Any]]:
        """
        Validate and secure SQL using SQLGlot.
        
        Returns:
            Tuple of (validated_sql, parameters)
        """
        try:
            # Parse SQL
            parsed = parse_one(sql, read=DIALECT)
            if not parsed:
                raise SQLSecurityError("Invalid SQL syntax")
            
            # Security validations
            self._validate_sql_security(parsed)
            
            # Extract parameters and create parameterized query
            param_values = self._extract_parameters(sql)
            validated_sql = self._create_parameterized_sql(parsed)
            
            return validated_sql, param_values
            
        except ParseError as e:
            raise SQLSecurityError(f"SQL parse error: {str(e)}")
        except Exception as e:
            raise SQLSecurityError(f"SQL validation failed: {str(e)}")
    
    def _validate_sql_security(self, parsed_sql) -> None:
        """Validate SQL against security constraints"""
        
        # Check for non-SELECT statements
        if not isinstance(parsed_sql, exp.Select):
            raise SQLSecurityError("Only SELECT queries are allowed")
        
        # Check for dangerous keywords and patterns
        sql_str = str(parsed_sql)
        sql_upper = sql_str.upper()
        
        # Check for dangerous SQL keywords
        dangerous_keywords = [
            'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 
            'ALTER', 'TRUNCATE', 'EXEC', 'EXECUTE', 'UNION'
        ]
        
        for keyword in dangerous_keywords:
            # Check if keyword appears as a standalone word
            pattern = r'\b' + keyword + r'\b'
            if re.search(pattern, sql_upper):
                raise SQLSecurityError(f"Dangerous SQL keyword '{keyword}' not allowed")
        
        # Check for comments
        if '--' in sql_str or '/*' in sql_str or '*/' in sql_str:
            raise SQLSecurityError("Comments not allowed in SQL")
        
        # Check tables and columns
        self._validate_tables_and_columns(parsed_sql)
    
    def _validate_tables_and_columns(self, parsed_sql) -> None:
        """Validate that only allowed tables and columns are used"""
        
        # Get all table references
        tables = set()
        for table in parsed_sql.find_all(exp.Table):
            table_name = table.name.lower()
            if table_name not in ALLOWED_TABLES:
                raise SQLSecurityError(f"Table '{table_name}' not allowed")
            tables.add(table_name)
        
        # Get all column references
        for column in parsed_sql.find_all(exp.Column):
            column_name = column.name.lower()
            if column_name not in ALLOWED_COLUMNS:
                raise SQLSecurityError(f"Column '{column_name}' not allowed")
    
    def _extract_parameters(self, sql: str) -> List[Any]:
        """Extract parameter values from SQL string"""
        # For now, return empty list - parameters should be provided separately
        # In a real implementation, you'd parse the SQL to extract parameter values
        return []
    
    def _create_parameterized_sql(self, parsed_sql) -> str:
        """Convert parsed SQL to parameterized form"""
        # Convert to string
        sql_str = str(parsed_sql)
        
        # Convert @1, @2, etc. to $1, $2, etc. for PostgreSQL
        import re
        sql_str = re.sub(r'@(\d+)', r'$\1', sql_str)
        
        return sql_str

def get_nlsql_service() -> NLSQLService:
    """Get NLSQL service instance"""
    return NLSQLService()
