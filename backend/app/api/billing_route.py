import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

from ..database import get_db, current_tenant_id
from ..models import Invoice, User, Tenant
from .auth import get_current_user
from ..services.billing import create_tenant_invoice

router = APIRouter(prefix="/billing", tags=["SaaS Billing & Invoices"])


@router.get("/status")
def get_billing_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Возвращает информацию о подписке текущей компании"""
    tenant_id = current_tenant_id.get()
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Не удалось определить ID компании.")
        
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Компания не найдена.")
        
    return {
        "id": tenant.id,
        "name": tenant.name,
        "inn": tenant.inn,
        "sphere": tenant.sphere,
        "subscription_ends_at": tenant.subscription_ends_at,
        "is_active": tenant.is_active
    }



@router.get("/invoices", response_model=List[dict])
def list_invoices(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Возвращает историю выставленных счетов для текущей компании (изолированно по tenant_id)"""
    tenant_id = current_tenant_id.get()
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Не удалось определить ID компании.")
        
    invoices = db.query(Invoice).filter(Invoice.tenant_id == tenant_id).order_by(Invoice.created_at.desc()).all()
    
    return [
        {
            "id": inv.id,
            "tenant_id": inv.tenant_id,
            "amount": inv.amount,
            "status": inv.status,
            "pdf_path": inv.pdf_path,
            "created_at": inv.created_at
        }
        for inv in invoices
    ]


@router.post("/invoices", status_code=201)
def create_new_invoice(amount: float = 5000.0, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Выписать новый B2B счет для текущей компании"""
    tenant_id = current_tenant_id.get()
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Не удалось определить ID компании.")
        
    try:
        invoice = create_tenant_invoice(db, tenant_id, amount)
        return {
            "message": "Счет успешно выставлен",
            "invoice_id": invoice.id,
            "amount": invoice.amount,
            "pdf_path": invoice.pdf_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка генерации счета: {e}")


@router.get("/invoices/{invoice_id}/download")
def download_invoice(invoice_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Скачать файл счета в формате Docx"""
    tenant_id = current_tenant_id.get()
    
    # Ищем счет. Так как RLS активен, поиск вернет счет только если он принадлежит текущему tenant_id
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Счет не найден или у вас нет прав на его скачивание.")
        
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    file_path = os.path.abspath(os.path.join(backend_dir, invoice.pdf_path))
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Файл счета не найден на сервере.")
        
    filename = f"Invoice_{invoice_id:05d}.docx"
    return FileResponse(
        path=file_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=filename
    )


@router.post("/invoices/{invoice_id}/pay")
def pay_invoice(invoice_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Отметить счет как оплаченный и продлить подписку компании на 30 дней (доступно только админу)"""
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Только администратор платформы может изменять статус оплаты.")
        
    # Временно сбрасываем RLS, так как оплату счета подтверждает глобальный админ платформы
    current_tenant_id.set(None)
    
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Счет не найден.")
        
    if invoice.status == "paid":
        return {"message": "Счет уже оплачен.", "invoice_id": invoice_id}
        
    # Обновляем статус счета
    invoice.status = "paid"
    
    # Продлеваем подписку компании
    tenant = db.query(Tenant).filter(Tenant.id == invoice.tenant_id).first()
    if tenant:
        now = datetime.utcnow()
        if not tenant.subscription_ends_at or tenant.subscription_ends_at < now:
            tenant.subscription_ends_at = now + timedelta(days=30)
        else:
            tenant.subscription_ends_at += timedelta(days=30)
            
        tenant.is_active = True
        
    db.commit()
    return {"message": f"Счет #{invoice_id} успешно оплачен. Подписка компании продлена.", "invoice_id": invoice_id}
