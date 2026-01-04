# CraftFlow

![CraftFlow Logo](https://github.com/Judy0907P/craftflow/blob/main/frontend/public/craftflow_wide.png)

A comprehensive inventory management system for handcraft businesses. This application helps you manage parts inventory, product inventory, recipes (BOM), production, sales, and orders with full cost tracking and profit analytics.

## Features

### Core Functionality

- **User Authentication**: Secure JWT-based authentication with user registration and login
- **Organization Management**: Create and manage multiple stores/organizations
- **Parts Inventory**: 
  - Manage parts with types and subtypes
  - Track stock levels, unit costs, and units of measurement
  - Image upload support
  - Status labels for parts
- **Products Inventory**:
  - Manage products with types and subtypes
  - Track quantities, costs, colors, difficulty levels
  - Image upload support
  - Status labels for products
- **Recipes (BOM)**: 
  - Define bill of materials for products
  - Link parts to products with quantities
  - Automatic cost calculation based on recipe
- **Production**: 
  - Build products from parts using recipes
  - Automatically deducts parts inventory
  - Updates product inventory
- **Sales**: 
  - Record individual sales transactions
  - Track selling prices and profits
- **Orders**: 
  - Full order management system with cart functionality
  - Order status workflow: created → completed → shipped → closed
  - Support for returns and cancellations
  - Channel tracking (online/offline)
  - Platform management (e.g., Etsy, Amazon, craft fairs)
  - Tracking number support
- **Analytics**: 
  - Profit summaries by product
  - Revenue tracking
  - Cost analysis

## Tech Stack

### Backend
- **Python 3.11+** (3.12 recommended, 3.13 supported)
- **FastAPI** - Modern, fast web framework
- **SQLAlchemy** - ORM for database operations
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Pydantic** - Data validation

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tooling
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Axios** - API client
- **Lucide React** - Icons

### Database
- **PostgreSQL** - Primary database
- Schema-first approach with SQL migration files

## Project Structure

```
handcraft_app/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── main.py      # FastAPI application
│   │   ├── models.py    # SQLAlchemy models
│   │   ├── schemas.py   # Pydantic schemas
│   │   ├── services.py  # Business logic
│   │   └── routers/     # API route handlers
│   ├── requirements.txt
│   ├── README.md
│   └── QUICKSTART.md
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── contexts/    # React contexts
│   │   ├── pages/       # Page components
│   │   ├── services/    # API service layer
│   │   └── types/       # TypeScript types
│   ├── package.json
│   └── README.md
├── db/                  # Database schema and seeds
│   ├── schema/          # SQL schema files
│   └── seeds/           # Seed data
└── README.md            # This file
```

## Quick Start

### Prerequisites

- Python 3.11 or 3.12 (3.13 supported but may have compatibility issues)
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Set up database connection:
   Create a `.env` file in the `backend/` directory:
   ```bash
   DATABASE_URL=postgresql://username:password@localhost/craftflow_db
   ```

5. Set up the database schema:
   See the `db/schema/` directory for SQL schema files. Run them in order.
   
   For quick setup, you can use the refresh script:
   ```bash
   ./scripts/refresh_db.sh
   ```
   **⚠️ Warning**: This will drop and recreate the database, deleting all existing data.
   
   See `scripts/README.md` for more information about database management scripts.

6. Start the server:
   ```bash
   uvicorn app.main:app --reload
   ```

The API will be available at:
- API: http://localhost:8000
- Interactive Docs (Swagger): http://localhost:8000/docs
- Alternative Docs (ReDoc): http://localhost:8000/redoc

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file (optional):
   ```env
   VITE_API_URL=http://localhost:8000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:3000` (or the port Vite assigns).

## Documentation

- **Local Development Guide**: See `LOCAL_DEVELOPMENT.md` (start here for local testing)
- **Backend Quick Start**: See `backend/QUICKSTART.md`
- **Backend API Reference**: See `backend/README.md` and `backend/API_ENDPOINTS.md`
- **Deployment Guide**: See `DEPLOYMENT.md` (for production deployment with Docker)
- **Recipe Management**: See `backend/RECIPE_MANAGEMENT.md`
- **Installation Troubleshooting**: See `backend/INSTALL_TROUBLESHOOTING.md`
- **Frontend Guide**: See `frontend/README.md`

## Development Status

### ✅ Completed Features

- User authentication and authorization
- Organization management
- Parts and products inventory management
- Recipe (BOM) management
- Production workflow
- Sales recording
- Order management with full workflow
- Platform and channel tracking
- Image uploads
- Analytics and profit tracking
- Status labels for parts and products

### 🚧 Future Enhancements

- Mobile app (React Native / Expo)
- Barcode scanning
- Advanced reporting and analytics
- Multi-currency support
- Email notifications
- Cloud deployment guides

## License

This project is for personal/business use.
