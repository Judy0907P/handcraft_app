from sqlalchemy import Column, String, Integer, Numeric, Boolean, Text, ForeignKey, CheckConstraint, UniqueConstraint, DateTime
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
import uuid
from app.database import Base


class User(Base):
    __tablename__ = "users"
    
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(Text, nullable=False, unique=True)
    password_hash = Column(Text, nullable=False)
    display_name = Column(Text)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    
    org_memberships = relationship("OrgMembership", back_populates="user")
    orders = relationship("Order", back_populates="user")


class Organization(Base):
    __tablename__ = "organizations"
    
    org_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    main_currency = Column(Text, nullable=False, default="USD")
    additional_currency = Column(Text, nullable=True)
    exchange_rate = Column(Numeric(10, 4), nullable=False, default=1.0)
    created_at = Column(Text, nullable=False, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("exchange_rate > 0", name="organizations_exchange_rate_check"),
    )
    
    memberships = relationship("OrgMembership", back_populates="organization", cascade="all, delete-orphan")
    parts = relationship("Part", back_populates="organization", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="organization", cascade="all, delete-orphan")
    product_transactions = relationship("ProductTransaction", back_populates="organization", cascade="all, delete-orphan")
    part_status_labels = relationship("PartStatusLabel", back_populates="organization", cascade="all, delete-orphan")
    product_status_labels = relationship("ProductStatusLabel", back_populates="organization", cascade="all, delete-orphan")
    platforms = relationship("Platform", back_populates="organization", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="organization", cascade="all, delete-orphan")


class OrgMembership(Base):
    __tablename__ = "org_memberships"
    
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.org_id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    role = Column(Text, nullable=False, default="owner")
    joined_at = Column(Text, nullable=False, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("role IN ('owner','admin','staff','viewer')", name="ck_org_memberships_role"),
    )
    
    organization = relationship("Organization", back_populates="memberships")
    user = relationship("User", back_populates="org_memberships")


class PartType(Base):
    __tablename__ = "part_types"
    
    type_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False)
    type_name = Column(Text, nullable=False)
    created_at = Column(Text, nullable=False, server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint("org_id", "type_name", name="uq_part_types_org_type_name"),
    )
    
    subtypes = relationship("PartSubtype", back_populates="part_type", cascade="all, delete-orphan")


class PartSubtype(Base):
    __tablename__ = "part_subtypes"
    
    subtype_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type_id = Column(UUID(as_uuid=True), ForeignKey("part_types.type_id", ondelete="CASCADE"), nullable=False)
    subtype_name = Column(Text, nullable=False)
    created_at = Column(Text, nullable=False, server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint("type_id", "subtype_name", name="uq_part_subtypes_type_subtype_name"),
    )
    
    part_type = relationship("PartType", back_populates="subtypes")
    parts = relationship("Part", back_populates="subtype")


class Part(Base):
    __tablename__ = "parts"
    
    part_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    unit_cost = Column(Numeric(10, 2), nullable=False)
    unit = Column(Text)
    subtype_id = Column(UUID(as_uuid=True), ForeignKey("part_subtypes.subtype_id", ondelete="SET NULL"))
    specs = Column(Text)
    color = Column(Text)
    alert_stock = Column(Integer, nullable=False, default=0)
    image_url = Column(Text)
    status = Column(ARRAY(Text), nullable=False, default=[])
    notes = Column(Text)
    created_at = Column(Text, nullable=False, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("stock >= 0", name="parts_stock_check"),
        CheckConstraint("unit_cost >= 0", name="parts_unit_cost_check"),
        CheckConstraint("alert_stock >= 0", name="parts_alert_stock_check"),
        UniqueConstraint("org_id", "name", name="uq_parts_org_name"),
    )
    
    organization = relationship("Organization", back_populates="parts")
    subtype = relationship("PartSubtype", back_populates="parts")
    recipe_lines = relationship("RecipeLine", back_populates="part")
    part_transactions = relationship("PartTransaction", back_populates="part")


class PartStatusLabel(Base):
    __tablename__ = "part_status_labels"
    
    label_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False)
    label = Column(Text, nullable=False)
    created_at = Column(Text, nullable=False, server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint("org_id", "label", name="uq_part_status_labels_org_label"),
    )
    
    organization = relationship("Organization", back_populates="part_status_labels")


class ProductStatusLabel(Base):
    __tablename__ = "product_status_labels"
    
    label_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False)
    label = Column(Text, nullable=False)
    created_at = Column(Text, nullable=False, server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint("org_id", "label", name="uq_product_status_labels_org_label"),
    )
    
    organization = relationship("Organization", back_populates="product_status_labels")


class ProductType(Base):
    __tablename__ = "product_types"
    
    product_type_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    description = Column(Text)
    created_at = Column(Text, nullable=False, server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint("org_id", "name", name="uq_product_types_org_name"),
    )
    
    subtypes = relationship("ProductSubtype", back_populates="product_type", cascade="all, delete-orphan")


class ProductSubtype(Base):
    __tablename__ = "product_subtypes"
    
    product_subtype_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_type_id = Column(UUID(as_uuid=True), ForeignKey("product_types.product_type_id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    description = Column(Text)
    created_at = Column(Text, nullable=False, server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint("product_type_id", "name", name="uq_product_subtypes_type_name"),
    )
    
    product_type = relationship("ProductType", back_populates="subtypes")
    products = relationship("Product", back_populates="subtype")


class Product(Base):
    __tablename__ = "products"
    
    product_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    primary_color = Column(Text, nullable=False)
    secondary_color = Column(Text, nullable=False)
    product_subtype_id = Column(UUID(as_uuid=True), ForeignKey("product_subtypes.product_subtype_id", ondelete="SET NULL"))
    status = Column(ARRAY(Text), nullable=False, default=[])
    is_self_made = Column(Boolean, nullable=False)
    difficulty = Column(Text, nullable=False, default="NA")
    quantity = Column(Integer, nullable=False, default=0)
    alert_quantity = Column(Integer, nullable=False, default=0)
    total_cost = Column(Numeric(10, 2))
    image_url = Column(Text)
    notes = Column(Text)
    created_at = Column(Text, nullable=False, server_default=func.now())
    updated_at = Column(Text, nullable=False, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint("difficulty IN ('easy', 'medium', 'difficult', 'NA')", name="products_difficulty_check"),
        CheckConstraint("quantity >= 0", name="products_quantity_check"),
        CheckConstraint("alert_quantity >= 0", name="products_alert_quantity_check"),
        UniqueConstraint("org_id", "name", name="uq_products_org_name"),
    )
    
    organization = relationship("Organization", back_populates="products")
    subtype = relationship("ProductSubtype", back_populates="products")
    recipe_lines = relationship("RecipeLine", back_populates="product", cascade="all, delete-orphan")
    product_transactions = relationship("ProductTransaction", back_populates="product")
    order_lines = relationship("OrderLine", back_populates="product")


class RecipeLine(Base):
    __tablename__ = "recipe_lines"
    
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.product_id", ondelete="CASCADE"), primary_key=True)
    part_id = Column(UUID(as_uuid=True), ForeignKey("parts.part_id", ondelete="RESTRICT"), primary_key=True)
    quantity = Column(Numeric(12, 4), nullable=False)
    created_at = Column(Text, nullable=False, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("quantity > 0", name="recipe_lines_quantity_check"),
    )
    
    product = relationship("Product", back_populates="recipe_lines")
    part = relationship("Part", back_populates="recipe_lines")


class ProductTransaction(Base):
    __tablename__ = "product_transactions"
    
    txn_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False)
    txn_type = Column(Text, nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.product_id", ondelete="SET NULL"))
    qty = Column(Integer, nullable=False)
    unit_price_for_sale = Column(Numeric(10, 2), nullable=False)
    unit_cost_at_sale = Column(Numeric(10, 2), nullable=False)
    notes = Column(Text)
    created_at = Column(Text, nullable=False, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("txn_type IN ('build_product', 'loss', 'sale')", name="product_transactions_txn_type_check"),
        CheckConstraint("qty > 0", name="product_transactions_qty_check"),
        CheckConstraint("unit_price_for_sale >= 0", name="product_transactions_unit_price_check"),
        CheckConstraint("unit_cost_at_sale >= 0", name="product_transactions_unit_cost_at_sale_check"),
    )
    
    organization = relationship("Organization", back_populates="product_transactions")
    product = relationship("Product", back_populates="product_transactions")
    part_transactions = relationship("PartTransaction", back_populates="product_transaction", cascade="all, delete-orphan")


class PartTransaction(Base):
    __tablename__ = "part_transactions"
    
    txn_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    part_id = Column(UUID(as_uuid=True), ForeignKey("parts.part_id", ondelete="RESTRICT"), nullable=False)
    txn_type = Column(Text, nullable=False)
    qty = Column(Integer, nullable=False)
    unit_price_for_purchase = Column(Numeric(10, 2), nullable=False)
    product_txn_id = Column(UUID(as_uuid=True), ForeignKey("product_transactions.txn_id", ondelete="CASCADE"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(Text, nullable=False, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("txn_type IN ('build_product', 'loss', 'purchase')", name="part_transactions_txn_type_check"),
        CheckConstraint("unit_price_for_purchase >= 0", name="part_transactions_unit_price_check"),
    )
    
    part = relationship("Part", back_populates="part_transactions")
    product_transaction = relationship("ProductTransaction", back_populates="part_transactions")


class Platform(Base):
    __tablename__ = "platforms"
    
    platform_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    channel = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("channel IN ('online', 'offline')", name="platforms_channel_check"),
        UniqueConstraint("org_id", "name", name="uq_platforms_org_name"),
    )
    
    organization = relationship("Organization", back_populates="platforms")
    orders = relationship("Order", back_populates="platform")


class Order(Base):
    __tablename__ = "orders"
    
    order_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=False)
    channel = Column(Text, nullable=True)
    platform_id = Column(UUID(as_uuid=True), ForeignKey("platforms.platform_id", ondelete="SET NULL"), nullable=True)
    status = Column(Text, nullable=False, default="created")
    total_price = Column(Numeric(10, 2), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint("channel IN ('online', 'offline') OR channel IS NULL", name="orders_channel_check"),
        CheckConstraint("status IN ('created', 'completed', 'shipped', 'closed', 'canceled')", name="orders_status_check"),
        CheckConstraint("total_price >= 0", name="orders_total_price_check"),
    )
    
    organization = relationship("Organization", back_populates="orders")
    user = relationship("User", back_populates="orders")
    platform = relationship("Platform", back_populates="orders")
    order_lines = relationship("OrderLine", back_populates="order", cascade="all, delete-orphan")


class OrderLine(Base):
    __tablename__ = "order_lines"
    
    order_line_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.product_id", ondelete="RESTRICT"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Numeric(10, 2), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("quantity > 0", name="order_lines_quantity_check"),
        CheckConstraint("unit_cost >= 0", name="order_lines_unit_cost_check"),
        CheckConstraint("unit_price >= 0", name="order_lines_unit_price_check"),
        CheckConstraint("subtotal >= 0", name="order_lines_subtotal_check"),
    )
    
    order = relationship("Order", back_populates="order_lines")
    product = relationship("Product", back_populates="order_lines")


