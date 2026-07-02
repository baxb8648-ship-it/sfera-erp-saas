"""
RAG API-роутер (/ai) для СФЕРА ERP SaaS.
Реализует Этап 3 Фазы 2 RAG:
1. POST /ai/ask — Вопрос → поиск чанков в Pinecone → генерация ответа через Ollama (Qwen) / OpenAI с возвратом цитат (sources).
2. POST /ai/index-text — Добавление текстовых заметок / инструкций в базу знаний тенанта.
3. POST /ai/index-file — Загрузка файла (.pdf, .docx, .txt, .md) и автоматическая индексация в Pinecone.
4. DELETE /ai/document/{doc_id} — Удаление всех чанков документа из базы знаний тенанта.
5. GET /ai/stats — Получение статистики векторного индекса.
"""
import os
import uuid
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from .auth import get_current_user
from ..services.pinecone_rag import (
    search_similar_by_text,
    delete_document_vectors,
    get_index_stats
)
from ..services.document_chunker import (
    process_and_upsert_document,
    extract_text_from_bytes
)
from ..utils.ai_engine import generate_rag_answer, MODEL_NAME

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/ai", tags=["AI & RAG"])


# --- Pydantic Schemas ---

class AskRequest(BaseModel):
    query: str = Field(..., description="Вопрос пользователя к базе знаний", example="Какая толщина покрытия для антикоррозийной защиты?")
    top_k: int = Field(5, description="Количество релевантных чанков для извлечения", ge=1, le=20)
    filter: Optional[Dict[str, Any]] = Field(None, description="Дополнительный фильтр по метаданным в Pinecone (например, по категории или doc_id)")


class SourceChunk(BaseModel):
    id: str
    score: float
    text: str
    source: Optional[str] = None
    doc_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class AskResponse(BaseModel):
    answer: str
    sources: List[SourceChunk]
    model: str
    tenant_id: int
    query: str


class IndexTextRequest(BaseModel):
    text: str = Field(..., description="Текст для добавления в базу знаний")
    title: str = Field(..., description="Название или тема документа/заметки")
    category: Optional[str] = Field("general", description="Категория (например: price, hr, tech, legal)")
    doc_id: Optional[str] = Field(None, description="Пользовательский ID документа (если не указан, сгенерируется автоматически)")


class IndexResponse(BaseModel):
    status: str
    tenant_id: int
    doc_id: str
    chunks_created: int
    vectors_upserted: int
    message: Optional[str] = None


# --- Endpoints ---

@router.post("/ask", response_model=AskResponse)
async def ask_ai(
    request: AskRequest,
    current_user: User = Depends(get_current_user)
):
    """
    RAG-эндпоинт для интеллектуального ответа на вопросы сотрудников:
    1. Проверяет активность компании (SaaS RLS).
    2. Выполняет семантический поиск по вопросу в Pinecone (namespace тенанта).
    3. Отправляет вопрос и релевантные чанки в локальную LLM (Qwen через Ollama).
    4. Возвращает ответ вместе со ссылками на источники (citations).
    """
    tenant_id = current_user.tenant_id or 1
    
    if not request.query or not request.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Запрос (query) не может быть пустым"
        )
        
    try:
        # 1. Поиск в Pinecone
        matches = search_similar_by_text(
            tenant_id=tenant_id,
            query_text=request.query.strip(),
            top_k=request.top_k
        )
        
        # 2. Формирование ответа через Qwen / Ollama
        answer = generate_rag_answer(
            query=request.query.strip(),
            context_chunks=matches
        )
        
        # 3. Подготовка цитат/источников
        sources = []
        for m in matches:
            meta = m.get("metadata", {})
            sources.append(SourceChunk(
                id=m.get("id", ""),
                score=m.get("score", 0.0),
                text=m.get("text", ""),
                source=meta.get("source") or meta.get("source_file") or meta.get("title") or "База знаний",
                doc_id=meta.get("doc_id"),
                metadata=meta
            ))
            
        return AskResponse(
            answer=answer,
            sources=sources,
            model=MODEL_NAME,
            tenant_id=tenant_id,
            query=request.query.strip()
        )
        
    except Exception as e:
        logger.error(f"[ai_rag_route] Ошибка при выполнении RAG-запроса: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка обработки AI-запроса: {str(e)}"
        )


@router.post("/index-text", response_model=IndexResponse)
async def index_text(
    request: IndexTextRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Индексация текстовой заметки / инструкции в базу знаний тенанта.
    """
    tenant_id = current_user.tenant_id or 1
    doc_id = request.doc_id or f"doc_{uuid.uuid4().hex[:8]}"
    
    metadata = {
        "title": request.title,
        "category": request.category,
        "author_id": current_user.id,
        "author_name": current_user.username,
        "source": request.title
    }
    
    res = process_and_upsert_document(
        tenant_id=tenant_id,
        doc_id=doc_id,
        text=request.text,
        metadata=metadata
    )
    
    if res["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=res.get("message", "Ошибка при индексации текста")
        )
        
    return IndexResponse(**res)


@router.post("/index-file", response_model=IndexResponse)
async def index_file(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    category: Optional[str] = Form("general"),
    doc_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    """
    Загрузка файла (PDF, DOCX, TXT, MD, HTML) и автоматическая нарезка и загрузка в Pinecone.
    """
    tenant_id = current_user.tenant_id or 1
    target_doc_id = doc_id or f"file_{uuid.uuid4().hex[:8]}"
    file_title = title or file.filename or "Загруженный документ"
    
    try:
        content = await file.read()
        extracted_text = extract_text_from_bytes(content, filename=file.filename or "doc.txt")
        
        if not extracted_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Не удалось извлечь текст из загруженного файла. Возможно, файл пустой или формат не поддерживается."
            )
            
        metadata = {
            "title": file_title,
            "category": category,
            "source_file": file.filename,
            "source": file.filename,
            "author_id": current_user.id,
            "author_name": current_user.username
        }
        
        res = process_and_upsert_document(
            tenant_id=tenant_id,
            doc_id=target_doc_id,
            text=extracted_text,
            metadata=metadata
        )
        
        if res["status"] == "error":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=res.get("message", "Ошибка загрузки векторов в Pinecone")
            )
            
        return IndexResponse(**res)
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"[ai_rag_route] Ошибка индексации файла {file.filename}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка обработки файла: {str(e)}"
        )


@router.delete("/document/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Удаление всех чанков и векторов конкретного документа из базы знаний тенанта.
    """
    tenant_id = current_user.tenant_id or 1
    success = delete_document_vectors(tenant_id=tenant_id, doc_id=doc_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не удалось удалить документ {doc_id} из Pinecone"
        )
        
    return {"status": "success", "message": f"Документ {doc_id} успешно удален из базы знаний", "tenant_id": tenant_id}


@router.get("/stats")
async def get_rag_stats(current_user: User = Depends(get_current_user)):
    """
    Статистика базы знаний тенанта в Pinecone.
    """
    try:
        stats = get_index_stats()
        tenant_namespace = f"tenant_{current_user.tenant_id or 1}"
        ns_stats = stats.get("namespaces", {}).get(tenant_namespace, {})
        
        return {
            "total_vector_count": stats.get("total_vector_count", 0),
            "tenant_namespace": tenant_namespace,
            "tenant_vector_count": ns_stats.get("vector_count", 0),
            "dimension": stats.get("dimension", 1536),
            "index_fullness": stats.get("index_fullness", 0.0)
        }
    except Exception as e:
        logger.error(f"[ai_rag_route] Ошибка получения статистики индекса: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не удалось получить статистику векторной БД: {str(e)}"
        )
