from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..database import get_db
from ..models import ServiceTicket, User
from ..schemas import ServiceTicketCreate, ServiceTicketResponse
from .auth import get_current_user
from ..utils.rbac import require_permission
from ..websocket_manager import manager

router = APIRouter(prefix="/service-tickets", tags=["Service Tickets"])

@router.get("/", response_model=List[ServiceTicketResponse])
def get_service_tickets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), perm = Depends(require_permission("equipment", "read"))):
    tickets = db.query(ServiceTicket).filter(ServiceTicket.tenant_id == current_user.tenant_id).offset(skip).limit(limit).all()
    
    result = []
    for t in tickets:
        t_dict = {col.name: getattr(t, col.name) for col in t.__table__.columns}
        if t.creator:
            t_dict["creator_name"] = t.creator.username
        if t.mechanic:
            t_dict["mechanic_name"] = t.mechanic.username
        if t.equipment:
            t_dict["equipment_name"] = t.equipment.name
        if t.object:
            t_dict["object_name"] = t.object.name
        result.append(t_dict)
    return result

@router.post("/", response_model=ServiceTicketResponse)
def create_service_ticket(ticket: ServiceTicketCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), perm = Depends(require_permission("equipment", "write"))):
    db_ticket = ServiceTicket(
        **ticket.model_dump(),
        tenant_id=current_user.tenant_id,
        creator_id=current_user.id
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    
    background_tasks.add_task(manager.broadcast, {
        "type": "warning",
        "message": f"🔧 Новый вызов механика: {db_ticket.issue_description[:30]}...",
        "refetchKey": "service_tickets"
    })
    
    t_dict = {col.name: getattr(db_ticket, col.name) for col in db_ticket.__table__.columns}
    t_dict["creator_name"] = current_user.username
    if db_ticket.equipment:
        t_dict["equipment_name"] = db_ticket.equipment.name
    if db_ticket.object:
        t_dict["object_name"] = db_ticket.object.name
        
    return t_dict

@router.put("/{ticket_id}/status")
def update_service_ticket_status(ticket_id: int, status: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), perm = Depends(require_permission("equipment", "write"))):
    db_ticket = db.query(ServiceTicket).filter(ServiceTicket.id == ticket_id, ServiceTicket.tenant_id == current_user.tenant_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    db_ticket.status = status
    if status == "closed":
        db_ticket.closed_at = datetime.utcnow()
        
    db.commit()
    
    background_tasks.add_task(manager.broadcast, {
        "type": "info",
        "message": f"🔄 Статус вызова #{db_ticket.id} изменен на '{status}'",
        "refetchKey": "service_tickets"
    })
    
    return {"message": "Status updated successfully"}
