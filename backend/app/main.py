from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import parts, products, production, sales, analytics, organizations, part_types, product_types, recipes

app = FastAPI(
    title="Handcraft Management API",
    description="API for managing handcraft inventory, production, and sales",
    version="1.0.0"
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(organizations.router)
app.include_router(part_types.router)
app.include_router(product_types.router)
app.include_router(parts.router)
app.include_router(products.router)
app.include_router(recipes.router)
app.include_router(production.router)
app.include_router(sales.router)
app.include_router(analytics.router)


@app.get("/")
def root():
    return {
        "message": "Handcraft Management API",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}

