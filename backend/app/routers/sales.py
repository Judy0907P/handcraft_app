from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app import schemas, services
from app.models import Sale

router = APIRouter(prefix="/sales", tags=["sales"])


@router.post("/", response_model=schemas.SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(sale: schemas.SaleCreate, org_id: UUID, db: Session = Depends(get_db)):
    """Record a sale"""
    try:
        # Get product to verify org_id
        product = services.get_product(db, sale.product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        if product.org_id != org_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Product does not belong to this organization"
            )
        
        result = services.record_sale(db, sale, org_id)
        return result
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )
        elif "insufficient" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to record sale: {error_msg}"
            )


@router.get("/{sale_id}", response_model=schemas.SaleResponse)
def get_sale(sale_id: UUID, db: Session = Depends(get_db)):
    """Get a sale by ID"""
    sale = db.query(Sale).filter(Sale.sale_id == sale_id).first()
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found"
        )
    return sale


@router.get("/org/{org_id}", response_model=List[schemas.SaleResponse])
def get_sales_by_org(org_id: UUID, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all sales for an organization"""
    return db.query(Sale).filter(Sale.org_id == org_id).offset(skip).limit(limit).all()


@router.get("/product/{product_id}", response_model=List[schemas.SaleResponse])
def get_sales_by_product(product_id: UUID, db: Session = Depends(get_db)):
    """Get all sales for a product"""
    return db.query(Sale).filter(Sale.product_id == product_id).all()

