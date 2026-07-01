from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, InventoryItem
from .auth import get_current_user
from ..services.biurs_campaign import run_biurs_campaign

router = APIRouter(prefix="/tenders/biurs-campaign", tags=["BIURS Campaign"])

@router.post("/run", status_code=status.HTTP_200_OK)
def run_campaign(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Запускает автоматический поиск лидов по БИУРС, формирование КП, отправку email,
    регистрацию клиентов в CRM и создание задач для менеджеров.
    """
    try:
        # Запускаем в фоновом режиме, так как парсинг и ИИ-генерация могут занять время
        background_tasks.add_task(run_biurs_campaign, db, current_user.id)
        return {"status": "success", "message": "Кампания сбыта БИУРС успешно запущена в фоновом режиме."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при запуске кампании БИУРС: {str(e)}"
        )

@router.get("/status")
def get_campaign_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Возвращает текущие остатки БИУРС на складе и готовность к кампании.
    """
    biurs_item = db.query(InventoryItem).filter(InventoryItem.name.like("%БИУРС%")).first()
    available_qty = biurs_item.quantity if biurs_item else 0.0
    unit = biurs_item.unit if biurs_item else "кг"
    
    return {
        "warehouse_stock": {
            "name": biurs_item.name if biurs_item else "БИУРС (Не найден на складе)",
            "quantity": available_qty,
            "unit": unit
        },
        "ready_to_run": available_qty > 0 or biurs_item is not None,
        "message": "Система готова к поиску и рассылке предложений." if available_qty > 0 else "Внимание: БИУРС не найден на складе или его количество равно 0. Рассылка будет использовать демонстрационный режим остатков."
    }
