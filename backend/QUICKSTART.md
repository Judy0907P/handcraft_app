# Quick Start Guide

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

Create a `.env` file:

```bash
echo "DATABASE_URL=postgresql://localhost/handcraft_db" > .env
```

## Step 3: Start the Server

```bash
uvicorn app.main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

## Step 4: Test the API

### Option A: Use the Test Script

In a new terminal:
```bash
cd backend
python test_api.py
```

### Option B: Use Swagger UI

Open your browser and go to:
http://localhost:8000/docs

Click "Try it out" on any endpoint to test it.

### Option C: Use curl

```bash
# Health check
curl http://localhost:8000/health

# Get parts
curl http://localhost:8000/parts/org/22222222-2222-2222-2222-222222222222

# Build a product
curl -X POST http://localhost:8000/production/build \
  -H "Content-Type: application/json" \
  -d '{"product_id": "11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "build_qty": "5"}'

# Sell a product
curl -X POST "http://localhost:8000/sales/?org_id=22222222-2222-2222-2222-222222222222" \
  -H "Content-Type: application/json" \
  -d '{"product_id": "11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "quantity": 2, "unit_price": "18.00"}'
```

## Common Issues

### Database Connection Error
- Make sure PostgreSQL is running
- Verify `DATABASE_URL` in `.env` is correct
- Ensure the database `handcraft_db` exists and has all schema files loaded

### Import Errors
- Make sure you're in the `backend/` directory
- Activate your virtual environment
- Run `pip install -r requirements.txt` again

### Port Already in Use
- Change the port: `uvicorn app.main:app --reload --port 8001`
- Or kill the process using port 8000

