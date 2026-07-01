import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import jwt, JWTError
from sqlalchemy.orm import Session
import secrets
from ..database import get_db
from ..models import User, AuthLog

# Загрузка переменных окружения для исключения хардкода секретов в репозитории (Режим 10)
load_dotenv()

# Configuration
# Секретный ключ подписи JWT загружается из окружения для безопасности сессий пользователей (Режим 10)
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY не задан в .env! Запуск невозможен.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 day

# Определение окружения для безопасных кук
IS_PROD = os.getenv("ENVIRONMENT", "development") == "production"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

router = APIRouter(prefix="/auth", tags=["Authentication"])

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_token_from_request(request: Request) -> Optional[str]:
    # 1. Попытка получить из HttpOnly куки (Режим 10)
    token = request.cookies.get("access_token")
    if token:
        return token
    # 2. Обратная совместимость: попытка получить из заголовка Authorization (Режим 10)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
    return None

async def get_current_user(request: Request, db: Session = Depends(get_db)):
    from ..database import current_tenant_id
    # Сбрасываем контекст для выполнения поиска пользователя по всей базе
    current_tenant_id.set(None)
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = get_token_from_request(request)
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
        
    # Устанавливаем tenant_id текущего пользователя в контекст запроса
    current_tenant_id.set(user.tenant_id)
    return user


@router.post("/login")
def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    ip_addr = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    # Блокировка после 5 неудачных попыток
    failed_attempts = db.query(AuthLog).filter(
        AuthLog.ip_address == ip_addr,
        AuthLog.status == "failure",
        AuthLog.timestamp > datetime.utcnow() - timedelta(minutes=15)
    ).count()
    if failed_attempts >= 5:
        raise HTTPException(
            status_code=429, 
            detail="Слишком много попыток. Попробуйте через 15 минут."
        )
    
    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        # Failed login attempt
        log_entry = AuthLog(
            user_id=user.id if user else None,
            username=form_data.username,
            status="failure",
            ip_address=ip_addr,
            user_agent=user_agent
        )
        db.add(log_entry)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if user.is_active == 0:
        # User is blocked
        log_entry = AuthLog(
            user_id=user.id,
            username=form_data.username,
            status="blocked_attempt",
            ip_address=ip_addr,
            user_agent=user_agent
        )
        db.add(log_entry)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
        
    # Successful login
    log_entry = AuthLog(
        user_id=user.id,
        username=user.username,
        status="success",
        ip_address=ip_addr,
        user_agent=user_agent
    )
    db.add(log_entry)
    db.commit()
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )

    # 1. Запись токена сессии в HttpOnly Secure куку (Режим 10)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=IS_PROD,  # Выключаем для локальной разработки по HTTP, включаем в production
        samesite="none" if IS_PROD else "lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    # 2. Запись CSRF-токена в обычную куку (Режим 10)
    csrf_token = secrets.token_hex(32)
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,  # Должна быть доступна клиенту
        secure=IS_PROD,  # Выключаем для локальной разработки по HTTP, включаем в production
        samesite="none" if IS_PROD else "lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "csrf_token": csrf_token
    }

@router.post("/logout")
def logout(response: Response):
    # Очистка кук при выходе из системы (Режим 10)
    response.delete_cookie(key="access_token", secure=IS_PROD, samesite="none" if IS_PROD else "lax")
    response.delete_cookie(key="csrf_token", secure=IS_PROD, samesite="none" if IS_PROD else "lax")
    return {"detail": "Successfully logged out"}

# Utility to create the first admin user
@router.post("/create-admin-init")
def create_initial_admin(db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == "admin").first()
    if user:
        return {"msg": "Admin already exists"}
    
    hashed_pw = get_password_hash("admin123")
    new_admin = User(username="admin", hashed_password=hashed_pw, role="admin")
    db.add(new_admin)
    db.commit()
    return {"msg": "Admin created (admin / admin123)"}
