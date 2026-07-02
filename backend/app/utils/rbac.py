"""
Утилиты глубокого RBAC (Role-Based Access Control) для СФЕРА ERP.

Поддерживает два уровня контроля:
1. Уровень модуля: can_read, can_write, can_delete
2. Уровень строки:  own_only — пользователь видит только записи, где owner_id == user.id

Использование в роутерах:
    from ..utils.rbac import require_permission

    @router.get("/clients/")
    def list_clients(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
        perm = Depends(require_permission("clients", "read")),
    ):
        q = db.query(Client).filter(Client.tenant_id == current_user.tenant_id)
        if perm.own_only:
            q = q.filter(Client.owner_id == current_user.id)
        return q.all()
"""

from functools import lru_cache
from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..api.auth import get_current_user
from ..models import User, RolePermission


# ─── Модули системы ─────────────────────────────────────────────────────────
ALL_MODULES = [
    "clients", "objects", "finance", "tasks", "tenders",
    "inventory", "equipment", "templates", "analytics",
    "audit", "support",
]

# ─── Дефолтная матрица прав ─────────────────────────────────────────────────
# Используется при инициализации нового тенанта.
# Формат: (role, module): {can_read, can_write, can_delete, own_only}
DEFAULT_PERMISSIONS: dict[tuple[str, str], dict] = {
    # ── ADMIN: полный доступ ко всему ──────────────────────────────────────
    **{("admin", m): {"can_read": True, "can_write": True, "can_delete": True, "own_only": False}
       for m in ALL_MODULES},

    # ── MANAGER: работает с клиентами и объектами, видит ТОЛЬКО СВОИХ ──────
    ("manager", "clients"):   {"can_read": True, "can_write": True,  "can_delete": False, "own_only": True},
    ("manager", "objects"):   {"can_read": True, "can_write": True,  "can_delete": False, "own_only": True},
    ("manager", "tasks"):     {"can_read": True, "can_write": True,  "can_delete": False, "own_only": False},
    ("manager", "tenders"):   {"can_read": True, "can_write": False, "can_delete": False, "own_only": False},
    ("manager", "finance"):   {"can_read": False,"can_write": False, "can_delete": False, "own_only": False},
    ("manager", "inventory"): {"can_read": True, "can_write": False, "can_delete": False, "own_only": False},
    ("manager", "equipment"): {"can_read": True, "can_write": False, "can_delete": False, "own_only": False},
    ("manager", "templates"): {"can_read": True, "can_write": False, "can_delete": False, "own_only": False},
    ("manager", "analytics"): {"can_read": False,"can_write": False, "can_delete": False, "own_only": False},
    ("manager", "audit"):     {"can_read": False,"can_write": False, "can_delete": False, "own_only": False},
    ("manager", "support"):   {"can_read": True, "can_write": True,  "can_delete": False, "own_only": False},

    # ── ACCOUNTANT: финансы + чтение остального ───────────────────────────
    ("accountant", "clients"):   {"can_read": True, "can_write": False, "can_delete": False, "own_only": False},
    ("accountant", "objects"):   {"can_read": True, "can_write": False, "can_delete": False, "own_only": False},
    ("accountant", "tasks"):     {"can_read": True, "can_write": True,  "can_delete": False, "own_only": False},
    ("accountant", "tenders"):   {"can_read": True, "can_write": False, "can_delete": False, "own_only": False},
    ("accountant", "finance"):   {"can_read": True, "can_write": True,  "can_delete": True,  "own_only": False},
    ("accountant", "inventory"): {"can_read": True, "can_write": True,  "can_delete": False, "own_only": False},
    ("accountant", "equipment"): {"can_read": True, "can_write": False, "can_delete": False, "own_only": False},
    ("accountant", "templates"): {"can_read": True, "can_write": False, "can_delete": False, "own_only": False},
    ("accountant", "analytics"): {"can_read": True, "can_write": False, "can_delete": False, "own_only": False},
    ("accountant", "audit"):     {"can_read": True, "can_write": False, "can_delete": False, "own_only": False},
    ("accountant", "support"):   {"can_read": True, "can_write": True,  "can_delete": False, "own_only": False},

    # ── SUPPORT_AGENT: техподдержка, только читает большинство ──────────
    ("support_agent", "clients"):   {"can_read": True, "can_write": False, "can_delete": False, "own_only": False},
    ("support_agent", "objects"):   {"can_read": True, "can_write": False, "can_delete": False, "own_only": False},
    ("support_agent", "tasks"):     {"can_read": True, "can_write": True,  "can_delete": False, "own_only": False},
    ("support_agent", "tenders"):   {"can_read": False,"can_write": False, "can_delete": False, "own_only": False},
    ("support_agent", "finance"):   {"can_read": False,"can_write": False, "can_delete": False, "own_only": False},
    ("support_agent", "inventory"): {"can_read": False,"can_write": False, "can_delete": False, "own_only": False},
    ("support_agent", "equipment"): {"can_read": False,"can_write": False, "can_delete": False, "own_only": False},
    ("support_agent", "templates"): {"can_read": False,"can_write": False, "can_delete": False, "own_only": False},
    ("support_agent", "analytics"): {"can_read": False,"can_write": False, "can_delete": False, "own_only": False},
    ("support_agent", "audit"):     {"can_read": True, "can_write": False, "can_delete": False, "own_only": False},
    ("support_agent", "support"):   {"can_read": True, "can_write": True,  "can_delete": False, "own_only": False},
}


class PermissionResult:
    """Результат проверки прав — передаётся в обработчик роута."""
    def __init__(self, can_read: bool, can_write: bool, can_delete: bool, own_only: bool):
        self.can_read = can_read
        self.can_write = can_write
        self.can_delete = can_delete
        self.own_only = own_only


def get_user_permissions(
    user: User,
    module: str,
    db: Session,
) -> PermissionResult:
    """
    Получить права пользователя для конкретного модуля.
    superadmin — всегда имеет полный доступ без проверки таблицы.
    """
    # superadmin не ограничен RBAC
    if user.role == "superadmin":
        return PermissionResult(True, True, True, False)

    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Пользователь не привязан к компании.")

    perm = (
        db.query(RolePermission)
        .filter_by(tenant_id=user.tenant_id, role=user.role, module=module)
        .first()
    )

    if perm is None:
        # Запись не найдена — используем дефолт из матрицы, или запрет
        defaults = DEFAULT_PERMISSIONS.get((user.role, module))
        if defaults:
            return PermissionResult(**defaults)
        # Если роль неизвестна — запрет
        return PermissionResult(False, False, False, False)

    return PermissionResult(
        can_read=perm.can_read,
        can_write=perm.can_write,
        can_delete=perm.can_delete,
        own_only=perm.own_only,
    )


def require_permission(module: str, action: str = "read"):
    """
    FastAPI Dependency для проверки прав доступа к модулю.

    Параметры:
        module: название модуля ("clients", "finance", и т.д.)
        action: "read" | "write" | "delete"

    Возвращает:
        PermissionResult — объект с флагами прав (в т.ч. own_only)
        для использования в обработчике роута.

    Пример:
        perm = Depends(require_permission("clients", "write"))
        if perm.own_only:
            q = q.filter(Client.owner_id == current_user.id)
    """
    async def _checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> PermissionResult:
        result = get_user_permissions(current_user, module, db)
        action_map = {
            "read": result.can_read,
            "write": result.can_write,
            "delete": result.can_delete,
        }
        if not action_map.get(action, False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Недостаточно прав: требуется '{action}' для модуля '{module}'.",
            )
        return result

    return _checker


def seed_default_permissions(tenant_id: int, db: Session) -> None:
    """
    Инициализировать дефолтную матрицу прав при создании нового тенанта.
    Вызывается из tenants.py при регистрации компании.
    """
    existing = db.query(RolePermission).filter_by(tenant_id=tenant_id).count()
    if existing > 0:
        return  # Уже инициализировано

    records = []
    for (role, module), perms in DEFAULT_PERMISSIONS.items():
        records.append(RolePermission(
            tenant_id=tenant_id,
            role=role,
            module=module,
            can_read=perms["can_read"],
            can_write=perms["can_write"],
            can_delete=perms["can_delete"],
            own_only=perms["own_only"],
        ))
    db.bulk_save_objects(records)
    db.commit()
