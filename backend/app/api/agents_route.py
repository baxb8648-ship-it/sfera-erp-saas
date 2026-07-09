"""
agents_route.py — Модуль монетизации ИИ-агентов СФЕРА ERP

Реализует:
- GET  /agents/catalog              — Публичный каталог всех агентов
- GET  /agents/my                   — Подписки и usage текущего тенанта
- POST /agents/use/{slug}           — Засечь использование агента (с проверкой лимита)
- GET  /agents/usage/stats          — Статистика usage за текущий месяц
- POST /agents/subscribe/{slug}     — Подписаться на платного агента (superadmin)
- POST /agents/seed                 — Засеять каталог агентов и FREE-подписки (superadmin)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from typing import List, Optional

from ..database import get_db, current_tenant_id
from ..models import (
    AgentCatalog, TenantAgentSubscription, AgentUsageLog,
    User, Tenant
)
from .auth import get_current_user

router = APIRouter(prefix="/agents", tags=["AI Agents Monetization"])


# ─── Каталог агентов (seed-данные) ────────────────────────────────────────────
AGENT_SEED = [
    # ── БЕСПЛАТНЫЕ (3 агента) ──────────────────────────────────────────────────
    {
        "slug": "crm_assistant",
        "name": "CRM-Ассистент",
        "description": "Отвечает на вопросы по вашей базе клиентов, объектов и задач. "
                       "Ищет нужные сделки, контакты и договоры за секунды.",
        "icon": "🤖",
        "category": "crm",
        "tier": "free",
        "price_monthly": None,
        "monthly_limit": 50,
        "sort_order": 1,
    },
    {
        "slug": "tender_scout",
        "name": "Тендерный Скаут",
        "description": "Автоматически ищет подходящие тендеры по вашему профилю ОКВЭД "
                       "и бюджетному диапазону. Ежедневный дайджест в Telegram.",
        "icon": "🎯",
        "category": "sales",
        "tier": "free",
        "price_monthly": None,
        "monthly_limit": 20,
        "sort_order": 2,
    },
    {
        "slug": "gap_detector",
        "name": "Детектор Разрывов",
        "description": "Анализирует движение денежных средств и предупреждает о кассовых "
                       "разрывах за 7-14 дней до их возникновения.",
        "icon": "📊",
        "category": "finance",
        "tier": "free",
        "price_monthly": None,
        "monthly_limit": 4,
        "sort_order": 3,
    },
    # ── ПЛАТНЫЕ АГЕНТЫ ─────────────────────────────────────────────────────────
    {
        "slug": "pm_copilot",
        "name": "PM Copilot",
        "description": "Ежедневный аудит хода проекта. Читает задачи, анализирует "
                       "отставание и отправляет сводный отчёт прорабу в Telegram.",
        "icon": "🧠",
        "category": "construction",
        "tier": "paid",
        "price_monthly": 1990.0,
        "monthly_limit": None,
        "sort_order": 4,
    },
    {
        "slug": "sales_orchestrator",
        "name": "Sales Orchestrator",
        "description": "Мульти-агентный LangGraph-оркестратор B2B продаж. Автодозвон, "
                       "квалификация лидов, генерация КП и контроль воронки.",
        "icon": "📈",
        "category": "sales",
        "tier": "paid",
        "price_monthly": 2490.0,
        "monthly_limit": None,
        "sort_order": 5,
    },
    {
        "slug": "rag_assistant",
        "name": "RAG-Ассистент",
        "description": "Обучение на документах вашей компании (регламенты, ГОСТы, договоры). "
                       "Отвечает ТОЛЬКО по вашей базе знаний. Pinecone namespace изолирован.",
        "icon": "📚",
        "category": "crm",
        "tier": "paid",
        "price_monthly": 990.0,
        "monthly_limit": None,
        "sort_order": 6,
    },
    {
        "slug": "fleet_monitor",
        "name": "Fleet Monitor",
        "description": "ГЛОНАСС-аналитика спецтехники. Контроль моточасов, предупреждение "
                       "о плановом ТО, автоматический журнал путевых листов.",
        "icon": "🚁",
        "category": "logistics",
        "tier": "paid",
        "price_monthly": 1490.0,
        "monthly_limit": None,
        "sort_order": 7,
    },
    {
        "slug": "telegram_hitl",
        "name": "Telegram HITL",
        "description": "Human-in-the-Loop: агент присылает критические решения в Telegram "
                       "для утверждения руководителем перед исполнением.",
        "icon": "💬",
        "category": "crm",
        "tier": "paid",
        "price_monthly": 990.0,
        "monthly_limit": None,
        "sort_order": 8,
    },
    {
        "slug": "estimate_ai",
        "name": "Estimate AI",
        "description": "ИИ-сметчик строительных работ. Автоматическая генерация КС-2/КС-3, "
                       "расчёт расхода материалов по чертежам и нормам ГЭСН.",
        "icon": "🏗️",
        "category": "construction",
        "tier": "paid",
        "price_monthly": 1990.0,
        "monthly_limit": None,
        "sort_order": 9,
    },
    {
        "slug": "agro_scout",
        "name": "Agro Scout",
        "description": "Мониторинг посевных площадей, прогноз урожайности по спутниковым "
                       "данным NDVI, напоминания о сроках агрохимических обработок.",
        "icon": "🌾",
        "category": "agro",
        "tier": "paid",
        "price_monthly": 1490.0,
        "monthly_limit": None,
        "sort_order": 10,
    },
]


def _get_current_month_usage(db: Session, tenant_id: int, agent_id: int) -> int:
    """Считает количество успешных вызовов агента за текущий месяц."""
    now = datetime.utcnow()
    count = db.query(func.count(AgentUsageLog.id)).filter(
        AgentUsageLog.tenant_id == tenant_id,
        AgentUsageLog.agent_id == agent_id,
        AgentUsageLog.status == "success",
        extract("year", AgentUsageLog.called_at) == now.year,
        extract("month", AgentUsageLog.called_at) == now.month,
    ).scalar()
    return count or 0


# ─── Публичный каталог ─────────────────────────────────────────────────────────
@router.get("/catalog")
def get_agent_catalog(db: Session = Depends(get_db)):
    """Возвращает каталог всех агентов (публичный, без авторизации)."""
    agents = db.query(AgentCatalog).filter(
        AgentCatalog.is_active == True
    ).order_by(AgentCatalog.sort_order).all()

    return [
        {
            "id": a.id,
            "slug": a.slug,
            "name": a.name,
            "description": a.description,
            "icon": a.icon,
            "category": a.category,
            "tier": a.tier,
            "price_monthly": a.price_monthly,
            "monthly_limit": a.monthly_limit,
        }
        for a in agents
    ]


# ─── Мои агенты (с usage-статистикой) ─────────────────────────────────────────
@router.get("/my")
def get_my_agents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Возвращает агентов, на которые подписан текущий тенант,
    с информацией об использовании за текущий месяц.
    """
    tenant_id = current_tenant_id.get()
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Не удалось определить ID компании.")

    # Все активные подписки тенанта
    subs = db.query(TenantAgentSubscription).filter(
        TenantAgentSubscription.tenant_id == tenant_id,
        TenantAgentSubscription.status == "active",
    ).all()

    result = []
    for sub in subs:
        agent = sub.agent
        if not agent or not agent.is_active:
            continue

        usage_count = _get_current_month_usage(db, tenant_id, agent.id)
        limit = agent.monthly_limit
        limit_pct = round((usage_count / limit) * 100) if limit else None

        result.append({
            "subscription_id": sub.id,
            "agent_id": agent.id,
            "slug": agent.slug,
            "name": agent.name,
            "description": agent.description,
            "icon": agent.icon,
            "category": agent.category,
            "tier": agent.tier,
            "price_monthly": agent.price_monthly,
            "monthly_limit": limit,
            "usage_this_month": usage_count,
            "limit_pct": limit_pct,
            "is_near_limit": limit_pct is not None and limit_pct >= 80,
            "is_at_limit": limit_pct is not None and limit_pct >= 100,
            "expires_at": sub.expires_at,
            "status": sub.status,
        })

    # Также добавим доступные платные агенты (для апсейл-блока)
    subscribed_agent_ids = {s.agent_id for s in subs}
    all_agents = db.query(AgentCatalog).filter(
        AgentCatalog.is_active == True,
        AgentCatalog.tier == "paid",
        ~AgentCatalog.id.in_(subscribed_agent_ids)
    ).order_by(AgentCatalog.sort_order).all()

    upsell = [
        {
            "agent_id": a.id,
            "slug": a.slug,
            "name": a.name,
            "description": a.description,
            "icon": a.icon,
            "category": a.category,
            "tier": a.tier,
            "price_monthly": a.price_monthly,
        }
        for a in all_agents
    ]

    return {
        "subscribed": result,
        "upsell": upsell,
        "tenant_id": tenant_id,
    }


# ─── Засечь использование агента ──────────────────────────────────────────────
@router.post("/use/{slug}")
def use_agent(
    slug: str,
    input_tokens: Optional[int] = None,
    output_tokens: Optional[int] = None,
    latency_ms: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Засечь один вызов агента.
    Проверяет:
    1. Агент существует и активен
    2. У тенанта есть активная подписка
    3. Месячный лимит не превышен (для free-агентов)
    Возвращает: {allowed: bool, remaining: int|null, usage: int}
    """
    tenant_id = current_tenant_id.get()
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Не удалось определить ID компании.")

    # 1. Ищем агента в каталоге
    agent = db.query(AgentCatalog).filter(
        AgentCatalog.slug == slug,
        AgentCatalog.is_active == True
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail=f"Агент '{slug}' не найден в каталоге.")

    # 2. Проверяем наличие подписки
    sub = db.query(TenantAgentSubscription).filter(
        TenantAgentSubscription.tenant_id == tenant_id,
        TenantAgentSubscription.agent_id == agent.id,
        TenantAgentSubscription.status == "active",
    ).first()

    if not sub:
        # Логируем отклонение
        log = AgentUsageLog(
            tenant_id=tenant_id,
            user_id=current_user.id,
            agent_id=agent.id,
            agent_slug=slug,
            status="limit_exceeded",
            error_detail="no_subscription",
        )
        db.add(log)
        db.commit()
        raise HTTPException(
            status_code=402,
            detail={
                "code": "no_subscription",
                "message": f"У вашей компании нет активной подписки на агента '{agent.name}'.",
                "agent_slug": slug,
                "agent_name": agent.name,
                "price_monthly": agent.price_monthly,
            }
        )

    # 3. Проверяем лимит (только для free-агентов с monthly_limit)
    usage_count = _get_current_month_usage(db, tenant_id, agent.id)
    if agent.monthly_limit is not None and usage_count >= agent.monthly_limit:
        log = AgentUsageLog(
            tenant_id=tenant_id,
            user_id=current_user.id,
            agent_id=agent.id,
            agent_slug=slug,
            status="limit_exceeded",
            error_detail=f"monthly_limit_reached: {usage_count}/{agent.monthly_limit}",
        )
        db.add(log)
        db.commit()
        raise HTTPException(
            status_code=429,
            detail={
                "code": "monthly_limit_reached",
                "message": f"Исчерпан месячный лимит агента '{agent.name}' ({agent.monthly_limit} запросов/мес). "
                           "Обновите тариф для безлимитного доступа.",
                "agent_slug": slug,
                "agent_name": agent.name,
                "limit": agent.monthly_limit,
                "usage": usage_count,
            }
        )

    # 4. Логируем успешный вызов
    log = AgentUsageLog(
        tenant_id=tenant_id,
        user_id=current_user.id,
        agent_id=agent.id,
        agent_slug=slug,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        latency_ms=latency_ms,
        status="success",
    )
    db.add(log)
    db.commit()

    new_usage = usage_count + 1
    remaining = (agent.monthly_limit - new_usage) if agent.monthly_limit else None

    return {
        "allowed": True,
        "agent_slug": slug,
        "agent_name": agent.name,
        "usage_this_month": new_usage,
        "monthly_limit": agent.monthly_limit,
        "remaining": remaining,
        "is_near_limit": remaining is not None and remaining <= max(1, (agent.monthly_limit or 1) * 0.2),
    }


# ─── Статистика usage текущего тенанта ────────────────────────────────────────
@router.get("/usage/stats")
def get_usage_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Статистика вызовов агентов за текущий месяц по тенанту."""
    tenant_id = current_tenant_id.get()
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Не удалось определить ID компании.")

    now = datetime.utcnow()
    rows = db.query(
        AgentUsageLog.agent_slug,
        func.count(AgentUsageLog.id).label("total"),
        func.sum(
            (AgentUsageLog.status == "success").cast(db.bind.dialect.name == "postgresql" and "int" or "integer")
        ).label("success"),
    ).filter(
        AgentUsageLog.tenant_id == tenant_id,
        extract("year", AgentUsageLog.called_at) == now.year,
        extract("month", AgentUsageLog.called_at) == now.month,
    ).group_by(AgentUsageLog.agent_slug).all()

    # Упрощённая версия для SQLite-совместимости
    stats_raw = db.query(
        AgentUsageLog.agent_slug,
        AgentUsageLog.status,
        func.count(AgentUsageLog.id).label("cnt"),
    ).filter(
        AgentUsageLog.tenant_id == tenant_id,
        extract("year", AgentUsageLog.called_at) == now.year,
        extract("month", AgentUsageLog.called_at) == now.month,
    ).group_by(AgentUsageLog.agent_slug, AgentUsageLog.status).all()

    # Агрегируем в dict
    stats: dict = {}
    for slug, stat_status, cnt in stats_raw:
        if slug not in stats:
            stats[slug] = {"total": 0, "success": 0, "errors": 0, "limit_exceeded": 0}
        stats[slug]["total"] += cnt
        if stat_status == "success":
            stats[slug]["success"] += cnt
        elif stat_status == "limit_exceeded":
            stats[slug]["limit_exceeded"] += cnt
        else:
            stats[slug]["errors"] += cnt

    return {
        "month": now.strftime("%Y-%m"),
        "stats": stats,
    }


# ─── Подписать тенанта на агента (superadmin) ─────────────────────────────────
@router.post("/subscribe/{slug}", status_code=201)
def subscribe_tenant_to_agent(
    slug: str,
    target_tenant_id: int,
    months: int = 1,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Подписать компанию на платного агента (только superadmin)."""
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Только superadmin может управлять подписками агентов.")

    agent = db.query(AgentCatalog).filter(AgentCatalog.slug == slug).first()
    if not agent:
        raise HTTPException(status_code=404, detail=f"Агент '{slug}' не найден.")

    # Проверяем, нет ли уже активной подписки
    existing = db.query(TenantAgentSubscription).filter(
        TenantAgentSubscription.tenant_id == target_tenant_id,
        TenantAgentSubscription.agent_id == agent.id,
        TenantAgentSubscription.status == "active",
    ).first()

    if existing:
        # Продлеваем
        if existing.expires_at and existing.expires_at > datetime.utcnow():
            existing.expires_at += timedelta(days=30 * months)
        else:
            existing.expires_at = datetime.utcnow() + timedelta(days=30 * months)
        db.commit()
        return {"message": f"Подписка продлена на {months} мес.", "subscription_id": existing.id}

    expires_at = datetime.utcnow() + timedelta(days=30 * months) if agent.tier == "paid" else None
    sub = TenantAgentSubscription(
        tenant_id=target_tenant_id,
        agent_id=agent.id,
        status="active",
        expires_at=expires_at,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {
        "message": f"Компания #{target_tenant_id} подписана на агента '{agent.name}' на {months} мес.",
        "subscription_id": sub.id,
    }


# ─── Seed: инициализировать каталог + FREE-подписки ───────────────────────────
@router.post("/seed", status_code=200)
def seed_agent_catalog(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Засеивает каталог агентов из AGENT_SEED.
    Для каждого тенанта создаёт FREE-подписки на 3 бесплатных агента.
    Идемпотентен — повторный вызов не создаёт дублей.
    Только для superadmin.
    """
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Только superadmin.")

    created_agents = 0
    updated_agents = 0

    for seed in AGENT_SEED:
        existing = db.query(AgentCatalog).filter(AgentCatalog.slug == seed["slug"]).first()
        if existing:
            # Обновляем данные
            for key, val in seed.items():
                setattr(existing, key, val)
            updated_agents += 1
        else:
            agent = AgentCatalog(**seed)
            db.add(agent)
            created_agents += 1

    db.commit()

    # Загружаем FREE-агентов для раздачи подписок
    free_agents = db.query(AgentCatalog).filter(AgentCatalog.tier == "free").all()
    all_tenants = db.query(Tenant).filter(Tenant.is_active == True).all()

    subscriptions_created = 0
    for tenant in all_tenants:
        for agent in free_agents:
            exists = db.query(TenantAgentSubscription).filter(
                TenantAgentSubscription.tenant_id == tenant.id,
                TenantAgentSubscription.agent_id == agent.id,
            ).first()
            if not exists:
                sub = TenantAgentSubscription(
                    tenant_id=tenant.id,
                    agent_id=agent.id,
                    status="active",
                    expires_at=None,  # Бесплатно и бессрочно
                )
                db.add(sub)
                subscriptions_created += 1

    db.commit()

    return {
        "message": "Seed выполнен успешно.",
        "agents_created": created_agents,
        "agents_updated": updated_agents,
        "free_subscriptions_created": subscriptions_created,
        "tenants_processed": len(all_tenants),
    }
