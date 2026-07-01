# 🚀 СФЕРА ERP SaaS — README

## О проекте

Коммерческая мультитенантная B2B CRM/ERP платформа, созданная как продолжение
внутренней системы ООО ЛЕОНИКА.

**Стек:** FastAPI + React (TypeScript, Vite) + Neon PostgreSQL + Pinecone RAG + Ollama AI

## Локальный запуск

### Backend (порт 8001)
```bash
cd backend
# Активировать venv
.\venv\Scripts\activate        # Windows
source venv/bin/activate       # Linux/Mac

# Запустить сервер
uvicorn app.main:app --reload --port 8001
```

### Frontend (порт 5173)
```bash
npm install
npm run dev
```

## Переменные окружения

Скопируй `.env.example` в `backend/.env` и заполни значения:

```
SECRET_KEY=<random-secret>
DATABASE_URL=postgresql://...@neon.tech/neondb?sslmode=require
PINECONE_API_KEY=pcsk_...
GROQ_API_KEY=gsk_...
OBLAKO_CRM_BOT_TOKEN=...
API_FNS_KEY=...
```

## Архитектура

- **Мультитенантность:** Row-Level Security через SQLAlchemy ContextVar
- **RAG:** Pinecone (namespace per tenant) + Ollama qwen2:7b
- **Биллинг:** B2B счета в Word Docx, ИНН-регистрация через api-fns.ru
- **AI:** Voice-to-Lead (Groq Whisper), тендерный парсер, ОКВЭД-парсер

## Структура

```
backend/app/
├── api/          ← FastAPI роуты
├── services/     ← Pinecone RAG, Billing, AI
├── parsers/      ← Тендерные площадки
├── models.py     ← SQLAlchemy модели с tenant_id
└── database.py   ← RLS фильтр
src/
├── crm/          ← CRM-страницы
└── pages/        ← Лендинг, Auth
```
