# CraftFlow API Backend

FastAPI backend for the CraftFlow application. Provides a comprehensive REST API for managing inventory, production, sales, and orders.

## Features

### Authentication & Authorization
- JWT-based authentication
- User registration and login
- Protected routes with user context
- 30-day token expiration

### Core Modules

#### Organizations
- Create and manage multiple organizations/stores
- Organization membership management
- Multi-tenant support

#### Parts Management
- CRUD operations for parts
- Part types and subtypes categorization
- Stock tracking
- Unit cost management
- Image uploads
- Status labels

#### Products Management
- CRUD operations for products
- Product types and subtypes categorization
- Quantity tracking
- Cost calculation
- Recipe (BOM) integration
- Image uploads
- Status labels

#### Recipes (Bill of Materials)
- Create recipes linking parts to products
- Bulk recipe creation
- Recipe updates and deletions
- Automatic cost calculation

#### Production
- Build products from recipes
- Automatic inventory deduction
- Transaction logging

#### Sales
- Record individual sales
- Track selling prices
- Profit calculation

#### Orders
- Full order lifecycle management
- Cart-to-order workflow
- Status workflow: created → completed → shipped → closed
- Support for cancellations and returns
- Channel tracking (online/offline)
- Platform integration
- Tracking number support
- Notes management

#### Platforms
- Manage sales platforms (Etsy, Amazon, craft fairs, etc.)
- Channel association (online/offline)

#### Analytics
- Profit summaries by product
- Revenue tracking
- Cost analysis

## Setup

### 1. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

**Note:** If you're using Python 3.13 and encounter build errors, see `INSTALL_TROUBLESHOOTING.md`. Python 3.11 or 3.12 is recommended.

### 2. Configure Database

Create a `.env` file in the `backend/` directory:

```bash
DATABASE_URL=postgresql://username:password@localhost/craftflow_db
```

Or for local development without credentials:
```bash
DATABASE_URL=postgresql://localhost/craftflow_db
```

### 3. Set Up Database Schema

Make sure your PostgreSQL database is set up with all schema files from the `db/schema/` directory. Run them in order:
- `00_extensions.sql`
- `01_users_and_orgs.sql`
- `02_parts_inventory.sql`
- `03_products.sql`
- `04_recipes.sql`
- `05_inventory_transactions_and_build.sql`
- `06_sales_and_orders.sql`
- `07_status_labels.sql`
- `08_calculate_base_price.sql`

### 4. Start the Server

```bash
uvicorn app.main:app --reload
```

The API will be available at:
- API: http://localhost:8000
- Interactive Docs (Swagger): http://localhost:8000/docs
- Alternative Docs (ReDoc): http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get access token
- `GET /auth/me` - Get current user information

### Organizations
- `POST /organizations/` - Create a new organization
- `GET /organizations/` - Get all organizations
- `GET /organizations/{org_id}` - Get organization by ID

### Part Types & Subtypes
- `POST /part-types/` - Create a part type
- `GET /part-types/org/{org_id}` - Get part types by organization
- `GET /part-types/{type_id}` - Get part type by ID
- `POST /part-types/subtypes` - Create a part subtype
- `GET /part-types/subtypes/type/{type_id}` - Get subtypes by type

### Product Types & Subtypes
- `POST /product-types/` - Create a product type
- `GET /product-types/org/{org_id}` - Get product types by organization
- `GET /product-types/{product_type_id}` - Get product type by ID
- `POST /product-types/subtypes` - Create a product subtype
- `GET /product-types/subtypes/type/{product_type_id}` - Get subtypes by type

### Parts
- `POST /parts/` - Create a new part
- `GET /parts/{part_id}` - Get a part by ID
- `GET /parts/org/{org_id}` - Get all parts for an organization
- `PATCH /parts/{part_id}` - Update a part
- `POST /parts/{part_id}/image` - Upload part image
- `POST /parts/{part_id}/inventory` - Adjust part inventory

### Products
- `POST /products/` - Create a new product
- `GET /products/{product_id}` - Get a product by ID
- `GET /products/org/{org_id}` - Get all products for an organization
- `PATCH /products/{product_id}` - Update a product
- `POST /products/{product_id}/image` - Upload product image
- `POST /products/{product_id}/inventory` - Adjust product inventory

### Recipes
- `POST /recipes/product/{product_id}` - Add a recipe line to a product
- `GET /recipes/product/{product_id}` - Get all recipe lines for a product
- `PUT /recipes/product/{product_id}/part/{part_id}` - Update a recipe line
- `PATCH /recipes/product/{product_id}/part/{part_id}` - Partially update a recipe line
- `DELETE /recipes/product/{product_id}/part/{part_id}` - Delete a recipe line
- `POST /recipes/product/{product_id}/bulk` - Bulk create/update recipe lines

### Production
- `POST /production/build` - Build a product (production)

### Sales
- `POST /sales/?org_id={org_id}` - Record a sale
- `GET /sales/{sale_id}` - Get a sale by ID
- `GET /sales/org/{org_id}` - Get all sales for an organization
- `GET /sales/product/{product_id}` - Get all sales for a product

### Orders
- `POST /orders/` - Create a new order
- `GET /orders/{order_id}` - Get an order by ID
- `GET /orders/org/{org_id}` - Get all orders for an organization
- `PATCH /orders/{order_id}` - Update order fields
- `PATCH /orders/{order_id}/status` - Update order status
- `POST /orders/{order_id}/return` - Return a shipped order

### Platforms
- `POST /platforms/` - Create a new platform
- `GET /platforms/{platform_id}` - Get a platform by ID
- `GET /platforms/org/{org_id}` - Get all platforms for an organization
- `PATCH /platforms/{platform_id}` - Update a platform
- `DELETE /platforms/{platform_id}` - Delete a platform

### Status Labels
- `POST /part-status-labels/` - Create a part status label
- `GET /part-status-labels/org/{org_id}` - Get part status labels
- `POST /product-status-labels/` - Create a product status label
- `GET /product-status-labels/org/{org_id}` - Get product status labels

### Analytics
- `GET /analytics/profit-summary/{org_id}` - Get profit summary for all products

## Testing

### Option 1: Use the Test Script

```bash
# Make sure the server is running first
python test_api.py
```

### Option 2: Use Swagger UI

1. Start the server
2. Open http://localhost:8000/docs in your browser
3. Use the interactive API documentation to test endpoints
4. Click "Authorize" to add your JWT token for protected endpoints

### Option 3: Manual Testing with curl

#### Register a User
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "username": "testuser"
  }'
```

#### Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=password123"
```

#### Get Parts (with authentication)
```bash
curl http://localhost:8000/parts/org/{org_id} \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Build a Product
```bash
curl -X POST http://localhost:8000/production/build \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "product_id": "11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "build_qty": "5"
  }'
```

#### Create an Order
```bash
curl -X POST http://localhost:8000/orders/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "org_id": "22222222-2222-2222-2222-222222222222",
    "user_id": "33333333-3333-3333-3333-333333333333",
    "order_lines": [
      {
        "product_id": "11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "quantity": 2,
        "unit_price": "18.00"
      }
    ]
  }'
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── database.py          # Database connection and session
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── services.py          # Business logic
│   ├── storage.py           # File storage utilities
│   └── routers/             # API route handlers
│       ├── auth.py          # Authentication
│       ├── organizations.py
│       ├── part_types.py
│       ├── product_types.py
│       ├── parts.py
│       ├── products.py
│       ├── recipes.py
│       ├── production.py
│       ├── sales.py
│       ├── orders.py
│       ├── platforms.py
│       ├── analytics.py
│       ├── part_status_labels.py
│       └── product_status_labels.py
├── uploads/                 # Uploaded images
│   ├── parts/
│   └── products/
├── requirements.txt
├── test_api.py              # Test script
├── README.md                 # This file
├── QUICKSTART.md            # Quick start guide
├── API_ENDPOINTS.md         # Detailed API reference
├── RECIPE_MANAGEMENT.md     # Recipe management guide
└── INSTALL_TROUBLESHOOTING.md
```

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

To get a token:
1. Register a new user at `POST /auth/register`
2. Or login at `POST /auth/login`

Tokens expire after 30 days.

## Image Uploads

Images are stored in the `uploads/` directory and served at `/uploads/{type}/{filename}`. Supported types:
- Parts: `/uploads/parts/{filename}`
- Products: `/uploads/products/{filename}`

## Database Functions

The application uses PostgreSQL functions for complex operations:
- `build_product()` - Handles production builds with inventory deduction
- `record_sale()` - Records sales with inventory updates
- `calculate_base_price()` - Calculates product cost from recipe

## Notes

- The API uses UUIDs for all IDs
- All endpoints require proper org_id scoping for multi-tenant support
- Database functions are called via SQLAlchemy
- CORS is enabled for all origins (adjust for production)
- File uploads use multipart/form-data
- All monetary values are stored as strings to preserve precision

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (required)

## Production Considerations

- Change the JWT `SECRET_KEY` in `app/routers/auth.py`
- Configure CORS origins properly
- Use environment variables for sensitive data
- Set up proper file storage (S3, etc.) for production
- Enable HTTPS
- Set up database connection pooling
- Configure proper logging
