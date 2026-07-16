"""
Pinecone RAG Service для СФЕРУМ SaaS
Векторная база знаний с изоляцией по тенантам (namespace per tenant)
"""
import os
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "sphera-knowledge-base")

# Инициализация клиента Pinecone
pc = None
index = None


def get_pinecone_client() -> Pinecone:
    global pc
    if pc is None:
        if not PINECONE_API_KEY:
            raise ValueError("PINECONE_API_KEY не задан в .env")
        pc = Pinecone(api_key=PINECONE_API_KEY)
    return pc


def get_index():
    """Получить или создать индекс Pinecone"""
    global index
    if index is None:
        client = get_pinecone_client()
        existing_indexes = [idx.name for idx in client.list_indexes()]
        
        if PINECONE_INDEX_NAME not in existing_indexes:
            # Создаём индекс с размерностью 1536 (OpenAI text-embedding-3-small)
            # или 768 для nomic-embed-text (Ollama)
            client.create_index(
                name=PINECONE_INDEX_NAME,
                dimension=1536,  # Совместимо с OpenAI и большинством моделей
                metric="cosine",
                spec={"serverless": {"cloud": "aws", "region": "us-east-1"}}
            )
            print(f"✅ Pinecone index '{PINECONE_INDEX_NAME}' создан")
        
        index = client.Index(PINECONE_INDEX_NAME)
    return index


def get_tenant_namespace(tenant_id: int) -> str:
    """Namespace = изоляция данных тенанта в векторной БД"""
    return f"tenant_{tenant_id}"


def upsert_documents(tenant_id: int, documents: list[dict]) -> int:
    """
    Загружает документы в Pinecone для конкретного тенанта.
    
    documents: список словарей с полями:
        - id: str — уникальный ID документа
        - values: list[float] — вектор (эмбеддинг)
        - metadata: dict — метаданные (text, source, type, etc.)
    
    Возвращает количество загруженных документов.
    """
    idx = get_index()
    namespace = get_tenant_namespace(tenant_id)
    
    vectors = []
    for doc in documents:
        vectors.append({
            "id": doc["id"],
            "values": doc["values"],
            "metadata": doc.get("metadata", {})
        })
    
    if vectors:
        idx.upsert(vectors=vectors, namespace=namespace)
    
    return len(vectors)


def search_similar(tenant_id: int, query_vector: list[float], top_k: int = 5) -> list[dict]:
    """
    Ищет похожие документы в векторной БД для конкретного тенанта.
    
    Возвращает список топ-K совпадений с метаданными и score.
    """
    idx = get_index()
    namespace = get_tenant_namespace(tenant_id)
    
    results = idx.query(
        vector=query_vector,
        top_k=top_k,
        namespace=namespace,
        include_metadata=True
    )
    
    matches = []
    for match in results.get("matches", []):
        meta = match.get("metadata", {})
        matches.append({
            "id": match["id"],
            "score": match["score"],
            "text": meta.get("text", ""),
            "source": meta.get("source", ""),
            "type": meta.get("type", ""),
            "metadata": meta
        })
    
    return matches


def search_similar_by_text(tenant_id: int, query_text: str, top_k: int = 5) -> list[dict]:
    """
    Удобный поиск в векторной БД по текстовому запросу.
    Автоматически генерирует эмбеддинг вопроса через ai_engine и ищет в namespace тенанта.
    """
    from ..utils.ai_engine import get_embedding
    query_vector = get_embedding(query_text, target_dim=1536)
    return search_similar(tenant_id=tenant_id, query_vector=query_vector, top_k=top_k)


def delete_document_vectors(tenant_id: int, doc_id: str) -> bool:
    """Удалить все векторы конкретного документа из векторной БД тенанта"""
    idx = get_index()
    namespace = get_tenant_namespace(tenant_id)
    try:
        idx.delete(filter={"doc_id": {"$eq": str(doc_id)}}, namespace=namespace)
        return True
    except Exception as e:
        print(f"⚠️ Ошибка удаления векторов по фильтру doc_id {doc_id}: {e}")
        return False


def delete_tenant_data(tenant_id: int) -> bool:
    """Удалить все данные тенанта из векторной БД (при отмене подписки)"""
    idx = get_index()
    namespace = get_tenant_namespace(tenant_id)
    idx.delete(delete_all=True, namespace=namespace)
    return True


def get_index_stats() -> dict:
    """Статистика индекса (для мониторинга / Ops Monitor)"""
    idx = get_index()
    return idx.describe_index_stats()

