from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import User, AuthLog
from ..schemas import UserCreateSchema, UserResponseSchema, AuthLogResponseSchema, UserUpdateSMTPSchema
from .auth import get_current_user, get_password_hash

router = APIRouter(prefix="/users", tags=["User Management"])

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен. Требуются права администратора."
        )
    return current_user

@router.get("/", response_model=List[UserResponseSchema])
def get_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    return db.query(User).all()

@router.post("/", response_model=UserResponseSchema)
def create_user(
    payload: UserCreateSchema,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    # Check if username exists
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Пользователь с таким именем уже существует"
        )
        
    hashed_pw = get_password_hash(payload.password)
    new_user = User(
        username=payload.username,
        hashed_password=hashed_pw,
        role=payload.role,
        telegram_chat_id=payload.telegram_chat_id,
        is_active=1
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{user_id}/telegram", response_model=UserResponseSchema)
def update_user_telegram(
    user_id: int,
    telegram_chat_id: Optional[str] = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
        
    user.telegram_chat_id = telegram_chat_id
    db.commit()
    db.refresh(user)
    return user

@router.put("/{user_id}/role", response_model=UserResponseSchema)
def update_user_role(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    if role not in ["admin", "manager", "accountant"]:
        raise HTTPException(status_code=400, detail="Неверная роль")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
        
    # Prevent self-demoting from admin
    if user.id == admin_user.id and role != "admin":
        raise HTTPException(
            status_code=400,
            detail="Вы не можете понизить в роли самого себя"
        )
        
    user.role = role
    db.commit()
    db.refresh(user)
    return user

@router.put("/{user_id}/status", response_model=UserResponseSchema)
def update_user_status(
    user_id: int,
    is_active: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
        
    # Prevent self-blocking
    if user.id == admin_user.id and is_active == 0:
        raise HTTPException(
            status_code=400,
            detail="Вы не можете заблокировать самого себя"
        )
        
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return user

@router.get("/auth-logs", response_model=List[AuthLogResponseSchema])
def get_auth_logs(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    query = db.query(AuthLog)
    if search:
        query = query.filter(AuthLog.username.like(f"%{search}%"))
    return query.order_by(AuthLog.timestamp.desc()).offset(skip).limit(limit).all()


@router.get("/list", response_model=List[UserResponseSchema])
def get_users_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(User).filter(User.is_active == 1).all()


@router.put("/{user_id}/password", response_model=UserResponseSchema)
def update_user_password(
    user_id: int,
    password: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    if len(password.strip()) < 4:
        raise HTTPException(status_code=400, detail="Пароль должен быть не менее 4 символов")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
        
    user.hashed_password = get_password_hash(password.strip())
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    # Prevent self-deletion
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=400,
            detail="Вы не можете удалить самого себя"
        )
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
        
    db.delete(user)
    db.commit()
    return {"message": "Пользователь успешно удален"}


@router.get("/me", response_model=UserResponseSchema)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me/smtp", response_model=UserResponseSchema)
def update_me_smtp(
    payload: UserUpdateSMTPSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user.smtp_host = payload.smtp_host
    current_user.smtp_port = payload.smtp_port
    current_user.smtp_user = payload.smtp_user
    current_user.smtp_password = payload.smtp_password
    current_user.smtp_use_ssl = payload.smtp_use_ssl
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/{user_id}/smtp", response_model=UserResponseSchema)
def update_user_smtp_admin(
    user_id: int,
    payload: UserUpdateSMTPSchema,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
        
    user.smtp_host = payload.smtp_host
    user.smtp_port = payload.smtp_port
    user.smtp_user = payload.smtp_user
    user.smtp_password = payload.smtp_password
    user.smtp_use_ssl = payload.smtp_use_ssl
    db.commit()
    db.refresh(user)
    return user




