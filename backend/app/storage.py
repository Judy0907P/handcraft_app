"""
Image storage service that supports both local filesystem and future cloud storage.
Uses environment variables for configuration.
"""
import os
from pathlib import Path
from fastapi import UploadFile
import shutil


class StorageService:
    """Storage service for handling image uploads."""
    
    def __init__(self):
        # Get storage configuration from environment variables
        # Default to local storage in 'uploads' directory
        self.storage_type = os.getenv("STORAGE_TYPE", "local")
        self.upload_dir = Path(os.getenv("UPLOAD_DIR", "uploads"))
        self.base_url = os.getenv("BASE_URL", "http://localhost:8000")
        
        # For local storage, ensure directory exists
        if self.storage_type == "local":
            self.parts_dir = self.upload_dir / "parts"
            self.products_dir = self.upload_dir / "products"
            self.parts_dir.mkdir(parents=True, exist_ok=True)
            self.products_dir.mkdir(parents=True, exist_ok=True)
    
    def save_part_image(self, file: UploadFile, part_id: str) -> str:
        """
        Save a part image and return the URL/path to access it.
        
        Args:
            file: The uploaded file
            part_id: The part ID to associate with the image
            
        Returns:
            URL or path to the saved image
        """
        if self.storage_type == "local":
            return self._save_local(file, part_id)
        else:
            # Future: Add cloud storage support (S3, etc.)
            raise NotImplementedError(f"Storage type '{self.storage_type}' not implemented")
    
    def _save_local(self, file: UploadFile, part_id: str) -> str:
        """Save file to local filesystem."""
        # Generate unique filename: part_id + extension
        file_ext = Path(file.filename).suffix if file.filename else ".jpg"
        # Ensure extension is valid
        if not file_ext or file_ext not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
            file_ext = ".jpg"
        
        filename = f"{part_id}{file_ext}"
        file_path = self.parts_dir / filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return URL path (will be served via static file endpoint)
        return f"/uploads/parts/{filename}"
    
    def delete_part_image(self, image_url: str) -> bool:
        """
        Delete a part image.
        
        Args:
            image_url: The URL/path of the image to delete
            
        Returns:
            True if deleted successfully, False otherwise
        """
        if self.storage_type == "local":
            return self._delete_local(image_url)
        else:
            # Future: Add cloud storage support
            raise NotImplementedError(f"Storage type '{self.storage_type}' not implemented")
    
    def save_product_image(self, file: UploadFile, product_id: str) -> str:
        """
        Save a product image and return the URL/path to access it.
        
        Args:
            file: The uploaded file
            product_id: The product ID to associate with the image
            
        Returns:
            URL or path to the saved image
        """
        if self.storage_type == "local":
            return self._save_local_product(file, product_id)
        else:
            # Future: Add cloud storage support (S3, etc.)
            raise NotImplementedError(f"Storage type '{self.storage_type}' not implemented")
    
    def _save_local_product(self, file: UploadFile, product_id: str) -> str:
        """Save product file to local filesystem."""
        # Generate unique filename: product_id + extension
        file_ext = Path(file.filename).suffix if file.filename else ".jpg"
        # Ensure extension is valid
        if not file_ext or file_ext not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
            file_ext = ".jpg"
        
        filename = f"{product_id}{file_ext}"
        file_path = self.products_dir / filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return URL path (will be served via static file endpoint)
        return f"/uploads/products/{filename}"
    
    def delete_product_image(self, image_url: str) -> bool:
        """
        Delete a product image.
        
        Args:
            image_url: The URL/path of the image to delete
            
        Returns:
            True if deleted successfully, False otherwise
        """
        if self.storage_type == "local":
            return self._delete_local_product(image_url)
        else:
            # Future: Add cloud storage support
            raise NotImplementedError(f"Storage type '{self.storage_type}' not implemented")
    
    def _delete_local_product(self, image_url: str) -> bool:
        """Delete product file from local filesystem."""
        try:
            # Extract filename from URL
            if image_url.startswith("/uploads/products/"):
                filename = image_url.split("/")[-1]
                file_path = self.products_dir / filename
                if file_path.exists():
                    file_path.unlink()
                    return True
            return False
        except Exception:
            return False
    
    def _delete_local(self, image_url: str) -> bool:
        """Delete file from local filesystem."""
        try:
            # Extract filename from URL
            if image_url.startswith("/uploads/parts/"):
                filename = image_url.split("/")[-1]
                file_path = self.parts_dir / filename
                if file_path.exists():
                    file_path.unlink()
                    return True
            elif image_url.startswith("/uploads/products/"):
                return self._delete_local_product(image_url)
            return False
        except Exception:
            return False


# Global storage service instance
storage_service = StorageService()

