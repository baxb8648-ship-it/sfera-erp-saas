from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import io
from datetime import datetime

from ..database import get_db
from ..models import Client, FinanceTransaction, Tender, User
from .auth import get_current_user
from ..services.excel_generator import (
    generate_clients_excel,
    generate_finance_excel,
    generate_tenders_excel
)

router = APIRouter(prefix="/export", tags=["Export"])

@router.get("/clients")
def export_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        clients = db.query(Client).all()
        excel_data = generate_clients_excel(clients)
        
        filename = f"clients_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        return StreamingResponse(
            io.BytesIO(excel_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка экспорта клиентов: {str(e)}")

@router.get("/finance")
def export_finance(
    cash_register: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        query = db.query(FinanceTransaction)
        if cash_register:
            query = query.filter(FinanceTransaction.cash_register == cash_register)
        
        transactions = query.order_by(FinanceTransaction.date.desc()).all()
        excel_data = generate_finance_excel(transactions)
        
        filename = f"finance_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        return StreamingResponse(
            io.BytesIO(excel_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка экспорта финансов: {str(e)}")

@router.get("/tenders")
def export_tenders(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        query = db.query(Tender)
        if status:
            query = query.filter(Tender.status == status)
        
        tenders = query.order_by(Tender.submission_deadline.asc()).all()
        excel_data = generate_tenders_excel(tenders)
        
        filename = f"tenders_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        return StreamingResponse(
            io.BytesIO(excel_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка экспорта тендеров: {str(e)}")
