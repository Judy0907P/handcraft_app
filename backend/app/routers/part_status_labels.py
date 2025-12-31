from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app import schemas
from app.models import PartStatusLabel, Part

router = APIRouter(prefix="/part-status-labels", tags=["part-status-labels"])


@router.post("/", response_model=schemas.PartStatusLabelResponse, status_code=status.HTTP_201_CREATED)
def create_part_status_label(label: schemas.PartStatusLabelCreate, db: Session = Depends(get_db)):
    """Create a new part status label"""
    # Check if label already exists for this org
    existing = db.query(PartStatusLabel).filter(
        PartStatusLabel.org_id == label.org_id,
        PartStatusLabel.label == label.label
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status label already exists for this organization"
        )
    
    db_label = PartStatusLabel(org_id=label.org_id, label=label.label)
    db.add(db_label)
    db.commit()
    db.refresh(db_label)
    return db_label


@router.get("/org/{org_id}", response_model=List[schemas.PartStatusLabelResponse])
def get_part_status_labels(org_id: UUID, db: Session = Depends(get_db)):
    """Get all part status labels for an organization"""
    return db.query(PartStatusLabel).filter(PartStatusLabel.org_id == org_id).order_by(PartStatusLabel.label).all()


@router.delete("/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_part_status_label(label_id: UUID, db: Session = Depends(get_db)):
    """Delete a part status label and remove it from all parts that have it"""
    label = db.query(PartStatusLabel).filter(PartStatusLabel.label_id == label_id).first()
    if not label:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Status label not found"
        )
    
    label_text = label.label
    org_id = label.org_id
    
    # Remove this label from all parts in the organization that have it
    parts = db.query(Part).filter(Part.org_id == org_id).all()
    for part in parts:
        if part.status and label_text in part.status:
            # Remove the label from the status array
            updated_status = [s for s in part.status if s != label_text]
            part.status = updated_status
    
    # Delete the label from the database
    db.delete(label)
    db.commit()
    return None

