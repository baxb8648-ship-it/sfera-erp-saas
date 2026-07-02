"""
API роут для управления матрицей прав (RBAC).
Позволяет администратору тенанта читать и настраивать права ролей.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..api.auth import get_current_user
from ..models import User, RolePermission
from ..utils.rbac import (
    require_permission,
    get_user_permissions,
    seed_default_permissions,
    DEFAULT_PERMISSIONS,
    ALL_MODULES,
    PermissionResult,
)

router = APIRouter(prefix="/permissions", tags=["RBAC"])


# ─── Схемы ─────────────────────────────────────────────────────────────────

class PermissionOut(BaseModel):
    id: Optional[int] = None
    role: str
    module: str
    can_read: bool
    can_write: bool
    can_delete: bool
    own_only: bool

    class Config:
        from_attributes = True


class PermissionUpdate(BaseModel):
    can_read: bool
    can_write: bool
    can_delete: bool
    own_only: bool


class MyPermissionsOut(BaseModel):
    """Права текущего пользователя — используются фронтендом для построения меню."""
    role: str
    is_superadmin: bool
    plan_modules: Optional[list] = None
    permissions: dict[str, PermissionOut]


# ─── Эндпоинты ─────────────────────────────────────────────────────────────

@router.get("/my", response_model=MyPermissionsOut)
def get_my_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Получить матрицу прав текущего пользователя.
    Вызывается при логине и кешируется фронтендом в AuthContext.
    """
    is_superadmin = current_user.role == "superadmin"
    perms: dict[str, PermissionOut] = {}

    for module in ALL_MODULES:
        result = get_user_permissions(current_user, module, db)
        perms[module] = PermissionOut(
            role=current_user.role,
            module=module,
            can_read=result.can_read,
            can_write=result.can_write,
            can_delete=result.can_delete,
            own_only=result.own_only,
        )

    tenant = None
    plan_modules = None
    if current_user.tenant_id:
        from ..models import Tenant
        tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
        if tenant and tenant.plan_modules is not None:
            plan_modules = tenant.plan_modules

    return MyPermissionsOut(
        role=current_user.role,
        is_superadmin=is_superadmin,
        plan_modules=plan_modules,
        permissions=perms,
    )


@router.get("/", response_model=List[PermissionOut])
def get_all_permissions(
    current_user: User = Depends(get_current_user),
    perm=Depends(require_permission("audit", "read")),  # Только admin+
    db: Session = Depends(get_db),
):
    """
    Получить полную матрицу прав тенанта.
    Только для роли admin и superadmin.
    """
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(403, "Только администратор может просматривать матрицу прав.")

    tenant_id = current_user.tenant_id
    rows = db.query(RolePermission).filter_by(tenant_id=tenant_id).all()

    # Если матрица не инициализирована — создаём дефолтную
    if not rows:
        seed_default_permissions(tenant_id, db)
        rows = db.query(RolePermission).filter_by(tenant_id=tenant_id).all()

    return rows


@router.put("/{role}/{module}", response_model=PermissionOut)
def update_permission(
    role: str,
    module: str,
    data: PermissionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Обновить права конкретной роли для конкретного модуля.
    Только для роли admin (в рамках своего тенанта).
    """
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(403, "Только администратор может изменять матрицу прав.")

    if role == "admin" and current_user.role != "superadmin":
        raise HTTPException(403, "Изменять права роли 'admin' может только SuperAdmin платформы.")

    if module not in ALL_MODULES:
        raise HTTPException(400, f"Неизвестный модуль: '{module}'. Допустимы: {ALL_MODULES}")

    tenant_id = current_user.tenant_id
    perm = db.query(RolePermission).filter_by(tenant_id=tenant_id, role=role, module=module).first()

    if perm is None:
        # Создаём запись, если её ещё нет
        perm = RolePermission(tenant_id=tenant_id, role=role, module=module)
        db.add(perm)

    perm.can_read = data.can_read
    perm.can_write = data.can_write
    perm.can_delete = data.can_delete
    perm.own_only = data.own_only
    db.commit()
    db.refresh(perm)
    return perm


@router.post("/seed-defaults")
def seed_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Сбросить матрицу прав до дефолтных значений.
    Только для admin. Существующие записи перезаписываются.
    """
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(403, "Только администратор может сбросить матрицу прав.")

    tenant_id = current_user.tenant_id
    # Удаляем существующие
    db.query(RolePermission).filter_by(tenant_id=tenant_id).delete()
    db.commit()
    # Записываем дефолтные
    seed_default_permissions(tenant_id, db)
    return {"detail": "Матрица прав сброшена до дефолтных значений.", "tenant_id": tenant_id}
