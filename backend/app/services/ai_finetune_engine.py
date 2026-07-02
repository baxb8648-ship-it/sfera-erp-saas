import time
import json
import os
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import AIFineTuneJob, Client, Object, Tender

DATASET_DIR = "datasets/finetune"

def add_log(db: Session, job: AIFineTuneJob, message: str, progress: int = None):
    # This function safely appends a log string
    current_logs = list(job.logs) if job.logs else []
    timestamp = datetime.utcnow().strftime("%H:%M:%S")
    current_logs.append(f"[{timestamp}] {message}")
    job.logs = current_logs
    if progress is not None:
        job.progress_percent = progress
    db.commit()
    db.refresh(job)

async def run_lora_training(job_id: int):
    """
    Фоновый процесс извлечения данных и симуляции дообучения LoRA.
    """
    db = SessionLocal()
    try:
        job = db.query(AIFineTuneJob).filter(AIFineTuneJob.id == job_id).first()
        if not job:
            return

        tenant_id = job.tenant_id
        
        job.status = "extracting"
        add_log(db, job, "Начало процесса подготовки датасета...", 5)
        await asyncio.sleep(2)
        
        # 1. Извлечение данных
        add_log(db, job, f"Сканирование базы CRM для тенанта #{tenant_id}...", 10)
        clients = db.query(Client).filter(Client.tenant_id == tenant_id).all()
        objects = db.query(Object).filter(Object.tenant_id == tenant_id).all()
        tenders = db.query(Tender).filter(Tender.tenant_id == tenant_id).all()
        
        dataset_records = len(clients) + len(objects) + len(tenders)
        add_log(db, job, f"Найдено {dataset_records} исторических записей.", 15)
        await asyncio.sleep(2)
        
        add_log(db, job, "Форматирование датасета в Instruction-Tuning (Alpaca format)...", 20)
        # В реальной системе здесь будет сохранение JSONL файла на диск
        os.makedirs(DATASET_DIR, exist_ok=True)
        dataset_path = os.path.join(DATASET_DIR, f"tenant_{tenant_id}_dataset.jsonl")
        
        with open(dataset_path, "w", encoding="utf-8") as f:
            for c in clients:
                f.write(json.dumps({"instruction": f"Проанализируй клиента {c.name}", "output": f"Статус: {c.status}"}, ensure_ascii=False) + "\n")
        
        add_log(db, job, f"Датасет сохранен по пути: {dataset_path}", 30)
        await asyncio.sleep(3)
        
        # 2. Симуляция Fine-Tuning
        job.status = "training"
        add_log(db, job, "Инициализация Qwen (Base Model) и Unsloth...", 35)
        await asyncio.sleep(4)
        add_log(db, job, "Запуск дообучения (LoRA Rank=8, Alpha=16)...", 40)
        await asyncio.sleep(2)
        
        # Имитируем эпохи
        for epoch in range(1, 6):
            add_log(db, job, f"Training Epoch {epoch}/5: Loss={max(0.1, 2.5 - epoch*0.4):.4f}", 40 + epoch * 10)
            await asyncio.sleep(4)
            
        add_log(db, job, "Обучение завершено. Экспорт весов (Adapter)...", 95)
        await asyncio.sleep(3)
        
        # 3. Финализация
        adapter_path = f"adapters/lora_tenant_{tenant_id}.bin"
        job.adapter_path = adapter_path
        job.status = "completed"
        job.completed_at = datetime.utcnow()
        add_log(db, job, f"УСПЕХ: Адаптер сохранен ({adapter_path}) и готов к работе!", 100)

    except Exception as e:
        job.status = "failed"
        add_log(db, job, f"ОШИБКА: {str(e)}")
    finally:
        db.close()
