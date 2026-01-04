"""
Image storage service that supports both local filesystem and MinIO/S3-compatible storage.
Uses environment variables for configuration.
"""
import os
from pathlib import Path
from fastapi import UploadFile
import shutil
import boto3
from botocore.exceptions import ClientError
from typing import Optional


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
        elif self.storage_type == "minio" or self.storage_type == "s3":
            # MinIO/S3 configuration
            self.s3_endpoint = os.getenv("S3_ENDPOINT", "http://minio:9000")
            self.s3_access_key = os.getenv("S3_ACCESS_KEY", "minioadmin")
            self.s3_secret_key = os.getenv("S3_SECRET_KEY", "minioadmin")
            self.s3_bucket = os.getenv("S3_BUCKET", "craftflow-uploads")
            self.s3_region = os.getenv("S3_REGION", "us-east-1")
            self.s3_use_ssl = os.getenv("S3_USE_SSL", "false").lower() == "true"
            
            # Initialize S3 client
            self.s3_client = boto3.client(
                's3',
                endpoint_url=self.s3_endpoint,
                aws_access_key_id=self.s3_access_key,
                aws_secret_access_key=self.s3_secret_key,
                region_name=self.s3_region,
                use_ssl=self.s3_use_ssl,
                verify=False  # For MinIO self-signed certs
            )
            
            # Ensure bucket exists
            self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Ensure the S3 bucket exists, create it if it doesn't."""
        try:
            self.s3_client.head_bucket(Bucket=self.s3_bucket)
        except ClientError:
            # Bucket doesn't exist, create it
            try:
                self.s3_client.create_bucket(Bucket=self.s3_bucket)
            except ClientError as e:
                print(f"Warning: Could not create bucket {self.s3_bucket}: {e}")
    
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
        elif self.storage_type in ["minio", "s3"]:
            return self._save_s3(file, part_id, "parts")
        else:
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
        elif self.storage_type in ["minio", "s3"]:
            return self._delete_s3(image_url, "parts")
        else:
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
        elif self.storage_type in ["minio", "s3"]:
            return self._save_s3(file, product_id, "products")
        else:
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
        elif self.storage_type in ["minio", "s3"]:
            return self._delete_s3(image_url, "products")
        else:
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
    
    def _save_s3(self, file: UploadFile, item_id: str, folder: str) -> str:
        """Save file to S3/MinIO storage."""
        # Generate unique filename: item_id + extension
        file_ext = Path(file.filename).suffix if file.filename else ".jpg"
        # Ensure extension is valid
        if not file_ext or file_ext not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
            file_ext = ".jpg"
        
        filename = f"{item_id}{file_ext}"
        s3_key = f"{folder}/{filename}"
        
        # Read file content
        file_content = file.file.read()
        
        # Upload to S3
        self.s3_client.put_object(
            Bucket=self.s3_bucket,
            Key=s3_key,
            Body=file_content,
            ContentType=file.content_type or "image/jpeg"
        )
        
        # Return URL path (will be served via proxy or direct S3 URL)
        return f"/uploads/{folder}/{filename}"
    
    def _delete_s3(self, image_url: str, folder: str) -> bool:
        """Delete file from S3/MinIO storage."""
        try:
            # Extract filename from URL
            if image_url.startswith(f"/uploads/{folder}/"):
                filename = image_url.split("/")[-1]
                s3_key = f"{folder}/{filename}"
                
                # Delete from S3
                self.s3_client.delete_object(
                    Bucket=self.s3_bucket,
                    Key=s3_key
                )
                return True
            return False
        except Exception as e:
            print(f"Error deleting from S3: {e}")
            return False


# Global storage service instance
storage_service = StorageService()

