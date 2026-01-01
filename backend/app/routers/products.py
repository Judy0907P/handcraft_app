from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app import schemas, services
from app.storage import storage_service

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
    """Get a product by ID with recipe lines"""
    from sqlalchemy.orm import joinedload
    from app.models import Product
    # Eager load recipe_lines
    product = db.query(Product).options(joinedload(Product.recipe_lines)).filter(
        Product.product_id == product_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return product


@router.get("/org/{org_id}", response_model=List[schemas.ProductResponse])
def get_products_by_org(
    org_id: UUID,
    product_subtype_id: Optional[UUID] = Query(None, description="Filter by product subtype ID"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all products for an organization, optionally filtered by subtype"""
    from sqlalchemy.orm import joinedload
    from app.models import Product
    
    query = db.query(Product).options(joinedload(Product.recipe_lines)).filter(
        Product.org_id == org_id
    )
    
    if product_subtype_id is not None:
        query = query.filter(Product.product_subtype_id == product_subtype_id)
    
    return query.offset(skip).limit(limit).all()


@router.get("/subtype/{product_subtype_id}", response_model=List[schemas.ProductResponse])
def get_products_by_subtype(
    product_subtype_id: UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all products for a specific product subtype"""
    from sqlalchemy.orm import joinedload
    from app.models import Product
    
    query = db.query(Product).options(joinedload(Product.recipe_lines)).filter(
        Product.product_subtype_id == product_subtype_id
    )
    
    return query.offset(skip).limit(limit).all()


@router.patch("/{product_id}", response_model=schemas.ProductResponse)
def update_product(product_id: UUID, product_update: schemas.ProductUpdate, db: Session = Depends(get_db)):
    """Update a product and optionally update recipe lines"""
    from sqlalchemy.orm import joinedload
    from app.models import Product, RecipeLine, Part
    
    product = db.query(Product).options(joinedload(Product.recipe_lines)).filter(
        Product.product_id == product_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    update_data = product_update.model_dump(exclude_unset=True)
    recipe_lines = update_data.pop('recipe_lines', None)
    
    # Update product fields
    for key, value in update_data.items():
        if value is not None:
            setattr(product, key, value)
    
    # Handle recipe lines update if provided
    if recipe_lines is not None:
        # Delete existing recipe lines
        db.query(RecipeLine).filter(RecipeLine.product_id == product_id).delete()
        
        # Create new recipe lines
        for recipe_line in recipe_lines:
            # Verify part exists and belongs to same org
            part = db.query(Part).filter(Part.part_id == recipe_line['part_id']).first()
            if not part:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Part {recipe_line['part_id']} not found"
                )
            if part.org_id != product.org_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Part {recipe_line['part_id']} does not belong to the same organization"
                )
            
            db_recipe_line = RecipeLine(
                product_id=product_id,
                part_id=recipe_line['part_id'],
                quantity=recipe_line['quantity']
            )
            db.add(db_recipe_line)
    
    db.commit()
    db.refresh(product)
    return product


@router.post("/{product_id}/inventory", response_model=schemas.ProductInventoryAdjustmentResponse)
def adjust_product_inventory(
    product_id: UUID,
    adjustment: schemas.ProductInventoryAdjustmentRequest,
    db: Session = Depends(get_db)
):
    """Adjust product inventory (adjustment or purchase). 
    - purchase: qty must be positive (adds inventory)
    - adjustment: qty can be positive or negative (user's choice)
    For building products, use /production/build instead."""
    if adjustment.product_id != product_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product ID in URL must match product_id in request body"
        )
    
    try:
        result = services.adjust_product_inventory(
            db,
            product_id=product_id,
            txn_type=adjustment.txn_type,
            qty=adjustment.qty,
            notes=adjustment.notes
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to adjust inventory: {str(e)}"
        )


@router.post("/{product_id}/image", response_model=schemas.ProductResponse)
def upload_product_image(
    product_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload an image for a product"""
    # Validate file type
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Get the product
    from app.models import Product
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Delete old image if exists
    if product.image_url:
        storage_service.delete_product_image(product.image_url)
    
    # Save new image
    try:
        image_url = storage_service.save_product_image(file, str(product_id))
        
        # Update product with new image URL
        product.image_url = image_url
        db.commit()
        db.refresh(product)
        
        return product
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}"
        )


@router.delete("/{product_id}/image", response_model=schemas.ProductResponse)
def delete_product_image(product_id: UUID, db: Session = Depends(get_db)):
    """Delete the image for a product"""
    from app.models import Product
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if product.image_url:
        storage_service.delete_product_image(product.image_url)
        product.image_url = None
        db.commit()
        db.refresh(product)
    
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: UUID, db: Session = Depends(get_db)):
    """Delete a product (cascades to recipe lines)"""
    from app.models import Product
    
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Delete associated image if exists
    if product.image_url:
        storage_service.delete_product_image(product.image_url)
    
    try:
        db.delete(product)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete product: {str(e)}"
        )

