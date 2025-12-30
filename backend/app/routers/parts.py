from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app import schemas, services

router = APIRouter(prefix="/parts", tags=["parts"])


@router.post("/", response_model=schemas.PartResponse, status_code=status.HTTP_201_CREATED)
def create_part(part: schemas.PartCreate, db: Session = Depends(get_db)):
    """Create a new part"""
    try:
        return services.create_part(db, part)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create part: {str(e)}"
        )


@router.get("/{part_id}", response_model=schemas.PartResponse)
def get_part(part_id: UUID, db: Session = Depends(get_db)):
    """Get a part by ID"""
    part = services.get_part(db, part_id)
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Part not found"
        )
    return part


@router.get("/org/{org_id}", response_model=List[schemas.PartResponse])
def get_parts_by_org(org_id: UUID, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all parts for an organization"""
    return services.get_parts_by_org(db, org_id, skip, limit)


@router.patch("/{part_id}", response_model=schemas.PartResponse)
def update_part(part_id: UUID, part_update: schemas.PartUpdate, db: Session = Depends(get_db)):
    """Update a part"""
    part = services.update_part(db, part_id, part_update.model_dump(exclude_unset=True))
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Part not found"
        )
    return part

