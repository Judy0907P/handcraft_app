# Local Development Guide

This guide will help you run CraftFlow locally without Docker for development and testing.

## Prerequisites

Before starting, make sure you have:

- **Python 3.11 or 3.12** (3.13 supported but may have issues)
- **Node.js 18+** and npm
- **PostgreSQL** installed and running
- **Git** (optional, for cloning the repo)

## Quick Start

### 1. Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download and install from [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)

### 2. Set Up Backend

#### 2.1 Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

#### 2.2 Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### 2.3 Configure Database

Create a `.env` file in the `backend/` directory:

```bash
cd backend
cat > .env << EOF
DATABASE_URL=postgresql://localhost/craftflow_db
JWT_SECRET_KEY=your-secret-key-change-in-production
STORAGE_TYPE=local
BASE_URL=http://localhost:8000
EOF
```

Or with PostgreSQL credentials:
```bash
DATABASE_URL=postgresql://username:password@localhost/craftflow_db
```

**Note**: If your PostgreSQL requires authentication, replace `localhost` with your credentials.

#### 2.4 Set Up Database Schema

Create the database:
```bash
createdb craftflow_db
```

**Option A: Use the refresh script (recommended for quick setup)**
```bash
# From project root
./scripts/refresh_db.sh
```

**⚠️ Warning**: This will drop and recreate the database, deleting all existing data!

**Option B: Run schema files manually**
```bash
# From project root
psql craftflow_db < db/schema/00_extensions.sql
psql craftflow_db < db/schema/01_users_and_orgs.sql
psql craftflow_db < db/schema/02_parts_inventory.sql
psql craftflow_db < db/schema/03_products.sql
psql craftflow_db < db/schema/04_recipes.sql
psql craftflow_db < db/schema/05_inventory_transactions_and_build.sql
psql craftflow_db < db/schema/06_sales_and_orders.sql
psql craftflow_db < db/schema/07_status_labels.sql
psql craftflow_db < db/schema/08_calculate_base_price.sql
```

#### 2.5 Start Backend Server

```bash
cd backend
source venv/bin/activate  # Make sure venv is activated
uvicorn app.main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive Docs (Swagger)**: http://localhost:8000/docs
- **Alternative Docs (ReDoc)**: http://localhost:8000/redoc

**Keep this terminal open!** The server will auto-reload when you make code changes.

### 3. Set Up Frontend

#### 3.1 Install Dependencies

Open a **new terminal** window:

```bash
cd frontend
npm install
```

#### 3.2 Configure API URL (Optional)

Create a `.env` file in the `frontend/` directory:

```bash
cd frontend
cat > .env << EOF
VITE_API_URL=http://localhost:8000
EOF
```

**Note**: This is optional. The frontend defaults to `http://localhost:8000` if not specified.

#### 3.3 Start Frontend Development Server

```bash
cd frontend
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

The frontend will be available at **http://localhost:3000**

**Keep this terminal open too!** The frontend will auto-reload on code changes.

## Testing the Application

### 1. Access the Application

Open your browser and go to: **http://localhost:3000**

### 2. Create Your First Account

1. Click "Register" or go to the registration page
2. Fill in:
   - Email: `test@example.com`
   - Password: `password123` (minimum 6 characters)
   - Username: `testuser` (minimum 3 characters)
3. Click "Register"

You should be automatically logged in and redirected to organization selection.

### 3. Create an Organization

1. On the organization selection page, click "Create New Organization"
2. Enter a name: `My Test Store`
3. Click "Create"
4. You'll be redirected to the home page

### 4. Test Basic Features

- **Parts**: Create parts, add images, manage inventory
- **Products**: Create products, add recipes (BOM), manage inventory
- **Cart**: Add products to cart and create orders
- **Orders**: View and manage orders
- **Sales**: Record sales transactions

## Development Workflow

### Running Both Services

You'll need **two terminal windows**:

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Making Changes

- **Backend**: Save your Python files, and uvicorn will auto-reload
- **Frontend**: Save your TypeScript/React files, and Vite will hot-reload

### Testing API Directly

Visit **http://localhost:8000/docs** for interactive API documentation (Swagger UI).

You can:
- Test all endpoints directly
- See request/response schemas
- Authenticate with tokens
- Try out different API calls

## Common Issues and Solutions

### Backend Issues

#### "Module not found" errors
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

#### Database connection errors
- Check PostgreSQL is running: `pg_isready` or `psql -l`
- Verify `DATABASE_URL` in `backend/.env`
- Ensure database exists: `createdb craftflow_db`
- Check PostgreSQL is accessible: `psql -d craftflow_db`

#### Port 8000 already in use
```bash
# Option 1: Use a different port
uvicorn app.main:app --reload --port 8001

# Option 2: Find and kill the process
lsof -i :8000  # Find PID
kill -9 <PID>  # Kill process
```

#### Import errors
- Make sure you're in the `backend/` directory
- Activate virtual environment: `source venv/bin/activate`
- Check Python version: `python --version` (should be 3.11+)

### Frontend Issues

#### "Cannot connect to API" errors
- Verify backend is running on http://localhost:8000
- Check `VITE_API_URL` in `frontend/.env`
- Check browser console for CORS errors
- Try accessing http://localhost:8000/health directly

#### Build/compilation errors
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### Port 3000 already in use
Vite will automatically try the next available port (3001, 3002, etc.).
Check the terminal output for the actual port.

#### TypeScript errors
- Check `frontend/tsconfig.json` is correct
- Clear Vite cache: `rm -rf node_modules/.vite`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Database Issues

#### Schema errors
```bash
# Refresh the database (⚠️ deletes all data!)
./scripts/refresh_db.sh
```

#### Permission denied errors
```bash
# Create database with your user
createdb -U your_username craftflow_db

# Or use postgres superuser
sudo -u postgres createdb craftflow_db
```

## Useful Commands

### Backend

```bash
# Activate virtual environment
source venv/bin/activate  # backend/venv/bin/activate

# Run server
uvicorn app.main:app --reload

# Run server on different port
uvicorn app.main:app --reload --port 8001

# Run with more verbose logging
uvicorn app.main:app --reload --log-level debug

# Test API with script
python test_api.py
```

### Frontend

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Database

```bash
# Connect to database
psql craftflow_db

# List all tables
psql craftflow_db -c "\dt"

# Refresh database (⚠️ deletes all data!)
./scripts/refresh_db.sh

# Backup database
pg_dump craftflow_db > backup.sql

# Restore database
psql craftflow_db < backup.sql
```

## File Structure

```
craftflow/
├── backend/
│   ├── app/              # Application code
│   ├── venv/             # Python virtual environment (gitignored)
│   ├── .env              # Environment variables (gitignored)
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── src/              # Source code
│   ├── node_modules/     # Node dependencies (gitignored)
│   ├── .env              # Environment variables (gitignored)
│   └── package.json      # Node dependencies
├── db/
│   ├── schema/           # Database schema files
│   └── seeds/            # Seed data (optional)
└── scripts/              # Utility scripts
    └── refresh_db.sh     # Database refresh script
```

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://localhost/craftflow_db
JWT_SECRET_KEY=your-secret-key-change-in-production
STORAGE_TYPE=local
BASE_URL=http://localhost:8000
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8000
```

## Next Steps

- Read the [Backend Quick Start Guide](backend/QUICKSTART.md) for detailed API usage
- Check [Backend README](backend/README.md) for API documentation
- See [Frontend README](frontend/README.md) for frontend features
- Explore the [API Documentation](http://localhost:8000/docs) in Swagger UI

## Tips for Development

1. **Use Swagger UI**: Test API endpoints directly at http://localhost:8000/docs
2. **Check Browser Console**: Frontend errors appear in the browser console (F12)
3. **Check Terminal Logs**: Backend errors appear in the terminal running uvicorn
4. **Hot Reload**: Both frontend and backend support auto-reload on file changes
5. **Database Refresh**: Use `./scripts/refresh_db.sh` to quickly reset your database during development

## Need Help?

- Check [Backend Troubleshooting](backend/QUICKSTART.md#common-issues)
- Check [Frontend Troubleshooting](frontend/README.md#troubleshooting)
- Review error messages in terminal and browser console
- Verify all prerequisites are installed and running

