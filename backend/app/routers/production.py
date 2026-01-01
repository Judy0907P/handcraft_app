from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from decimal import Decimal
from app.database import get_db
from app import schemas, services

router = APIRouter(prefix="/production", tags=["production"])


@router.post("/build", response_model=schemas.BuildProductResponse)
def build_product(request: schemas.BuildProductRequest, db: Session = Depends(get_db)):
    """Build a product (production)"""
    try:
        result = services.build_product(db, request.product_id, request.build_qty)
        return result
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        elif "insufficient" in error_msg.lower() or "insufficient parts inventory" in error_msg.lower():
            # Parse the build quantity from the error message
            build_qty = str(request.build_qty)
            # Get product name for better error message
            from app.models import Product
            product = db.query(Product).filter(Product.product_id == request.product_id).first()
            product_name = product.name if product else "the product"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot build {build_qty} unit(s) of {product_name}: Insufficient parts. The recipe requires more parts than currently available in stock. Please check your parts inventory and add more parts before building."
            )
        elif "no recipe found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot build product: No recipe found. Please add parts to the recipe first."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to build product: {error_msg}"
            )

