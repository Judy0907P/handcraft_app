from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app import schemas
from app.models import Organization, OrgMembership
from app.routers.auth import get_current_user, User

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.post("/", response_model=schemas.OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    org: schemas.OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new organization and add current user as owner"""
    try:
        db_org = Organization(
            name=org.name,
            main_currency=org.main_currency,
            additional_currency=org.additional_currency,
            exchange_rate=org.exchange_rate
        )
        db.add(db_org)
        db.flush()  # Flush to get org_id
        
        # Add user as owner
        membership = OrgMembership(
            org_id=db_org.org_id,
            user_id=current_user.user_id,
            role="owner"
        )
        db.add(membership)
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
def get_organizations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all organizations the current user is a member of"""
    return db.query(Organization).join(
        OrgMembership, Organization.org_id == OrgMembership.org_id
    ).filter(
        OrgMembership.user_id == current_user.user_id
    ).offset(skip).limit(limit).all()


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


@router.patch("/{org_id}", response_model=schemas.OrganizationResponse)
def update_organization(
    org_id: UUID,
    org_update: schemas.OrganizationUpdate,
    db: Session = Depends(get_db)
):
    """Update an organization"""
    org = db.query(Organization).filter(Organization.org_id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    update_data = org_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(org, key, value)
    
    db.commit()
    db.refresh(org)
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

