from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app import schemas, services

router = APIRouter(prefix="/products", tags=["products"])


@router.post("/", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    """Create a new product"""
    try:
        return services.create_product(db, product)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create product: {str(e)}"
        )


@router.get("/{product_id}", response_model=schemas.ProductResponse)
def get_product(product_id: UUID, db: Session = Depends(get_db)):
    """Get a product by ID"""
    product = services.get_product(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return product


@router.get("/org/{org_id}", response_model=List[schemas.ProductResponse])
def get_products_by_org(org_id: UUID, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all products for an organization"""
    return services.get_products_by_org(db, org_id, skip, limit)


@router.patch("/{product_id}", response_model=schemas.ProductResponse)
def update_product(product_id: UUID, product_update: schemas.ProductUpdate, db: Session = Depends(get_db)):
    """Update a product"""
    product = services.get_product(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    update_data = product_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(product, key, value)
    
    db.commit()
    db.refresh(product)
    return product

