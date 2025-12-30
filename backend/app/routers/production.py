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
                detail=f"Failed to build product: {error_msg}"
            )

