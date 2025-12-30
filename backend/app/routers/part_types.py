from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app import schemas
from app.models import PartType, PartSubtype

router = APIRouter(prefix="/part-types", tags=["part-types"])


@router.post("/", response_model=schemas.PartTypeResponse, status_code=status.HTTP_201_CREATED)
def create_part_type(part_type: schemas.PartTypeCreate, db: Session = Depends(get_db)):
    """Create a new part type"""
    try:
        db_part_type = PartType(
            org_id=part_type.org_id,
            type_name=part_type.type_name
        )
        db.add(db_part_type)
        db.commit()
        db.refresh(db_part_type)
        return db_part_type
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create part type: {str(e)}"
        )


@router.get("/org/{org_id}", response_model=List[schemas.PartTypeResponse])
def get_part_types_by_org(org_id: UUID, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all part types for an organization"""
    return db.query(PartType).filter(PartType.org_id == org_id).offset(skip).limit(limit).all()


@router.get("/{type_id}", response_model=schemas.PartTypeResponse)
def get_part_type(type_id: UUID, db: Session = Depends(get_db)):
    """Get a part type by ID"""
    part_type = db.query(PartType).filter(PartType.type_id == type_id).first()
    if not part_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Part type not found"
        )
    return part_type


# Part Subtype endpoints
@router.post("/subtypes", response_model=schemas.PartSubtypeResponse, status_code=status.HTTP_201_CREATED)
def create_part_subtype(subtype: schemas.PartSubtypeCreate, db: Session = Depends(get_db)):
    """Create a new part subtype"""
    try:
        db_subtype = PartSubtype(
            type_id=subtype.type_id,
            subtype_name=subtype.subtype_name
        )
        db.add(db_subtype)
        db.commit()
        db.refresh(db_subtype)
        return db_subtype
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create part subtype: {str(e)}"
        )


@router.get("/subtypes/type/{type_id}", response_model=List[schemas.PartSubtypeResponse])
def get_part_subtypes_by_type(type_id: UUID, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all part subtypes for a part type"""
    return db.query(PartSubtype).filter(PartSubtype.type_id == type_id).offset(skip).limit(limit).all()


@router.get("/subtypes/{subtype_id}", response_model=schemas.PartSubtypeResponse)
def get_part_subtype(subtype_id: UUID, db: Session = Depends(get_db)):
    """Get a part subtype by ID"""
    subtype = db.query(PartSubtype).filter(PartSubtype.subtype_id == subtype_id).first()
    if not subtype:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Part subtype not found"
        )
    return subtype


@router.delete("/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_part_type(type_id: UUID, db: Session = Depends(get_db)):
    """Delete a part type (cascades to subtypes)"""
    from app.models import PartType
    
    part_type = db.query(PartType).filter(PartType.type_id == type_id).first()
    if not part_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Part type not found"
        )
    
    try:
        db.delete(part_type)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete part type: {str(e)}"
        )


@router.delete("/subtypes/{subtype_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_part_subtype(subtype_id: UUID, db: Session = Depends(get_db)):
    """Delete a part subtype (will set parts' subtype_id to NULL)"""
    from app.models import PartSubtype, Part
    
    subtype = db.query(PartSubtype).filter(PartSubtype.subtype_id == subtype_id).first()
    if not subtype:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Part subtype not found"
        )
    
    try:
        db.delete(subtype)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete part subtype: {str(e)}"
        )

