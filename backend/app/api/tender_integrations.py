from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/tender-integrations", tags=["tender_integrations"])

@router.get("/platforms", response_model=List[schemas.TenderPlatformResponse])
def get_platforms(db: Session = Depends(get_db)):
    return db.query(models.TenderPlatform).all()

@router.post("/platforms", response_model=schemas.TenderPlatformResponse)
def create_platform(platform: schemas.TenderPlatformCreate, db: Session = Depends(get_db)):
    db_platform = models.TenderPlatform(**platform.dict())
    db.add(db_platform)
    db.commit()
    db.refresh(db_platform)
    return db_platform

@router.put("/platforms/{platform_id}", response_model=schemas.TenderPlatformResponse)
def update_platform(platform_id: int, platform: schemas.TenderPlatformCreate, db: Session = Depends(get_db)):
    db_platform = db.query(models.TenderPlatform).filter(models.TenderPlatform.id == platform_id).first()
    if not db_platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    update_data = platform.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_platform, key, value)
        
    db.commit()
    db.refresh(db_platform)
    return db_platform

@router.delete("/platforms/{platform_id}")
def delete_platform(platform_id: int, db: Session = Depends(get_db)):
    db_platform = db.query(models.TenderPlatform).filter(models.TenderPlatform.id == platform_id).first()
    if not db_platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    db.delete(db_platform)
    db.commit()
    return {"status": "success"}
