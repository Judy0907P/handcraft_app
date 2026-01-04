from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app import schemas, services
from app.models import Order

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/", response_model=schemas.OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    """Create a new order"""
    try:
        result = services.create_order(db, order)
        # Reload with order lines
        db.refresh(result)
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
                detail=f"Failed to create order: {error_msg}"
            )


@router.get("/org/{org_id}", response_model=List[schemas.OrderResponse])
def get_orders_by_org(org_id: UUID, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all orders for an organization"""
    orders = services.get_orders_by_org(db, org_id, skip, limit)
    return orders


@router.get("/{order_id}", response_model=schemas.OrderResponse)
def get_order(order_id: UUID, db: Session = Depends(get_db)):
    """Get an order by ID"""
    order = services.get_order(db, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    return order


@router.patch("/{order_id}/status", response_model=schemas.OrderResponse)
def update_order_status(
    order_id: UUID,
    status_update: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db)
):
    """Update order status"""
    try:
        result = services.update_order_status(db, order_id, status_update.status)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        return result
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )
        elif "cannot change" in error_msg.lower() or "can only" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update order status: {error_msg}"
            )


@router.patch("/{order_id}", response_model=schemas.OrderResponse)
def update_order(
    order_id: UUID,
    order_update: schemas.OrderUpdate,
    db: Session = Depends(get_db)
):
    """Update order fields (like notes)"""
    update_data = order_update.model_dump(exclude_unset=True)
    # Remove status from update_data if present (use status endpoint instead)
    if 'status' in update_data:
        del update_data['status']
    
    order = services.update_order(db, order_id, update_data)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    return order


@router.post("/{order_id}/return", response_model=schemas.OrderResponse)
def return_order_endpoint(order_id: UUID, db: Session = Depends(get_db)):
    """Return a shipped order - marks as canceled and appends 'returned' to notes"""
    try:
        result = services.return_order(db, order_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        return result
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )
        elif "can only" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to return order: {error_msg}"
            )

