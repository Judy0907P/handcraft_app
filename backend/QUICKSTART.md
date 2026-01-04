# Quick Start Guide

Get the CraftFlow API up and running in minutes.

## Prerequisites

- Python 3.11 or 3.12 (3.13 supported but see troubleshooting guide)
- PostgreSQL database installed and running
- pip (Python package manager)

## Step 1: Install Dependencies

**Important:** If you're using Python 3.13 and encounter build errors, see `INSTALL_TROUBLESHOOTING.md` for solutions. Python 3.11 or 3.12 is recommended.

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Upgrade pip first (recommended)
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

## Step 2: Set Up Database Connection

Create a `.env` file in the `backend/` directory:

```bash
echo "DATABASE_URL=postgresql://localhost/handcraft_db" > .env
```

Or with credentials:
```bash
echo "DATABASE_URL=postgresql://username:password@localhost/handcraft_db" > .env
```

## Step 3: Set Up Database Schema

Make sure PostgreSQL is running and create the database:

```bash
createdb handcraft_db
```

Then run the schema files in order from the `db/schema/` directory:
1. `00_extensions.sql`
2. `01_users_and_orgs.sql`
3. `02_parts_inventory.sql`
4. `03_products.sql`
5. `04_recipes.sql`
6. `05_inventory_transactions_and_build.sql`
7. `06_sales_and_orders.sql`
8. `07_status_labels.sql`
9. `08_calculate_base_price.sql`

You can run them all at once:
```bash
psql handcraft_db < db/schema/00_extensions.sql
psql handcraft_db < db/schema/01_users_and_orgs.sql
# ... and so on
```

Or use the refresh script if available:
```bash
./refresh_db.sh
```

## Step 4: Start the Server

```bash
uvicorn app.main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

## Step 5: Test the API

### Option A: Use the Test Script

In a new terminal (keep the server running):
```bash
cd backend
python test_api.py
```

### Option B: Use Swagger UI

Open your browser and go to:
**http://localhost:8000/docs**

Click "Try it out" on any endpoint to test it. For protected endpoints:
1. First register/login to get a token
2. Click the "Authorize" button at the top
3. Enter: `Bearer YOUR_TOKEN_HERE`

### Option C: Use curl

#### Health Check
```bash
curl http://localhost:8000/health
```

#### Register a User
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "username": "testuser"
  }'
```

Save the `access_token` from the response.

#### Create an Organization
```bash
curl -X POST http://localhost:8000/organizations/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "My Handcraft Store"
  }'
```

Save the `org_id` from the response.

#### Get Parts
```bash
curl http://localhost:8000/parts/org/YOUR_ORG_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Build a Product
```bash
curl -X POST http://localhost:8000/production/build \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "product_id": "YOUR_PRODUCT_ID",
    "build_qty": "5"
  }'
```

#### Create an Order
```bash
curl -X POST http://localhost:8000/orders/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "org_id": "YOUR_ORG_ID",
    "user_id": "YOUR_USER_ID",
    "order_lines": [
      {
        "product_id": "YOUR_PRODUCT_ID",
        "quantity": 2,
        "unit_price": "18.00"
      }
    ]
  }'
```

## Common Issues

### Database Connection Error
- Make sure PostgreSQL is running: `pg_isready` or `psql -l`
- Verify `DATABASE_URL` in `.env` is correct
- Ensure the database `handcraft_db` exists: `createdb handcraft_db`
- Check that all schema files have been loaded

### Import Errors
- Make sure you're in the `backend/` directory
- Activate your virtual environment: `source venv/bin/activate`
- Run `pip install -r requirements.txt` again
- Check Python version: `python --version` (should be 3.11+)

### Port Already in Use
- Change the port: `uvicorn app.main:app --reload --port 8001`
- Or kill the process using port 8000:
  ```bash
  # Find the process
  lsof -i :8000
  # Kill it
  kill -9 <PID>
  ```

### Authentication Errors
- Make sure you're including the token in the Authorization header
- Format: `Authorization: Bearer YOUR_TOKEN`
- Tokens expire after 30 days - login again to get a new token
- Check that the user exists and credentials are correct

### Module Not Found Errors
- Ensure virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`
- Check that you're running commands from the `backend/` directory

## Next Steps

- Read the full [README.md](README.md) for detailed API documentation
- Check [API_ENDPOINTS.md](API_ENDPOINTS.md) for all available endpoints
- See [RECIPE_MANAGEMENT.md](RECIPE_MANAGEMENT.md) for recipe management guide
- Explore the Swagger UI at http://localhost:8000/docs

## Development Tips

- The `--reload` flag enables auto-reload on code changes
- Check logs in the terminal for debugging
- Use Swagger UI for interactive testing
- Database changes require schema updates - see `db/schema/` directory
