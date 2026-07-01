from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import FinanceTransaction, User
from ..schemas import FinanceCreate, FinanceResponse
from .auth import get_current_user
from ..websocket_manager import manager

router = APIRouter(prefix="/finance", tags=["Finance"])

@router.post("/", response_model=FinanceResponse)
def create_transaction(transaction: FinanceCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_trans = FinanceTransaction(**transaction.model_dump())
    db.add(db_trans)
    db.commit()
    db.refresh(db_trans)
    
    from ..services.audit import log_audit_action
    log_audit_action(
        db,
        current_user,
        "создание",
        "Транзакция",
        db_trans.id,
        f"{'Доход' if db_trans.transaction_type == 'income' else 'Расход'} на {db_trans.amount:,.2f} ₽",
        changes={"amount": {"old": 0.0, "new": db_trans.amount}, "category": {"old": "—", "new": db_trans.category}}
    )

    
    tr_type = "Поступление" if db_trans.transaction_type == "income" else "Расход"
    tr_color = "success" if db_trans.transaction_type == "income" else "warning"
    background_tasks.add_task(manager.broadcast, {
        "type": tr_color,
        "message": f"💰 Финансы: Зарегистрирован {tr_type.lower()} на сумму {db_trans.amount:,.2f} ₽ (Категория: {db_trans.category or '—'})",
        "refetchKey": "finance"
    })
    return db_trans

@router.get("/", response_model=List[FinanceResponse])
def get_transactions(cash_register: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(FinanceTransaction)
    if cash_register:
        query = query.filter(FinanceTransaction.cash_register == cash_register)
    return query.order_by(FinanceTransaction.date.desc()).offset(skip).limit(limit).all()

@router.delete("/{trans_id}")
def delete_transaction(trans_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_trans = db.query(FinanceTransaction).filter(FinanceTransaction.id == trans_id).first()
    if not db_trans:
        raise HTTPException(status_code=404, detail="Transaction not found")
    amount = db_trans.amount
    tr_type = "доход" if db_trans.transaction_type == "income" else "расход"
    trans_id_val = db_trans.id
    db.delete(db_trans)
    db.commit()
    
    from ..services.audit import log_audit_action
    log_audit_action(
        db,
        current_user,
        "удаление",
        "Транзакция",
        trans_id_val,
        f"{'Доход' if tr_type == 'доход' else 'Расход'} на {amount:,.2f} ₽",
        changes={"amount": {"old": amount, "new": 0.0}}
    )

    background_tasks.add_task(manager.broadcast, {
        "type": "warning",
        "message": f"🗑️ Удалена транзакция ({tr_type}) на сумму {amount:,.2f} ₽",
        "refetchKey": "finance"
    })
    return {"message": "Transaction deleted successfully"}

