"""
Сервис нарезки документов и загрузки в Pinecone (RAG Ingestion Service) для СФЕРУМ SaaS.
Реализует Этап 2 Фазы 2 RAG:
1. Извлечение текста из файлов различных форматов (.pdf, .docx, .txt, .md, .json, .html)
2. Интеллектуальная нарезка текста на чанки (с перекрытием, сохранением семантики предложений/абзацев)
3. Генерация эмбеддингов через ai_engine.py
4. Загрузка векторов в изолированный namespace тенанта в Pinecone
"""
import os
import re
import logging
from typing import List, Dict, Any, Optional

from ..utils.ai_engine import get_embeddings_batch
from .pinecone_rag import upsert_documents, get_tenant_namespace

logger = logging.getLogger("uvicorn.error")

try:
    from PyPDF2 import PdfReader
    HAS_PYPDF2 = True
except ImportError:
    HAS_PYPDF2 = False

try:
    from docx import Document
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False


def chunk_text(text: str, chunk_size_chars: int = 1000, overlap_chars: int = 150) -> List[Dict[str, Any]]:
    """
    Разбивает текст на семантические фрагменты (чанки) заданного размера с перекрытием.
    Приоритетно разбивает по абзацам и предложениям, избегая разрыва слов на середине.
    
    Args:
        text: Исходный текст документа
        chunk_size_chars: Максимальный размер чанка в символах
        overlap_chars: Размер перекрытия между соседними чанками (для сохранения контекста)
        
    Returns:
        Список словарей формата: [{"chunk_index": i, "text": "...", "char_count": N, "word_count": M}, ...]
    """
    if not text or not text.strip():
        return []
        
    # Очистка текста от лишних множественных пробелов и спецсимволов
    clean_text = re.sub(r'\r\n', '\n', text)
    clean_text = re.sub(r'\n{3,}', '\n\n', clean_text).strip()
    
    if len(clean_text) <= chunk_size_chars:
        return [{
            "chunk_index": 0,
            "text": clean_text,
            "char_count": len(clean_text),
            "word_count": len(clean_text.split())
        }]

    # Разбиваем текст на абзацы (по двойному переносу строки)
    paragraphs = re.split(r'\n\s*\n', clean_text)
    
    chunks = []
    current_chunk_str = ""
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
            
        # Если сам абзац больше максимального размера чанка, разбиваем его по предложениям
        if len(para) > chunk_size_chars:
            sentences = re.split(r'(?<=[.!?])\s+', para)
            for sent in sentences:
                sent = sent.strip()
                if not sent:
                    continue
                
                # Если добавление предложения превышает размер чанка
                if len(current_chunk_str) + len(sent) + 1 > chunk_size_chars:
                    if current_chunk_str:
                        chunks.append(current_chunk_str.strip())
                        # Создаем перекрытие с предыдущим чанком
                        overlap_start = max(0, len(current_chunk_str) - overlap_chars)
                        current_chunk_str = current_chunk_str[overlap_start:].strip() + " " + sent
                    else:
                        # Само предложение больше чанка — жесткое разбиение по словам/символам
                        words = sent.split()
                        sub_chunk = ""
                        for w in words:
                            if len(sub_chunk) + len(w) + 1 > chunk_size_chars:
                                if sub_chunk:
                                    chunks.append(sub_chunk.strip())
                                    overlap_start = max(0, len(sub_chunk) - overlap_chars)
                                    sub_chunk = sub_chunk[overlap_start:].strip() + " " + w
                                else:
                                    chunks.append(w[:chunk_size_chars])
                                    sub_chunk = w[chunk_size_chars:]
                            else:
                                sub_chunk = (sub_chunk + " " + w).strip()
                        if sub_chunk:
                            current_chunk_str = sub_chunk
                else:
                    current_chunk_str = (current_chunk_str + " " + sent).strip() if current_chunk_str else sent
        else:
            # Абзац помещается: проверяем, влезет ли он в текущий чанк
            if len(current_chunk_str) + len(para) + 2 > chunk_size_chars:
                if current_chunk_str:
                    chunks.append(current_chunk_str.strip())
                    overlap_start = max(0, len(current_chunk_str) - overlap_chars)
                    current_chunk_str = current_chunk_str[overlap_start:].strip() + "\n\n" + para
                else:
                    current_chunk_str = para
            else:
                current_chunk_str = (current_chunk_str + "\n\n" + para).strip() if current_chunk_str else para

    if current_chunk_str and (not chunks or chunks[-1] != current_chunk_str.strip()):
        chunks.append(current_chunk_str.strip())

    # Формируем итоговый структурированный список чанков
    structured_chunks = []
    for idx, c_text in enumerate(chunks):
        c_text_clean = c_text.strip()
        if c_text_clean:
            structured_chunks.append({
                "chunk_index": idx,
                "text": c_text_clean,
                "char_count": len(c_text_clean),
                "word_count": len(c_text_clean.split())
            })

    return structured_chunks


def extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    """
    Извлекает текст из бинарных данных файла по его расширению.
    Поддерживает: .pdf, .docx, .doc, .txt, .md, .json, .html, .csv
    """
    ext = os.path.splitext(filename)[1].lower().replace('.', '')
    
    import tempfile
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
        
    try:
        return extract_text_from_file(tmp_path)
    finally:
        if os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


def extract_text_from_file(file_path: str) -> str:
    """
    Извлекает локальный текст из файла на диске в зависимости от расширения.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Файл не найден: {file_path}")
        
    ext = os.path.splitext(file_path)[1].lower().replace('.', '')
    extracted_text = ""
    
    try:
        if ext == 'pdf':
            if HAS_PYPDF2:
                reader = PdfReader(file_path)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        extracted_text += page_text + "\n\n"
            else:
                logger.warning("[document_chunker] PyPDF2 не установлен. Пропуск извлечения из PDF.")
                
        elif ext in ['docx', 'doc']:
            if HAS_DOCX:
                doc = Document(file_path)
                for para in doc.paragraphs:
                    if para.text:
                        extracted_text += para.text + "\n"
            else:
                logger.warning("[document_chunker] python-docx не установлен. Пропуск извлечения из DOCX.")
                
        elif ext in ['txt', 'md', 'json', 'html', 'csv', 'log', 'xml']:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                extracted_text = f.read()
        else:
            # Попытка прочитать как текстовый файл по умолчанию
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                extracted_text = f.read()
                
    except Exception as e:
        logger.error(f"[document_chunker] Ошибка чтения файла {file_path}: {e}")
        raise e
        
    return extracted_text.strip()


def process_and_upsert_document(
    tenant_id: int,
    doc_id: str,
    text: str,
    metadata: Optional[Dict[str, Any]] = None,
    chunk_size_chars: int = 1000,
    overlap_chars: int = 150
) -> Dict[str, Any]:
    """
    Полный конвейер (Pipeline) обработки документа для RAG:
    1. Нарезка текста на чанки (chunk_text)
    2. Генерация векторных эмбеддингов (get_embeddings_batch)
    3. Загрузка векторов с метаданными в Pinecone (upsert_documents в namespace тенанта)
    
    Args:
        tenant_id: ID компании-тенанта
        doc_id: Уникальный идентификатор документа
        text: Текст документа
        metadata: Дополнительные метаданные (название, автор, категория, теги и т.д.)
        chunk_size_chars: Размер чанка в символах
        overlap_chars: Размер перекрытия в символах
        
    Returns:
        Словарь с отчетом об операции: {"status": "success", "chunks_created": N, ...}
    """
    if not text or not text.strip():
        return {
            "status": "error",
            "message": "Пустой текст документа",
            "tenant_id": tenant_id,
            "doc_id": str(doc_id),
            "chunks_created": 0,
            "vectors_upserted": 0
        }

    # 1. Нарезка текста на чанки
    chunks = chunk_text(text, chunk_size_chars=chunk_size_chars, overlap_chars=overlap_chars)
    if not chunks:
        return {
            "status": "warning",
            "message": "Не удалось создать чанки из текста",
            "tenant_id": tenant_id,
            "doc_id": str(doc_id),
            "chunks_created": 0,
            "vectors_upserted": 0
        }

    # 2. Пакетная генерация эмбеддингов
    texts_list = [c["text"] for c in chunks]
    embeddings = get_embeddings_batch(texts_list, target_dim=1536)

    # 3. Подготовка документов для Pinecone
    pinecone_docs = []
    base_meta = metadata or {}
    
    for idx, chunk in enumerate(chunks):
        vector_id = f"{doc_id}#chunk_{idx}"
        chunk_meta = {
            "text": chunk["text"],
            "doc_id": str(doc_id),
            "chunk_index": idx,
            "total_chunks": len(chunks),
            "char_count": chunk["char_count"],
            "word_count": chunk["word_count"],
            "tenant_id": int(tenant_id),
            **base_meta
        }
        pinecone_docs.append({
            "id": vector_id,
            "values": embeddings[idx],
            "metadata": chunk_meta
        })

    # 4. Загрузка в Pinecone
    try:
        upserted_count = upsert_documents(tenant_id=tenant_id, documents=pinecone_docs)
        logger.info(f"[document_chunker] Успешно загружено {upserted_count} чанков для doc_id={doc_id} (tenant={tenant_id})")
        return {
            "status": "success",
            "tenant_id": tenant_id,
            "doc_id": str(doc_id),
            "chunks_created": len(chunks),
            "vectors_upserted": upserted_count
        }
    except Exception as e:
        logger.error(f"[document_chunker] Ошибка upsert в Pinecone: {e}")
        return {
            "status": "error",
            "message": f"Ошибка загрузки в векторную БД: {str(e)}",
            "tenant_id": tenant_id,
            "doc_id": str(doc_id),
            "chunks_created": len(chunks),
            "vectors_upserted": 0
        }


def process_file_and_upsert(
    tenant_id: int,
    doc_id: str,
    file_path: str,
    metadata: Optional[Dict[str, Any]] = None,
    chunk_size_chars: int = 1000,
    overlap_chars: int = 150
) -> Dict[str, Any]:
    """
    Удобный враппер для обработки файла с диска от чтения до загрузки в Pinecone.
    """
    text = extract_text_from_file(file_path)
    base_meta = metadata or {}
    if "source_file" not in base_meta:
        base_meta["source_file"] = os.path.basename(file_path)
        
    return process_and_upsert_document(
        tenant_id=tenant_id,
        doc_id=doc_id,
        text=text,
        metadata=base_meta,
        chunk_size_chars=chunk_size_chars,
        overlap_chars=overlap_chars
    )
