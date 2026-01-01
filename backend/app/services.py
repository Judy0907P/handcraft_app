from sqlalchemy.orm import Session
from sqlalchemy import text, bindparam, String, Integer
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, NUMERIC
from uuid import UUID
from decimal import Decimal
from typing import Optional
from app.models import Part, Product, InventoryTransaction, Sale, RecipeLine
from app.schemas import PartCreate, ProductCreate, SaleCreate, BuildProductRequest


def create_part(db: Session, part: PartCreate) -> Part:
    """Create a new part"""
    db_part = Part(
        org_id=part.org_id,
        name=part.name,
        stock=part.stock,
        unit_cost=part.unit_cost,
        unit=part.unit,
        subtype_id=part.subtype_id,
        specs=part.specs,
        color=part.color,
        alert_stock=part.alert_stock,
        image_url=part.image_url,
        status=part.status,
        notes=part.notes
    )
    db.add(db_part)
    db.commit()
    db.refresh(db_part)
    return db_part


def get_part(db: Session, part_id: UUID) -> Part:
    """Get a part by ID"""
    return db.query(Part).filter(Part.part_id == part_id).first()


def get_parts_by_org(db: Session, org_id: UUID, skip: int = 0, limit: int = 100):
    """Get all parts for an organization"""
    return db.query(Part).filter(Part.org_id == org_id).offset(skip).limit(limit).all()


def update_part(db: Session, part_id: UUID, part_update: dict) -> Part:
    """Update a part"""
    db_part = db.query(Part).filter(Part.part_id == part_id).first()
    if not db_part:
        return None
    
    for key, value in part_update.items():
        if value is not None:
            setattr(db_part, key, value)
    
    db.commit()
    db.refresh(db_part)
    return db_part


def create_product(db: Session, product: ProductCreate) -> Product:
    """Create a new product with optional recipe lines"""
    db_product = Product(
        org_id=product.org_id,
        name=product.name,
        description=product.description,
        primary_color=product.primary_color,
        secondary_color=product.secondary_color,
        product_subtype_id=product.product_subtype_id,
        status=product.status,
        is_self_made=product.is_self_made,
        difficulty=product.difficulty,
        quantity=product.quantity,
        alert_quantity=product.alert_quantity,
        base_price=product.base_price,
        image_url=product.image_url,
        notes=product.notes
    )
    db.add(db_product)
    db.flush()  # Flush to get product_id
    
    # Create recipe lines if provided
    if product.recipe_lines:
        for recipe_line in product.recipe_lines:
            # Verify part exists and belongs to same org
            part = db.query(Part).filter(Part.part_id == recipe_line.part_id).first()
            if not part:
                raise ValueError(f"Part {recipe_line.part_id} not found")
            if part.org_id != product.org_id:
                raise ValueError(f"Part {recipe_line.part_id} does not belong to the same organization")
            
            db_recipe_line = RecipeLine(
                product_id=db_product.product_id,
                part_id=recipe_line.part_id,
                quantity=recipe_line.quantity
            )
            db.add(db_recipe_line)
    
    db.commit()
    db.refresh(db_product)
    return db_product


def get_product(db: Session, product_id: UUID) -> Product:
    """Get a product by ID"""
    return db.query(Product).filter(Product.product_id == product_id).first()


def get_products_by_org(db: Session, org_id: UUID, skip: int = 0, limit: int = 100):
    """Get all products for an organization"""
    return db.query(Product).filter(Product.org_id == org_id).offset(skip).limit(limit).all()


def build_product(db: Session, product_id: UUID, build_qty: Decimal) -> dict:
    """Build a product using the database function"""
    # Use bindparam with explicit types to ensure proper PostgreSQL type casting
    result = db.execute(
        text("SELECT build_product(:product_id, :build_qty)").bindparams(
            bindparam("product_id", type_=PG_UUID),
            bindparam("build_qty", type_=NUMERIC)
        ),
        {"product_id": str(product_id), "build_qty": str(build_qty)}
    )
    transaction_id = result.scalar()
    db.commit()
    
    # Get updated product quantity
    product = db.query(Product).filter(Product.product_id == product_id).first()
    
    return {
        "transaction_id": transaction_id,
        "message": f"Successfully built {build_qty} units",
        "product_id": product_id,
        "build_qty": build_qty,
        "new_product_quantity": product.quantity if product else 0
    }


def record_sale(db: Session, sale: SaleCreate, org_id: UUID) -> dict:
    """Record a sale using the database function"""
    # Use bindparam with explicit types to ensure proper PostgreSQL type casting
    result = db.execute(
        text("SELECT record_sale(:product_id, :quantity, :unit_price, :notes)").bindparams(
            bindparam("product_id", type_=PG_UUID),
            bindparam("quantity", type_=Integer),
            bindparam("unit_price", type_=NUMERIC),
            bindparam("notes", type_=String)
        ),
        {
            "product_id": str(sale.product_id),
            "quantity": sale.quantity,
            "unit_price": str(sale.unit_price),  # Convert to string for NUMERIC type
            "notes": sale.notes
        }
    )
    sale_id = result.scalar()
    db.commit()
    
    # Get the created sale record
    db_sale = db.query(Sale).filter(Sale.sale_id == sale_id).first()
    
    return db_sale


def get_profit_summary(db: Session, org_id: UUID):
    """Get profit summary for all products in an organization"""
    result = db.execute(
        text("SELECT * FROM product_profit_summary WHERE org_id = :org_id"),
        {"org_id": str(org_id)}
    )
    return result.fetchall()


def adjust_product_inventory(db: Session, product_id: UUID, txn_type: str, qty: Decimal, notes: Optional[str] = None) -> dict:
    """
    Adjust product inventory for non-build transactions (adjustment, purchase).
    For build_product, use build_product() function instead.
    
    Transaction type rules:
    - purchase: qty must be positive (adds to inventory)
    - adjustment: qty can be positive or negative (user's choice)
    
    This function:
    1. Validates the product exists
    2. Creates an inventory transaction record
    3. Updates product quantity
    4. Does NOT modify parts inventory (unlike build_product)
    """
    from app.models import Product, InventoryTransaction
    
    # Validate transaction type
    valid_types = ['adjustment', 'purchase']
    if txn_type not in valid_types:
        raise ValueError(f"Invalid txn_type. Must be one of: {', '.join(valid_types)}")
    
    # Validate quantity based on transaction type
    from decimal import Decimal as Dec
    qty_decimal = Dec(str(qty))
    
    if qty_decimal == 0:
        raise ValueError("Quantity cannot be zero")
    
    # Validate sign based on transaction type
    if txn_type == 'purchase' and qty_decimal <= 0:
        raise ValueError("Purchase quantity must be greater than 0 (positive)")
    # adjustment can be positive or negative, no validation needed
    
    # Get product
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise ValueError(f"Product {product_id} not found")
    
    # Calculate new quantity (ensure non-negative)
    # qty_decimal can be negative for sale/adjustment, positive for purchase/adjustment
    qty_int = int(qty_decimal)  # Convert to int for quantity field
    new_quantity = product.quantity + qty_int  # Addition handles both positive and negative
    
    if new_quantity < 0:
        raise ValueError(f"Insufficient inventory. Current: {product.quantity}, Change: {qty_int}")
    
    # Create inventory transaction
    # Store the actual qty value (can be negative for sale, positive for others)
    transaction = InventoryTransaction(
        org_id=product.org_id,
        txn_type=txn_type,
        product_id=product_id,
        qty=qty_decimal,  # Store actual value (can be negative for sale)
        notes=notes
    )
    db.add(transaction)
    db.flush()  # Get transaction ID
    
    # Update product quantity
    product.quantity = new_quantity
    # updated_at is handled by database default/trigger, but we can set it explicitly if needed
    
    db.commit()
    db.refresh(transaction)
    db.refresh(product)
    
    return {
        "transaction_id": transaction.txn_id,
        "product_id": product_id,
        "txn_type": txn_type,
        "qty": qty,
        "new_product_quantity": product.quantity,
        "message": f"Successfully {txn_type}: {qty} units. New quantity: {product.quantity}"
    }

