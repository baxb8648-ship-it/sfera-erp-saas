import json
from datetime import datetime
from sqlalchemy.orm import Session
from ..models import AuditLog, User
from ..websocket_manager import manager

# Fields we exclude from diff comparison
EXCLUDED_DIFF_FIELDS = {
    "created_at", "updated_at", "id", "hashed_password", 
    "notified_3_days", "notified_1_day"
}

def get_model_changes(old_data: dict, new_data: dict) -> dict:
    """
    Compares two dictionaries representing model states and returns a dictionary of changes.
    Format: { field: { "old": old_val, "new": new_val } }
    """
    changes = {}
    for key, new_val in new_data.items():
        if key in EXCLUDED_DIFF_FIELDS:
            continue
        old_val = old_data.get(key)
        
        # Normalize types for comparison (e.g. datetime to ISO string, float vs int)
        norm_old = old_val.isoformat() if isinstance(old_val, datetime) else old_val
        norm_new = new_val.isoformat() if isinstance(new_val, datetime) else new_val
        
        # If float/int comparison
        if isinstance(norm_old, (int, float)) and isinstance(norm_new, (int, float)):
            if abs(norm_old - norm_new) < 1e-9:
                continue
                
        if norm_old != norm_new:
            # Format nicely for datetime/strings
            changes[key] = {
                "old": norm_old if norm_old is not None else "—",
                "new": norm_new if norm_new is not None else "—"
            }
    return changes

def log_audit_action(
    db: Session,
    user: User,
    action: str,  # "создание", "обновление", "удаление"
    object_type: str,  # "Клиент", "Объект", "Тендер", "Задача", "Транзакция", "Оборудование", "Материал", "Документ"
    object_id: int,
    object_name: str,
    changes: dict = None
) -> AuditLog:
    """
    Saves an audit log entry to the database and broadcasts a websocket message.
    """
    user_id = user.id if user else None
    username = user.username if user else "Система"
    
    changes_str = json.dumps(changes, ensure_ascii=False) if changes else None
    
    db_log = AuditLog(
        user_id=user_id,
        username=username,
        action=action,
        object_type=object_type,
        object_id=object_id,
        object_name=object_name,
        changes=changes_str
    )
    
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    
    # Broadcast to update client audit screens
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(manager.broadcast({
                "type": "info",
                "message": f"🪵 {username} выполнил действие: {action} ({object_type})",
                "refetchKey": "audit-logs"
            }))
    except Exception as e:
        print(f"WebSocket broadcast error for audit logs: {e}")
        
    return db_log
