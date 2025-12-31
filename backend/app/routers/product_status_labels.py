from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app import schemas
from app.models import ProductStatusLabel, Product

router = APIRouter(prefix="/product-status-labels", tags=["product-status-labels"])


@router.post("/", response_model=schemas.ProductStatusLabelResponse, status_code=status.HTTP_201_CREATED)
def create_product_status_label(label: schemas.ProductStatusLabelCreate, db: Session = Depends(get_db)):
    """Create a new product status label"""
    # Check if label already exists for this org
    existing = db.query(ProductStatusLabel).filter(
        ProductStatusLabel.org_id == label.org_id,
        ProductStatusLabel.label == label.label
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status label already exists for this organization"
        )
    
    db_label = ProductStatusLabel(org_id=label.org_id, label=label.label)
    db.add(db_label)
    db.commit()
    db.refresh(db_label)
    return db_label


@router.get("/org/{org_id}", response_model=List[schemas.ProductStatusLabelResponse])
def get_product_status_labels(org_id: UUID, db: Session = Depends(get_db)):
    """Get all product status labels for an organization"""
    return db.query(ProductStatusLabel).filter(ProductStatusLabel.org_id == org_id).order_by(ProductStatusLabel.label).all()


@router.delete("/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_status_label(label_id: UUID, db: Session = Depends(get_db)):
    """Delete a product status label and remove it from all products that have it"""
    label = db.query(ProductStatusLabel).filter(ProductStatusLabel.label_id == label_id).first()
    if not label:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Status label not found"
        )
    
    label_text = label.label
    org_id = label.org_id
    
    # Remove this label from all products in the organization that have it
    products = db.query(Product).filter(Product.org_id == org_id).all()
    for product in products:
        if product.status and label_text in product.status:
            # Remove the label from the status array
            updated_status = [s for s in product.status if s != label_text]
            product.status = updated_status
    
    # Delete the label from the database
    db.delete(label)
    db.commit()
    return None

