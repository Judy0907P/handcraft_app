# Handcraft Management API Backend

FastAPI backend for the Handcraft Management application.

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Or using a virtual environment (recommended):

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Database

Create a `.env` file in the `backend/` directory:

```bash
DATABASE_URL=postgresql://localhost/handcraft_db
```

Or with credentials:
```bash
DATABASE_URL=postgresql://username:password@localhost/handcraft_db
```

### 3. Run Database Migrations

Make sure your database is set up with all schema files. See the main `db/` directory for setup instructions.

### 4. Start the Server

```bash
uvicorn app.main:app --reload
```

The API will be available at:
- API: http://localhost:8000
- Interactive Docs (Swagger): http://localhost:8000/docs
- Alternative Docs (ReDoc): http://localhost:8000/redoc

## Testing

### Option 1: Use the Test Script

```bash
# Make sure the server is running first
python test_api.py
```

### Option 2: Manual Testing with curl

#### Health Check
```bash
curl http://localhost:8000/health
```

#### Get Parts
```bash
curl http://localhost:8000/parts/org/22222222-2222-2222-2222-222222222222
```

#### Create a Part
```bash
curl -X POST http://localhost:8000/parts/ \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "22222222-2222-2222-2222-222222222222",
    "name": "Silver Clasp",
    "stock": 20,
    "unit_cost": "1.50",
    "unit": "piece"
  }'
```

#### Build a Product
```bash
curl -X POST http://localhost:8000/production/build \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "build_qty": "5"
  }'
```

#### Sell a Product
```bash
curl -X POST "http://localhost:8000/sales/?org_id=22222222-2222-2222-2222-222222222222" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "quantity": 2,
    "unit_price": "18.00",
    "notes": "Sold at craft fair"
  }'
```

#### Get Profit Summary
```bash
curl http://localhost:8000/analytics/profit-summary/22222222-2222-2222-2222-222222222222
```

### Option 3: Use Swagger UI

1. Start the server
2. Open http://localhost:8000/docs in your browser
3. Use the interactive API documentation to test endpoints

## API Endpoints

### Parts
- `POST /parts/` - Create a new part
- `GET /parts/{part_id}` - Get a part by ID
- `GET /parts/org/{org_id}` - Get all parts for an organization
- `PATCH /parts/{part_id}` - Update a part

### Products
- `POST /products/` - Create a new product
- `GET /products/{product_id}` - Get a product by ID
- `GET /products/org/{org_id}` - Get all products for an organization
- `PATCH /products/{product_id}` - Update a product

### Production
- `POST /production/build` - Build a product (production)

### Sales
- `POST /sales/?org_id={org_id}` - Record a sale
- `GET /sales/{sale_id}` - Get a sale by ID
- `GET /sales/org/{org_id}` - Get all sales for an organization
- `GET /sales/product/{product_id}` - Get all sales for a product

### Analytics
- `GET /analytics/profit-summary/{org_id}` - Get profit summary for all products

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
│   └── routers/             # API route handlers
│       ├── parts.py
│       ├── products.py
│       ├── production.py
│       ├── sales.py
│       └── analytics.py
├── requirements.txt
├── test_api.py              # Test script
└── README.md
```

## Notes

- The API uses UUIDs for all IDs
- All endpoints require proper org_id scoping
- Database functions (`build_product`, `record_sale`) are called via SQLAlchemy
- CORS is enabled for all origins (adjust for production)

