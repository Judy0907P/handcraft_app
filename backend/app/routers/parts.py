from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app import schemas, services
from app.models import Part

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
def get_parts_by_org(
    org_id: UUID,
    subtype_id: Optional[UUID] = Query(None, description="Filter by part subtype ID"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all parts for an organization, optionally filtered by subtype"""
    query = db.query(Part).filter(Part.org_id == org_id)
    
    if subtype_id is not None:
        query = query.filter(Part.subtype_id == subtype_id)
    
    return query.offset(skip).limit(limit).all()


@router.get("/subtype/{subtype_id}", response_model=List[schemas.PartResponse])
def get_parts_by_subtype(
    subtype_id: UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all parts for a specific subtype"""
    return db.query(Part).filter(Part.subtype_id == subtype_id).offset(skip).limit(limit).all()




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


@router.delete("/{part_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_part(part_id: UUID, db: Session = Depends(get_db)):
    """Delete a part (will fail if part is used in recipes)"""
    from app.models import Part, RecipeLine
    
    part = db.query(Part).filter(Part.part_id == part_id).first()
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Part not found"
        )
    
    # Check if part is used in any recipes
    recipe_count = db.query(RecipeLine).filter(RecipeLine.part_id == part_id).count()
    if recipe_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete part: it is used in {recipe_count} recipe line(s). Remove from recipes first."
        )
    
    try:
        db.delete(part)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete part: {str(e)}"
        )

