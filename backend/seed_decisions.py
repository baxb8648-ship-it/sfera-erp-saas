"""
Начальное заполнение Decision Log решениями из истории проекта.
Запустить один раз: venv\Scripts\python.exe seed_decisions.py
"""
import sqlite3

DB = r'l:\SPHERA\АКЗ\АКЗ\АКЗ\backend\sphera_crm.db'

DECISIONS = [
    {
        "title": "Туннелирование: VPS+SSH vs Cloudflare Tunnel",
        "decision": "Собственный VPS (Timeweb Cloud) + SSH reverse tunnel через Paramiko",
        "rationale": "Cloudflare Tunnel блокируется РКН и конфликтует с LetAI VPN (умная маршрутизация перехватывает TCP). VPS с российским IP работает стабильно без ограничений.",
        "alternatives": "Cloudflare Tunnel — заблокирован РКН; ngrok — платный и нестабилен в РФ",
        "tags": "infrastructure,networking,tunnel",
        "source": "seed",
    },
    {
        "title": "STT: Groq Whisper API vs локальный faster-whisper",
        "decision": "Groq Whisper API (whisper-large-v3-turbo) через REST",
        "rationale": "Groq бесплатен в текущих лимитах, не требует GPU, быстрее локального варианта в 3x. Локальный faster-whisper без GPU обрабатывает голосовое 30+ сек — неприемлемо для UX.",
        "alternatives": "faster-whisper локально — нет GPU, медленно; OpenAI Whisper — платный",
        "tags": "ai,stt,infrastructure,cost",
        "source": "seed",
    },
    {
        "title": "LLM: Ollama локально vs облачные API",
        "decision": "Основной LLM — Ollama qwen2:7b локально. Groq — только для STT.",
        "rationale": "Данные компании (договоры, сметы, переписка) не должны уходить в облако. Ollama работает без интернета. qwen2:7b хорошо понимает русский язык при 8 GB RAM.",
        "alternatives": "OpenAI GPT-4 — дорого и данные уходят в облако; Groq LLM — нестабильные бесплатные лимиты",
        "tags": "ai,llm,privacy,infrastructure",
        "source": "seed",
    },
    {
        "title": "База данных: SQLite vs PostgreSQL",
        "decision": "SQLite с WAL-режимом и автоматическими бэкапами на текущем этапе",
        "rationale": "Один клиент, нет параллельных записей с нескольких серверов. SQLite проще в деплое (один файл), WAL даёт достаточный параллелизм. PostgreSQL понадобится при переходе на SaaS с несколькими тенантами.",
        "alternatives": "PostgreSQL — избыточно для одного клиента, требует отдельного сервера",
        "tags": "database,infrastructure,architecture",
        "source": "seed",
    },
    {
        "title": "Фронтенд: React+Vite+HashRouter vs Next.js",
        "decision": "React + TypeScript + Vite с HashRouter для деплоя на shared hosting",
        "rationale": "Деплой на Hostiman (shared hosting, FTP) без Node.js на сервере. HashRouter позволяет отдавать SPA без серверных редиректов. Vite даёт быструю сборку.",
        "alternatives": "Next.js — требует Node.js на сервере; Vue — меньше экосистема для нужного функционала",
        "tags": "frontend,architecture,deployment",
        "source": "seed",
    },
    {
        "title": "Мониторинг инфраструктуры: Ops Monitor Agent (APScheduler)",
        "decision": "Ops Monitor реализован как набор APScheduler-задач без LangGraph и PostgreSQL",
        "rationale": "Мониторинг — исключение из общего правила (агенты не выполняют действий с последствиями): он только информирует. Не требует ни LangGraph, ни векторной БД. 6 scheduled-проверок с алертом в Telegram закрывают все blind spot операционной работы.",
        "alternatives": "Prometheus+Grafana — избыточно для одного инстанса; LangGraph Monitor — сложнее без PostgreSQL",
        "tags": "infrastructure,monitoring,meta-module,architecture",
        "source": "seed",
    },
]

conn = sqlite3.connect(DB)
cur = conn.cursor()

cur.execute('''
    CREATE TABLE IF NOT EXISTS decision_log (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        title        TEXT NOT NULL,
        decision     TEXT NOT NULL,
        rationale    TEXT NOT NULL,
        alternatives TEXT,
        tags         TEXT,
        source       TEXT DEFAULT 'seed',
        created_at   TEXT DEFAULT (datetime('now'))
    )
''')

inserted = 0
for d in DECISIONS:
    cur.execute('SELECT id FROM decision_log WHERE title = ?', (d['title'],))
    if not cur.fetchone():
        cur.execute(
            'INSERT INTO decision_log (title, decision, rationale, alternatives, tags, source) VALUES (?,?,?,?,?,?)',
            (d['title'], d['decision'], d['rationale'], d['alternatives'], d['tags'], d['source'])
        )
        print(f'  + {d["title"]}')
        inserted += 1
    else:
        print(f'  ~ (уже есть) {d["title"]}')

conn.commit()
cur.execute('SELECT COUNT(*) FROM decision_log')
total = cur.fetchone()[0]
conn.close()
print(f'\nГотово. Добавлено: {inserted}. Всего записей: {total}')
