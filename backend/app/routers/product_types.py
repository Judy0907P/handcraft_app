from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app import schemas
from app.models import ProductType, ProductSubtype

router = APIRouter(prefix="/product-types", tags=["product-types"])


@router.post("/", response_model=schemas.ProductTypeResponse, status_code=status.HTTP_201_CREATED)
def create_product_type(product_type: schemas.ProductTypeCreate, db: Session = Depends(get_db)):
    """Create a new product type"""
    try:
        db_product_type = ProductType(
            org_id=product_type.org_id,
            name=product_type.name,
            description=product_type.description
        )
        db.add(db_product_type)
        db.commit()
        db.refresh(db_product_type)
        return db_product_type
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create product type: {str(e)}"
        )


@router.get("/org/{org_id}", response_model=List[schemas.ProductTypeResponse])
def get_product_types_by_org(org_id: UUID, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all product types for an organization"""
    return db.query(ProductType).filter(ProductType.org_id == org_id).offset(skip).limit(limit).all()


@router.get("/{product_type_id}", response_model=schemas.ProductTypeResponse)
def get_product_type(product_type_id: UUID, db: Session = Depends(get_db)):
    """Get a product type by ID"""
    product_type = db.query(ProductType).filter(ProductType.product_type_id == product_type_id).first()
    if not product_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product type not found"
        )
    return product_type


# Product Subtype endpoints
@router.post("/subtypes", response_model=schemas.ProductSubtypeResponse, status_code=status.HTTP_201_CREATED)
def create_product_subtype(subtype: schemas.ProductSubtypeCreate, db: Session = Depends(get_db)):
    """Create a new product subtype"""
    try:
        db_subtype = ProductSubtype(
            product_type_id=subtype.product_type_id,
            name=subtype.name,
            description=subtype.description
        )
        db.add(db_subtype)
        db.commit()
        db.refresh(db_subtype)
        return db_subtype
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create product subtype: {str(e)}"
        )


@router.get("/subtypes/type/{product_type_id}", response_model=List[schemas.ProductSubtypeResponse])
def get_product_subtypes_by_type(product_type_id: UUID, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all product subtypes for a product type"""
    return db.query(ProductSubtype).filter(ProductSubtype.product_type_id == product_type_id).offset(skip).limit(limit).all()


@router.get("/subtypes/{product_subtype_id}", response_model=schemas.ProductSubtypeResponse)
def get_product_subtype(product_subtype_id: UUID, db: Session = Depends(get_db)):
    """Get a product subtype by ID"""
    subtype = db.query(ProductSubtype).filter(ProductSubtype.product_subtype_id == product_subtype_id).first()
    if not subtype:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product subtype not found"
        )
    return subtype

