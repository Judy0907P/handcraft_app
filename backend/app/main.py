from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from pathlib import Path
import os
from app.routers import parts, products, production, sales, analytics, organizations, part_types, product_types, recipes, auth, part_status_labels, product_status_labels, platforms, orders
from app.storage import storage_service

app = FastAPI(
    title="CraftFlow API",
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
app.include_router(auth.router)
app.include_router(organizations.router)
app.include_router(part_types.router)
app.include_router(product_types.router)
app.include_router(parts.router)
app.include_router(products.router)
app.include_router(recipes.router)
app.include_router(production.router)
app.include_router(sales.router)
app.include_router(analytics.router)
app.include_router(part_status_labels.router)
app.include_router(product_status_labels.router)
app.include_router(platforms.router)
app.include_router(orders.router)

# Mount static files for uploaded images (local storage only)
# For MinIO/S3, we'll serve via a route handler
storage_type = os.getenv("STORAGE_TYPE", "local")
if storage_type == "local":
    uploads_dir = Path("uploads")
    if uploads_dir.exists():
        app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
elif storage_type in ["minio", "s3"]:
    # Serve images from MinIO/S3
    @app.get("/uploads/{folder}/{filename}")
    async def serve_s3_image(folder: str, filename: str):
        """Serve images from S3/MinIO storage."""
        try:
            s3_key = f"{folder}/{filename}"
            response = storage_service.s3_client.get_object(
                Bucket=storage_service.s3_bucket,
                Key=s3_key
            )
            return StreamingResponse(
                response['Body'],
                media_type=response.get('ContentType', 'image/jpeg')
            )
        except Exception as e:
            raise HTTPException(status_code=404, detail="Image not found")


@app.get("/")
def root():
    return {
        "message": "CraftFlow API",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}

