from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app import schemas
from app.models import RecipeLine, Product, Part

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.post("/product/{product_id}", response_model=schemas.RecipeLineResponse, status_code=status.HTTP_201_CREATED)
def create_recipe_line(product_id: UUID, recipe_line: schemas.RecipeLineBase, db: Session = Depends(get_db)):
    """Add a recipe line to a product"""
    # Verify product exists
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Verify part exists and belongs to same org
    part = db.query(Part).filter(Part.part_id == recipe_line.part_id).first()
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Part not found"
        )
    
    if part.org_id != product.org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Part and product must belong to the same organization"
        )
    
    # Check if recipe line already exists
    existing = db.query(RecipeLine).filter(
        RecipeLine.product_id == product_id,
        RecipeLine.part_id == recipe_line.part_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recipe line already exists for this product and part"
        )
    
    try:
        db_recipe_line = RecipeLine(
            product_id=product_id,
            part_id=recipe_line.part_id,
            quantity=recipe_line.quantity
        )
        db.add(db_recipe_line)
        db.commit()
        db.refresh(db_recipe_line)
        return db_recipe_line
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create recipe line: {str(e)}"
        )


@router.get("/product/{product_id}", response_model=List[schemas.RecipeLineResponse])
def get_recipe_lines(product_id: UUID, db: Session = Depends(get_db)):
    """Get all recipe lines for a product"""
    # Verify product exists
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return db.query(RecipeLine).filter(RecipeLine.product_id == product_id).all()


@router.patch("/product/{product_id}/part/{part_id}", response_model=schemas.RecipeLineResponse)
def update_recipe_line_partial(
    product_id: UUID,
    part_id: UUID,
    recipe_line_update: schemas.RecipeLineUpdate,
    db: Session = Depends(get_db)
):
    """Partially update a recipe line (PATCH)"""
    db_recipe_line = db.query(RecipeLine).filter(
        RecipeLine.product_id == product_id,
        RecipeLine.part_id == part_id
    ).first()
    
    if not db_recipe_line:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe line not found"
        )
    
    try:
        update_data = recipe_line_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(db_recipe_line, key, value)
        
        db.commit()
        db.refresh(db_recipe_line)
        return db_recipe_line
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update recipe line: {str(e)}"
        )


@router.put("/product/{product_id}/part/{part_id}", response_model=schemas.RecipeLineResponse)
def update_recipe_line(
    product_id: UUID,
    part_id: UUID,
    recipe_line: schemas.RecipeLineBase,
    db: Session = Depends(get_db)
):
    """Update a recipe line"""
    db_recipe_line = db.query(RecipeLine).filter(
        RecipeLine.product_id == product_id,
        RecipeLine.part_id == part_id
    ).first()
    
    if not db_recipe_line:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe line not found"
        )
    
    # If part_id is being changed, verify new part exists and belongs to same org
    if recipe_line.part_id != part_id:
        product = db.query(Product).filter(Product.product_id == product_id).first()
        new_part = db.query(Part).filter(Part.part_id == recipe_line.part_id).first()
        
        if not new_part:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Part not found"
            )
        
        if new_part.org_id != product.org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Part and product must belong to the same organization"
            )
        
        # Check if recipe line with new part_id already exists
        existing = db.query(RecipeLine).filter(
            RecipeLine.product_id == product_id,
            RecipeLine.part_id == recipe_line.part_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recipe line already exists for this product and part"
            )
    
    try:
        db_recipe_line.part_id = recipe_line.part_id
        db_recipe_line.quantity = recipe_line.quantity
        db.commit()
        db.refresh(db_recipe_line)
        return db_recipe_line
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update recipe line: {str(e)}"
        )


@router.delete("/product/{product_id}/part/{part_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe_line(product_id: UUID, part_id: UUID, db: Session = Depends(get_db)):
    """Delete a recipe line"""
    db_recipe_line = db.query(RecipeLine).filter(
        RecipeLine.product_id == product_id,
        RecipeLine.part_id == part_id
    ).first()
    
    if not db_recipe_line:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe line not found"
        )
    
    try:
        db.delete(db_recipe_line)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete recipe line: {str(e)}"
        )


@router.post("/product/{product_id}/bulk", response_model=List[schemas.RecipeLineResponse], status_code=status.HTTP_201_CREATED)
def create_recipe_lines_bulk(product_id: UUID, recipe_lines: List[schemas.RecipeLineBase], db: Session = Depends(get_db)):
    """Add multiple recipe lines to a product at once"""
    # Verify product exists
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    created_lines = []
    
    try:
        for recipe_line in recipe_lines:
            # Verify part exists and belongs to same org
            part = db.query(Part).filter(Part.part_id == recipe_line.part_id).first()
            if not part:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Part {recipe_line.part_id} not found"
                )
            
            if part.org_id != product.org_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Part {recipe_line.part_id} does not belong to the same organization as product"
                )
            
            # Check if recipe line already exists
            existing = db.query(RecipeLine).filter(
                RecipeLine.product_id == product_id,
                RecipeLine.part_id == recipe_line.part_id
            ).first()
            
            if existing:
                # Update existing instead of creating new
                existing.quantity = recipe_line.quantity
                created_lines.append(existing)
            else:
                db_recipe_line = RecipeLine(
                    product_id=product_id,
                    part_id=recipe_line.part_id,
                    quantity=recipe_line.quantity
                )
                db.add(db_recipe_line)
                created_lines.append(db_recipe_line)
        
        db.commit()
        for line in created_lines:
            db.refresh(line)
        return created_lines
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create recipe lines: {str(e)}"
        )

