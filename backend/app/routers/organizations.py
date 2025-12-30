from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app import schemas
from app.models import Organization

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.post("/", response_model=schemas.OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(org: schemas.OrganizationCreate, db: Session = Depends(get_db)):
    """Create a new organization"""
    try:
        db_org = Organization(name=org.name)
        db.add(db_org)
        db.commit()
        db.refresh(db_org)
        return db_org
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create organization: {str(e)}"
        )


@router.get("/", response_model=List[schemas.OrganizationResponse])
def get_organizations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all organizations"""
    return db.query(Organization).offset(skip).limit(limit).all()


@router.get("/{org_id}", response_model=schemas.OrganizationResponse)
def get_organization(org_id: UUID, db: Session = Depends(get_db)):
    """Get an organization by ID"""
    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    return org


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_organization(org_id: UUID, db: Session = Depends(get_db)):
    """Delete an organization (cascades to all related data)"""
    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    try:
        db.delete(org)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete organization: {str(e)}"
        )

