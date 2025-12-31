from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app import schemas, services
from app.models import Part
from app.storage import storage_service

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


@router.post("/{part_id}/image", response_model=schemas.PartResponse)
def upload_part_image(
    part_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload an image for a part"""
    # Validate file type
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Get the part
    part = db.query(Part).filter(Part.part_id == part_id).first()
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Part not found"
        )
    
    # Delete old image if exists
    if part.image_url:
        storage_service.delete_part_image(part.image_url)
    
    # Save new image
    try:
        image_url = storage_service.save_part_image(file, str(part_id))
        
        # Update part with new image URL
        part.image_url = image_url
        db.commit()
        db.refresh(part)
        
        return part
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}"
        )


@router.delete("/{part_id}/image", response_model=schemas.PartResponse)
def delete_part_image(part_id: UUID, db: Session = Depends(get_db)):
    """Delete the image for a part"""
    part = db.query(Part).filter(Part.part_id == part_id).first()
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Part not found"
        )
    
    if part.image_url:
        storage_service.delete_part_image(part.image_url)
        part.image_url = None
        db.commit()
        db.refresh(part)
    
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
    
    # Delete associated image if exists
    if part.image_url:
        storage_service.delete_part_image(part.image_url)
    
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

