from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import datetime


# Auth Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=72, description="Password must be between 6 and 72 characters")
    username: str = Field(min_length=3, max_length=50, description="Username must be between 3 and 50 characters. Can contain letters, numbers, and underscores.")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: UUID
    email: str
    username: str


class UserResponse(BaseModel):
    user_id: UUID
    email: str
    username: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Part Schemas
class PartBase(BaseModel):
    name: str
    stock: int = Field(ge=0, default=0)
    unit_cost: Decimal = Field(ge=0, default=0)
    unit: Optional[str] = None
    subtype_id: Optional[UUID] = None
    specs: Optional[str] = None
    color: Optional[str] = None
    alert_stock: int = Field(ge=0, default=0)
    image_url: Optional[str] = None
    status: List[str] = Field(default_factory=list)
    notes: Optional[str] = None


class PartCreate(PartBase):
    org_id: UUID
    # stock and unit_cost are optional for new parts (default to 0)
    # Users should use inventory adjustment to add stock after creation


class PartUpdate(BaseModel):
    name: Optional[str] = None
    # stock and unit_cost are not editable directly - use inventory adjustment instead
    unit: Optional[str] = None
    subtype_id: Optional[UUID] = None
    specs: Optional[str] = None
    color: Optional[str] = None
    alert_stock: Optional[int] = Field(None, ge=0)
    image_url: Optional[str] = None
    status: Optional[List[str]] = None
    notes: Optional[str] = None


class PartResponse(PartBase):
    part_id: UUID
    org_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Recipe Schemas (defined first because ProductCreate references RecipeLineBase)
class RecipeLineBase(BaseModel):
    part_id: UUID
    quantity: Decimal = Field(gt=0)


class RecipeLineCreate(RecipeLineBase):
    product_id: UUID


class RecipeLineResponse(RecipeLineBase):
    product_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


class RecipeLineUpdate(BaseModel):
    quantity: Optional[Decimal] = Field(None, gt=0)


# Product Schemas
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    product_subtype_id: Optional[UUID] = None
    status: List[str] = Field(default_factory=list)
    is_self_made: bool
    difficulty: str = "NA"
    quantity: int = Field(ge=0, default=0)
    alert_quantity: int = Field(ge=0, default=0)
    total_cost: Optional[Decimal] = Field(None, description="Calculated automatically from recipe parts cost")
    image_url: Optional[str] = None
    notes: Optional[str] = None


class ProductCreate(ProductBase):
    org_id: UUID
    recipe_lines: Optional[List[RecipeLineBase]] = Field(None, description="Optional recipe lines to create with the product")


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    product_subtype_id: Optional[UUID] = None
    status: Optional[List[str]] = None
    is_self_made: Optional[bool] = None
    difficulty: Optional[str] = None
    quantity: Optional[int] = Field(None, ge=0)
    alert_quantity: Optional[int] = Field(None, ge=0)
    # total_cost is calculated automatically from recipe, not manually set
    image_url: Optional[str] = None
    notes: Optional[str] = None
    recipe_lines: Optional[List[RecipeLineBase]] = Field(None, description="Optional recipe lines to replace all existing recipe lines")


class ProductResponse(ProductBase):
    product_id: UUID
    org_id: UUID
    created_at: datetime
    updated_at: datetime
    recipe_lines: Optional[List[RecipeLineResponse]] = None
    
    class Config:
        from_attributes = True


# Build Product Schema
class BuildProductRequest(BaseModel):
    product_id: UUID
    build_qty: Decimal = Field(gt=0, description="Quantity to build")


class BuildProductResponse(BaseModel):
    transaction_id: UUID
    message: str
    product_id: UUID
    build_qty: Decimal
    new_product_quantity: int


class ProductInventoryAdjustmentRequest(BaseModel):
    product_id: UUID
    txn_type: str = Field(..., description="Transaction type: 'loss' (decreases inventory)")
    qty: int = Field(..., gt=0, description="Quantity to decrease (must be positive)")
    notes: Optional[str] = None


class ProductInventoryAdjustmentResponse(BaseModel):
    transaction_id: UUID
    product_id: UUID
    txn_type: str
    qty: int
    new_product_quantity: int
    message: str


class PartInventoryAdjustmentRequest(BaseModel):
    part_id: UUID
    txn_type: str = Field(..., description="Transaction type: 'purchase' (increases inventory) or 'loss' (decreases inventory)")
    qty: int = Field(..., gt=0, description="Quantity to adjust (must be positive)")
    unit_cost: Optional[Decimal] = Field(None, ge=0, description="Unit cost (required for purchase if cost_type is 'unit')")
    total_cost: Optional[Decimal] = Field(None, ge=0, description="Total cost (required for purchase if cost_type is 'total')")
    cost_type: str = Field('unit', description="Cost type: 'unit' or 'total' (only used for purchase)")
    notes: Optional[str] = None


class PartInventoryAdjustmentResponse(BaseModel):
    transaction_id: UUID
    part_id: UUID
    txn_type: str
    qty: int
    new_stock: int
    new_unit_cost: Decimal
    message: str


class PartFIFOCostResponse(BaseModel):
    part_id: UUID
    quantity: Decimal
    fifo_unit_cost: Decimal
    historical_average_cost: Decimal


# Sale Schemas (now using ProductTransaction)
class SaleCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    notes: Optional[str] = None


class SaleResponse(BaseModel):
    txn_id: UUID
    org_id: UUID
    product_id: UUID
    txn_type: str
    qty: int
    unit_price_for_sale: Decimal
    unit_cost_at_sale: Decimal
    total_revenue: Decimal  # Calculated as qty * unit_price_for_sale
    total_cost: Decimal  # Calculated as qty * unit_cost_at_sale
    profit: Decimal  # Calculated as total_revenue - total_cost
    notes: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_product_transaction(cls, txn) -> "SaleResponse":
        """Create SaleResponse from ProductTransaction"""
        from datetime import datetime
        # Handle created_at which is stored as Text in the model
        if isinstance(txn.created_at, str):
            try:
                created_at = datetime.fromisoformat(txn.created_at.replace('Z', '+00:00'))
            except:
                created_at = datetime.fromisoformat(txn.created_at)
        else:
            created_at = txn.created_at
        
        total_revenue = txn.qty * txn.unit_price_for_sale
        total_cost = txn.qty * txn.unit_cost_at_sale
        profit = total_revenue - total_cost
        
        return cls(
            txn_id=txn.txn_id,
            org_id=txn.org_id,
            product_id=txn.product_id,
            txn_type=txn.txn_type,
            qty=txn.qty,
            unit_price_for_sale=txn.unit_price_for_sale,
            unit_cost_at_sale=txn.unit_cost_at_sale,
            total_revenue=total_revenue,
            total_cost=total_cost,
            profit=profit,
            notes=txn.notes,
            created_at=created_at
        )


# Profit Summary Schema
class ProductProfitSummary(BaseModel):
    product_id: UUID
    org_id: UUID
    product_name: str
    total_cost: Optional[Decimal]
    total_revenue: Decimal
    total_sold: int
    avg_selling_price: Decimal
    cost_per_unit: Decimal
    total_cost: Decimal
    total_profit: Decimal
    
    class Config:
        from_attributes = True


# Organization Schemas
class OrganizationBase(BaseModel):
    name: str
    main_currency: str = "USD"
    additional_currency: Optional[str] = None
    exchange_rate: Decimal = Field(default=1.0, gt=0, description="Exchange rate: 1 main_currency = exchange_rate additional_currency")


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    main_currency: Optional[str] = None
    additional_currency: Optional[str] = None
    exchange_rate: Optional[Decimal] = Field(None, gt=0, description="Exchange rate: 1 main_currency = exchange_rate additional_currency")


class OrganizationResponse(OrganizationBase):
    org_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Part Type Schemas
class PartTypeBase(BaseModel):
    type_name: str


class PartTypeCreate(PartTypeBase):
    org_id: UUID


class PartTypeResponse(PartTypeBase):
    type_id: UUID
    org_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Part Subtype Schemas
class PartSubtypeBase(BaseModel):
    subtype_name: str


class PartSubtypeCreate(PartSubtypeBase):
    type_id: UUID


class PartSubtypeResponse(PartSubtypeBase):
    subtype_id: UUID
    type_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Product Type Schemas
class ProductTypeBase(BaseModel):
    name: str
    description: Optional[str] = None


class ProductTypeCreate(ProductTypeBase):
    org_id: UUID


class ProductTypeResponse(ProductTypeBase):
    product_type_id: UUID
    org_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Product Subtype Schemas
class ProductSubtypeBase(BaseModel):
    name: str
    description: Optional[str] = None


class ProductSubtypeCreate(ProductSubtypeBase):
    product_type_id: UUID


class ProductSubtypeResponse(ProductSubtypeBase):
    product_subtype_id: UUID
    product_type_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Part Status Label Schemas
class PartStatusLabelBase(BaseModel):
    label: str


class PartStatusLabelCreate(PartStatusLabelBase):
    org_id: UUID


class PartStatusLabelResponse(PartStatusLabelBase):
    label_id: UUID
    org_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Product Status Label Schemas
class ProductStatusLabelBase(BaseModel):
    label: str


class ProductStatusLabelCreate(ProductStatusLabelBase):
    org_id: UUID


class ProductStatusLabelResponse(ProductStatusLabelBase):
    label_id: UUID
    org_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Platform Schemas
class PlatformBase(BaseModel):
    name: str
    channel: str  # 'online' or 'offline'


class PlatformCreate(PlatformBase):
    org_id: UUID


class PlatformUpdate(BaseModel):
    name: Optional[str] = None
    channel: Optional[str] = None  # 'online' or 'offline'


class PlatformResponse(PlatformBase):
    platform_id: UUID
    org_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Order Line Schemas
class OrderLineBase(BaseModel):
    product_id: UUID
    quantity: int = Field(gt=0)
    unit_cost: Decimal = Field(ge=0)
    unit_price: Decimal = Field(ge=0)
    subtotal: Decimal = Field(ge=0)


class OrderLineCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(gt=0)
    unit_price: Decimal = Field(ge=0)


class OrderLineResponse(OrderLineBase):
    order_line_id: UUID
    order_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Order Schemas
class OrderBase(BaseModel):
    channel: Optional[str] = None  # 'online' or 'offline'
    platform_id: Optional[UUID] = None
    status: str = "created"  # 'created', 'completed', 'shipped', 'closed', 'canceled'
    total_price: Decimal = Field(ge=0)
    notes: Optional[str] = None


class OrderCreate(BaseModel):
    org_id: UUID
    user_id: UUID
    channel: Optional[str] = None  # 'online' or 'offline'
    platform_id: Optional[UUID] = None
    notes: Optional[str] = None
    order_lines: List[OrderLineCreate]


class OrderUpdate(BaseModel):
    status: Optional[str] = None  # 'created', 'completed', 'shipped', 'closed', 'canceled'
    notes: Optional[str] = None
    channel: Optional[str] = None  # 'online' or 'offline'
    platform_id: Optional[UUID] = None


class OrderStatusUpdate(BaseModel):
    status: str  # 'created', 'completed', 'shipped', 'closed', 'canceled'


class OrderResponse(OrderBase):
    order_id: UUID
    org_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    order_lines: Optional[List[OrderLineResponse]] = None
    
    class Config:
        from_attributes = True

