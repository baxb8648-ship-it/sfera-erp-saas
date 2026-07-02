"""
API Router для запуска процессов LangGraph Оркестратора.
"""
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..models import User
from .auth import get_current_user
from ..services.langgraph_sales import sales_agent_graph

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/langgraph", tags=["LangGraph Orchestrator"])

class SalesGraphRequest(BaseModel):
    query: str = Field(..., description="Название компании или ИНН для анализа")
    inn: Optional[str] = Field(None, description="Точный ИНН (если известен)")

class SalesGraphResponse(BaseModel):
    status: str
    inn: Optional[str]
    company_data: Dict[str, Any]
    lawyer_report: Optional[str]
    sales_proposal: Optional[str]
    error: Optional[str]

@router.post("/generate-proposal", response_model=SalesGraphResponse)
async def run_sales_graph(
    request: SalesGraphRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Запускает ИИ-цепочку LangGraph:
    1. Поиск компании в ЕГРЮЛ
    2. Скрапинг сайта (BeautifulSoup)
    3. Юрист-аудитор (Ollama)
    4. Сейлз-агент (Ollama -> персонализированное КП)
    """
    try:
        logger.info(f"Запуск LangGraph для: {request.query}")
        
        # Начальное состояние графа
        initial_state = {
            "query": request.query.strip(),
            "inn": request.inn.strip() if request.inn else None
        }
        
        # Исполнение графа
        final_state = sales_agent_graph.invoke(initial_state)
        
        if final_state.get("error"):
            return SalesGraphResponse(
                status="error",
                inn=None,
                company_data={},
                lawyer_report=None,
                sales_proposal=None,
                error=final_state["error"]
            )
            
        return SalesGraphResponse(
            status="success",
            inn=final_state.get("inn"),
            company_data=final_state.get("company_data", {}),
            lawyer_report=final_state.get("lawyer_report"),
            sales_proposal=final_state.get("sales_proposal"),
            error=None
        )
        
    except Exception as e:
        logger.error(f"[LangGraph API] Ошибка при исполнении графа: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка оркестрации: {str(e)}"
        )
