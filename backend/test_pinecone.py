"""
Тест подключения к Pinecone
Запуск: python test_pinecone.py
"""
import sys
import os

# Добавляем backend в path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

api_key = os.getenv("PINECONE_API_KEY")
index_name = os.getenv("PINECONE_INDEX_NAME", "sphera-knowledge-base")

print(f"🔑 API Key: {api_key[:20]}...{api_key[-5:] if api_key else 'NOT SET'}")
print(f"📦 Index name: {index_name}")
print()

try:
    from pinecone import Pinecone
    
    pc = Pinecone(api_key=api_key)
    print("✅ Pinecone клиент инициализирован")
    
    # Список доступных индексов
    indexes = pc.list_indexes()
    print(f"📋 Существующие индексы: {[idx.name for idx in indexes]}")
    
    if index_name not in [idx.name for idx in indexes]:
        print(f"\n🚀 Создаём индекс '{index_name}'...")
        pc.create_index(
            name=index_name,
            dimension=1536,
            metric="cosine",
            spec={"serverless": {"cloud": "aws", "region": "us-east-1"}}
        )
        print(f"✅ Индекс '{index_name}' создан!")
    else:
        print(f"✅ Индекс '{index_name}' уже существует")
    
    idx = pc.Index(index_name)
    stats = idx.describe_index_stats()
    print(f"\n📊 Статистика индекса:")
    print(f"   Всего векторов: {stats.get('total_vector_count', 0)}")
    print(f"   Размерность: {stats.get('dimension', 'N/A')}")
    print(f"   Namespaces: {list(stats.get('namespaces', {}).keys())}")
    
    print("\n🎉 PINECONE ПОДКЛЮЧЁН И ГОТОВ К РАБОТЕ!")

except ImportError as e:
    print(f"❌ Ошибка: pinecone не установлен — {e}")
    print("   Запустите: python -m pip install pinecone")
except Exception as e:
    print(f"❌ Ошибка подключения: {e}")
    sys.exit(1)
