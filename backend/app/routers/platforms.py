from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app import schemas, services
from app.models import Platform

router = APIRouter(prefix="/platforms", tags=["platforms"])


@router.post("/", response_model=schemas.PlatformResponse, status_code=status.HTTP_201_CREATED)
def create_platform(platform: schemas.PlatformCreate, db: Session = Depends(get_db)):
    """Create a new platform"""
    try:
        result = services.create_platform(db, platform)
        return result
    except Exception as e:
        error_msg = str(e)
        if "unique" in error_msg.lower() or "already exists" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Platform with this name already exists for this organization"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create platform: {error_msg}"
            )


@router.get("/org/{org_id}", response_model=List[schemas.PlatformResponse])
def get_platforms_by_org(org_id: UUID, db: Session = Depends(get_db)):
    """Get all platforms for an organization"""
    return services.get_platforms_by_org(db, org_id)


@router.get("/{platform_id}", response_model=schemas.PlatformResponse)
def get_platform(platform_id: UUID, db: Session = Depends(get_db)):
    """Get a platform by ID"""
    platform = services.get_platform(db, platform_id)
    if not platform:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Platform not found"
        )
    return platform


@router.patch("/{platform_id}", response_model=schemas.PlatformResponse)
def update_platform(platform_id: UUID, platform_update: schemas.PlatformUpdate, db: Session = Depends(get_db)):
    """Update a platform"""
    update_data = platform_update.model_dump(exclude_unset=True)
    platform = services.update_platform(db, platform_id, update_data)
    if not platform:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Platform not found"
        )
    return platform


@router.delete("/{platform_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_platform(platform_id: UUID, db: Session = Depends(get_db)):
    """Delete a platform"""
    success = services.delete_platform(db, platform_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Platform not found"
        )
    return None

