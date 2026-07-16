from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import HoldingGroup, HoldingMember, HoldingTransfer, User
from .auth import get_current_user

router = APIRouter(prefix="/holding", tags=["Holding / Multi-Company Group"])


class MemberCreate(BaseModel):
    holding_id: int
    company_name: str
    inn: Optional[str] = None
    role: str = "subsidiary"
    share_percent: float = 100.0
    revenue_ytd: float = 0.0
    net_profit_ytd: float = 0.0
    employees_count: int = 0


class TransferCreate(BaseModel):
    holding_id: int
    from_company: str
    to_company: str
    amount: float
    transfer_type: str = "loan"
    description: Optional[str] = None


@router.get("/groups/")
def get_holding_groups(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Получить группы компаний (Холдинги) текущего пользователя.
    Если холдинга ещё нет, создаём демонстрационную группу «Группа компаний СФЕРУМ» с 3 юрлицами.
    """
    groups = db.query(HoldingGroup).filter(HoldingGroup.owner_user_id == current_user.id).all()
    if not groups:
        default_group = HoldingGroup(
            name="Группа компаний СФЕРУМ (SaaS ERP Холдинг)",
            owner_user_id=current_user.id,
            description="Консолидированное управление группой предприятий СФЕРУМ"
        )
        db.add(default_group)
        db.commit()
        db.refresh(default_group)

        m1 = HoldingMember(
            holding_id=default_group.id,
            company_name="ООО «СФЕРУМ СТРОЙ И ИНЖИНИРИНГ»",
            inn="7701234567",
            role="parent",
            share_percent=100.0,
            revenue_ytd=142500000.0,
            net_profit_ytd=38400000.0,
            employees_count=84
        )
        m2 = HoldingMember(
            holding_id=default_group.id,
            company_name="ООО «СФЕРУМ ТЕХНОЛОДЖИ» (IT & SaaS)",
            inn="7702345678",
            role="subsidiary",
            share_percent=100.0,
            revenue_ytd=64800000.0,
            net_profit_ytd=24100000.0,
            employees_count=36
        )
        m3 = HoldingMember(
            holding_id=default_group.id,
            company_name="ООО «СФЕРУМ АГРО ПРОМ»",
            inn="5603456789",
            role="branch",
            share_percent=80.0,
            revenue_ytd=91200000.0,
            net_profit_ytd=18500000.0,
            employees_count=62
        )
        db.add_all([m1, m2, m3])

        t1 = HoldingTransfer(
            holding_id=default_group.id,
            from_company="ООО «СФЕРУМ ТЕХНОЛОДЖИ» (IT & SaaS)",
            to_company="ООО «СФЕРУМ СТРОЙ И ИНЖИНИРИНГ»",
            amount=5000000.0,
            transfer_type="loan",
            description="Внутригрупповой заём на закупку строительных лесов"
        )
        t2 = HoldingTransfer(
            holding_id=default_group.id,
            from_company="ООО «СФЕРУМ АГРО ПРОМ»",
            to_company="ООО «СФЕРУМ СТРОЙ И ИНЖИНИРИНГ»",
            amount=2400000.0,
            transfer_type="dividend",
            description="Распределение дивидендов за 2 квартал"
        )
        db.add_all([t1, t2])
        db.commit()
        db.refresh(default_group)
        groups = [default_group]

    result = []
    for g in groups:
        members = db.query(HoldingMember).filter(HoldingMember.holding_id == g.id).all()
        transfers = db.query(HoldingTransfer).filter(HoldingTransfer.holding_id == g.id).order_by(HoldingTransfer.id.desc()).all()
        
        total_rev = sum(m.revenue_ytd for m in members)
        total_profit = sum(m.net_profit_ytd for m in members)
        total_emp = sum(m.employees_count for m in members)

        result.append({
            "id": g.id,
            "name": g.name,
            "description": g.description,
            "created_at": g.created_at.isoformat() if g.created_at else None,
            "summary": {
                "total_revenue_ytd": total_rev,
                "total_net_profit_ytd": total_profit,
                "total_employees": total_emp,
                "companies_count": len(members)
            },
            "members": [
                {
                    "id": m.id,
                    "company_name": m.company_name,
                    "inn": m.inn,
                    "role": m.role,
                    "share_percent": m.share_percent,
                    "revenue_ytd": m.revenue_ytd,
                    "net_profit_ytd": m.net_profit_ytd,
                    "employees_count": m.employees_count,
                    "is_active": m.is_active
                } for m in members
            ],
            "transfers": [
                {
                    "id": t.id,
                    "from_company": t.from_company,
                    "to_company": t.to_company,
                    "amount": t.amount,
                    "transfer_type": t.transfer_type,
                    "description": t.description,
                    "status": t.status,
                    "created_at": t.created_at.isoformat() if t.created_at else None
                } for t in transfers
            ]
        })
    return result


@router.post("/members/")
def add_holding_member(item: MemberCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    member = HoldingMember(
        holding_id=item.holding_id,
        company_name=item.company_name,
        inn=item.inn,
        role=item.role,
        share_percent=item.share_percent,
        revenue_ytd=item.revenue_ytd,
        net_profit_ytd=item.net_profit_ytd,
        employees_count=item.employees_count,
        is_active=True
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.post("/transfers/")
def create_holding_transfer(item: TransferCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    transfer = HoldingTransfer(
        holding_id=item.holding_id,
        from_company=item.from_company,
        to_company=item.to_company,
        amount=item.amount,
        transfer_type=item.transfer_type,
        description=item.description,
        status="completed"
    )
    db.add(transfer)
    db.commit()
    db.refresh(transfer)
    return transfer
