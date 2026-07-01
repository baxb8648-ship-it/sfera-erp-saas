from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import AuditLog, User
from ..schemas import AuditLogResponseSchema
from .auth import get_current_user

router = APIRouter(prefix="/audit", tags=["Audit Logs"])

@router.get("/logs", response_model=List[AuditLogResponseSchema])
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    object_type: Optional[str] = None,
    action: Optional[str] = None,
    username: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only allow admin or manager roles to read audit logs
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")
        
    query = db.query(AuditLog)
    
    if object_type:
        query = query.filter(AuditLog.object_type == object_type)
    if action:
        query = query.filter(AuditLog.action == action)
    if username:
        query = query.filter(AuditLog.username.like(f"%{username}%"))
        
    # Order by newest first
    logs = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    return logs
