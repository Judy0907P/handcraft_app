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
    unit_cost: Decimal = Field(ge=0)
    unit: Optional[str] = None
    subtype_id: Optional[UUID] = None
    specs: Optional[str] = None
    color: Optional[str] = None


class PartCreate(PartBase):
    org_id: UUID


class PartUpdate(BaseModel):
    name: Optional[str] = None
    stock: Optional[int] = Field(None, ge=0)
    unit_cost: Optional[Decimal] = Field(None, ge=0)
    unit: Optional[str] = None
    subtype_id: Optional[UUID] = None
    specs: Optional[str] = None
    color: Optional[str] = None


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
    unit: Optional[str] = None


class RecipeLineCreate(RecipeLineBase):
    product_id: UUID


class RecipeLineResponse(RecipeLineBase):
    product_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


class RecipeLineUpdate(BaseModel):
    quantity: Optional[Decimal] = Field(None, gt=0)
    unit: Optional[str] = None


# Product Schemas
class ProductBase(BaseModel):
    name: str
    description: str
    primary_color: str
    secondary_color: str
    product_subtype_id: Optional[UUID] = None
    is_active: bool = True
    is_self_made: bool
    difficulty: str = "NA"
    quantity: int = Field(ge=0, default=0)
    alert_quantity: int = Field(ge=0, default=0)
    base_price: Optional[Decimal] = Field(None, ge=0)
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
    is_active: Optional[bool] = None
    is_self_made: Optional[bool] = None
    difficulty: Optional[str] = None
    quantity: Optional[int] = Field(None, ge=0)
    alert_quantity: Optional[int] = Field(None, ge=0)
    base_price: Optional[Decimal] = Field(None, ge=0)
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


# Sale Schemas
class SaleCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    notes: Optional[str] = None


class SaleResponse(BaseModel):
    sale_id: UUID
    org_id: UUID
    product_id: UUID
    transaction_id: UUID
    quantity: int
    unit_price: Decimal
    total_revenue: Decimal
    sale_date: datetime
    notes: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# Profit Summary Schema
class ProductProfitSummary(BaseModel):
    product_id: UUID
    org_id: UUID
    product_name: str
    base_price: Optional[Decimal]
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


class OrganizationCreate(OrganizationBase):
    pass


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

